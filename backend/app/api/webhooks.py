from __future__ import annotations

import logging
from uuid import UUID

import hmac

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, get_db
from app.models import EmailLog, User
from app.schemas import PostmarkInboundPayload
from app.services.llm_parser import (
    build_email_content,
    decode_attachment,
    extract_shifts_from_content,
)
from app.services.shifts import insert_extracted_shifts

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_path_secret(secret: str) -> None:
    expected = settings.postmark_inbound_secret
    if not expected:
        return
    if not hmac.compare_digest(secret, expected):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


async def _process_email_async(
    payload: PostmarkInboundPayload,
    user_id: UUID,
    log_id: UUID,
) -> None:
    async with AsyncSessionLocal() as db:
        log = await db.get(EmailLog, log_id)
        if log is None:
            logger.error("EmailLog %s missing", log_id)
            return

        try:
            attachments: list[tuple[str, bytes, str]] = []
            for att in payload.Attachments:
                try:
                    attachments.append(
                        (att.Name, decode_attachment(att.Content), att.ContentType)
                    )
                except Exception as exc:
                    logger.warning("Attachment decode failed for %s: %s", att.Name, exc)

            content = build_email_content(payload.TextBody, payload.HtmlBody, attachments)
            if not content.strip():
                log.status = "no_shifts_found"
                await db.commit()
                return

            try:
                extractions = await extract_shifts_from_content(content)
            except Exception as exc:
                logger.exception("LLM parsing failed")
                log.status = "error"
                log.error_message = str(exc)
                await db.commit()
                return

            external_prefix = f"email:{payload.MessageID}" if payload.MessageID else None
            inserted = await insert_extracted_shifts(
                db=db,
                user_id=user_id,
                extractions=extractions,
                source="email",
                external_id_prefix=external_prefix,
                raw_content=content[:10000],
            )
            log.shifts_extracted = inserted
            log.status = "processed" if inserted else "no_shifts_found"
            await db.commit()
        except Exception as exc:
            logger.exception("Email processing failed")
            await db.rollback()
            log.status = "error"
            log.error_message = str(exc)
            await db.commit()


@router.post("/webhook/inbound-email/{secret}")
async def inbound_email(
    secret: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    _verify_path_secret(secret)

    body = await request.json()
    payload = PostmarkInboundPayload(**body)

    to_address = (payload.OriginalRecipient or payload.To or "").strip().lower()
    from_address = (payload.From or "").strip().lower()
    log = EmailLog(
        from_address=payload.From,
        subject=payload.Subject,
        to_address=to_address,
        status="received",
    )
    db.add(log)

    if not to_address and not from_address:
        log.status = "error"
        log.error_message = "Missing recipient and sender"
        await db.commit()
        return {"status": "ignored", "reason": "missing recipient"}

    user = None
    if to_address:
        user_q = await db.execute(select(User).where(User.unique_inbox == to_address))
        user = user_q.scalar_one_or_none()

    if not user and "+" in to_address:
        local = to_address.split("@", 1)[0]
        tag = local.split("+", 1)[1]
        user_q = await db.execute(
            select(User).where(User.unique_inbox.like(f"shifts-{tag}@%"))
        )
        user = user_q.scalar_one_or_none()

    if not user and from_address:
        user_q = await db.execute(
            select(User)
            .where(User.email == from_address)
            .order_by(User.created_at.desc())
        )
        user = user_q.scalars().first()

    if not user:
        log.status = "error"
        log.error_message = f"No user for inbox {to_address} / sender {from_address}"
        await db.commit()
        return {"status": "ignored", "reason": "unknown inbox"}

    log.user_id = user.id
    log.status = "queued"
    await db.commit()

    # Kick off LLM parsing + shift insert in the response background so Postmark gets fast 200.
    background_tasks.add_task(_process_email_async, payload, user.id, log.id)

    return {"status": "queued"}
