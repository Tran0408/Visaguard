from __future__ import annotations

import logging
from datetime import date as date_cls, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Employer, Shift
from app.schemas import ShiftExtraction

logger = logging.getLogger(__name__)


def compute_hours(start_time: str, end_time: str) -> Decimal:
    start = datetime.strptime(start_time, "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")
    delta = (end - start).total_seconds() / 3600
    if delta < 0:
        delta += 24
    if delta > 5:
        delta -= 0.5
    return Decimal(str(round(delta, 2)))


async def get_or_create_employer(
    db: AsyncSession, user_id: UUID, name: str
) -> Employer:
    name = name.strip()
    result = await db.execute(
        select(Employer).where(Employer.user_id == user_id, Employer.name == name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    employer = Employer(user_id=user_id, name=name)
    db.add(employer)
    await db.flush()
    return employer


async def insert_extracted_shifts(
    db: AsyncSession,
    user_id: UUID,
    extractions: list[ShiftExtraction],
    source: str,
    external_id_prefix: str | None,
    raw_content: str | None,
) -> int:
    inserted = 0
    seen_in_batch: set[tuple[str, str, str]] = set()
    for ext in extractions:
        try:
            shift_date = date_cls.fromisoformat(ext.date)
        except ValueError:
            logger.warning("Bad date in extraction: %s", ext.date)
            continue

        batch_key = (ext.date, ext.start_time, ext.end_time)
        if batch_key in seen_in_batch:
            continue
        seen_in_batch.add(batch_key)

        external_id = None
        if external_id_prefix:
            external_id = f"{external_id_prefix}:{ext.date}:{ext.start_time}:{ext.end_time}"
            dedup = await db.execute(
                select(Shift).where(
                    Shift.user_id == user_id, Shift.external_id == external_id
                )
            )
            if dedup.scalar_one_or_none():
                continue

        # Cross-source dedup: same date+start+end already logged (different email/cal)
        cross = await db.execute(
            select(Shift).where(
                Shift.user_id == user_id,
                Shift.shift_date == shift_date,
                Shift.start_time == ext.start_time,
                Shift.end_time == ext.end_time,
            )
        )
        if cross.scalar_one_or_none():
            continue

        employer = await get_or_create_employer(db, user_id, ext.employer)
        hours = Decimal(str(ext.hours)) if ext.hours else compute_hours(
            ext.start_time, ext.end_time
        )
        db.add(
            Shift(
                user_id=user_id,
                employer_id=employer.id,
                shift_date=shift_date,
                start_time=ext.start_time,
                end_time=ext.end_time,
                hours_worked=hours,
                source=source,
                external_id=external_id,
                raw_content=raw_content,
            )
        )
        inserted += 1
    await db.flush()
    return inserted
