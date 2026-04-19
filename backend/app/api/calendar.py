from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from icalendar import Calendar
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import CalendarFeed, User
from app.services.calendar_sync import fetch_ics, sync_feed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class FeedIn(BaseModel):
    url: str
    employer_label: str = Field(..., min_length=1, max_length=120)


class FeedPatchIn(BaseModel):
    employer_label: str = Field(..., min_length=1, max_length=120)


class FeedOut(BaseModel):
    id: UUID
    ics_url_masked: str
    employer_label: str
    last_synced_at: str | None = None
    created_at: str


def _mask(url: str) -> str:
    if len(url) < 16:
        return "…" + url[-6:]
    return url[:24] + "…" + url[-6:]


def _feed_out(feed: CalendarFeed) -> FeedOut:
    return FeedOut(
        id=feed.id,
        ics_url_masked=_mask(feed.ics_url),
        employer_label=feed.employer_label,
        last_synced_at=feed.last_synced_at.isoformat()
        if feed.last_synced_at
        else None,
        created_at=feed.created_at.isoformat(),
    )


def _validate_url(url: str) -> str:
    url = url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    if not (
        url.startswith("http://")
        or url.startswith("https://")
        or url.startswith("webcal://")
    ):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http(s):// or webcal://",
        )
    return url


@router.get("/feeds", response_model=list[FeedOut])
async def list_feeds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FeedOut]:
    q = await db.execute(
        select(CalendarFeed)
        .where(CalendarFeed.user_id == user.id)
        .order_by(CalendarFeed.created_at.asc())
    )
    return [_feed_out(f) for f in q.scalars().all()]


@router.post("/feeds")
async def create_feed(
    payload: FeedIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    url = _validate_url(payload.url)
    label = payload.employer_label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Employer name required")

    try:
        body = await fetch_ics(url)
        Calendar.from_ical(body)
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("ICS validation failed: %s", exc)
        raise HTTPException(
            status_code=400, detail=f"Feed unreachable or invalid: {exc}"
        )

    feed = CalendarFeed(user_id=user.id, ics_url=url, employer_label=label)
    db.add(feed)
    user.calendar_sync_enabled = True
    await db.commit()
    await db.refresh(feed)

    try:
        scanned, inserted = await sync_feed(db, feed)
    except Exception as exc:
        logger.exception("Initial ICS sync failed")
        return {
            "saved": True,
            "feed": _feed_out(feed).model_dump(mode="json"),
            "sync_error": str(exc),
        }
    return {
        "saved": True,
        "feed": _feed_out(feed).model_dump(mode="json"),
        "scanned": scanned,
        "inserted": inserted,
    }


@router.patch("/feeds/{feed_id}", response_model=FeedOut)
async def update_feed(
    feed_id: UUID,
    payload: FeedPatchIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedOut:
    feed = await db.get(CalendarFeed, feed_id)
    if not feed or feed.user_id != user.id:
        raise HTTPException(status_code=404, detail="Feed not found")
    feed.employer_label = payload.employer_label.strip()
    await db.commit()
    await db.refresh(feed)
    return _feed_out(feed)


@router.post("/feeds/{feed_id}/sync")
async def sync_one(
    feed_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    feed = await db.get(CalendarFeed, feed_id)
    if not feed or feed.user_id != user.id:
        raise HTTPException(status_code=404, detail="Feed not found")
    try:
        scanned, inserted = await sync_feed(db, feed)
    except Exception as exc:
        logger.exception("Feed sync failed")
        raise HTTPException(status_code=502, detail=f"Sync failed: {exc}")
    return {"scanned": scanned, "inserted": inserted}


@router.post("/feeds/sync-all")
async def sync_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = await db.execute(
        select(CalendarFeed).where(CalendarFeed.user_id == user.id)
    )
    feeds = list(q.scalars().all())
    totals = {"scanned": 0, "inserted": 0, "feeds": 0, "errors": []}
    for feed in feeds:
        try:
            scanned, inserted = await sync_feed(db, feed)
            totals["scanned"] += scanned
            totals["inserted"] += inserted
            totals["feeds"] += 1
        except Exception as exc:
            logger.exception("Sync-all failed for feed %s", feed.id)
            totals["errors"].append({"feed_id": str(feed.id), "error": str(exc)})
    return totals


@router.delete("/feeds/{feed_id}")
async def delete_feed(
    feed_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    feed = await db.get(CalendarFeed, feed_id)
    if not feed or feed.user_id != user.id:
        raise HTTPException(status_code=404, detail="Feed not found")
    await db.delete(feed)

    remaining_q = await db.execute(
        select(CalendarFeed).where(CalendarFeed.user_id == user.id)
    )
    if remaining_q.first() is None:
        user.calendar_sync_enabled = False

    await db.commit()
    return {"status": "deleted"}
