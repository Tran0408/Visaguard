from __future__ import annotations

import logging
import re
from datetime import date as date_cls, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Employer, EmployerBreakRule, Shift
from app.schemas import ShiftExtraction

logger = logging.getLogger(__name__)


_LEADING_LABEL_RE = re.compile(
    r"^(shift|roster(?:ed)?|work|schedule|duty|on[- ]?call)\b[\s:\-–—]*",
    re.IGNORECASE,
)
_TIME_RANGE_RE = re.compile(
    r"\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to|~)\s*"
    r"\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?\b",
    re.IGNORECASE,
)
_SINGLE_TIME_RE = re.compile(
    r"\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b",
    re.IGNORECASE,
)
_AMPM_ONLY_RE = re.compile(r"\b\d{1,2}\s*(?:am|pm)\b", re.IGNORECASE)
_EDGE_JUNK_RE = re.compile(r"^[\s\-–—:|·,]+|[\s\-–—:|·,]+$")


def clean_employer_name(raw: str, fallback: str = "Shift") -> str:
    """Strip shift-time noise and leading labels from an employer string.

    Examples:
        "Shift: 8:45AM - 6:15PM - Level 3 F/P" -> "Level 3 F/P"
        "Work 14:00-22:00 Warehouse" -> "Warehouse"
        "Cafe Barista 9am-5pm" -> "Cafe Barista"
    """
    if not raw:
        return fallback
    s = raw.strip()
    for _ in range(3):
        new = _LEADING_LABEL_RE.sub("", s).strip()
        if new == s:
            break
        s = new
    s = _TIME_RANGE_RE.sub(" ", s)
    s = _SINGLE_TIME_RE.sub(" ", s)
    s = _AMPM_ONLY_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    prev = None
    while s and s != prev:
        prev = s
        s = _EDGE_JUNK_RE.sub("", s).strip()
    return s[:80] if s else fallback


def gross_hours(start_time: str, end_time: str) -> Decimal:
    start = datetime.strptime(start_time, "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")
    delta = (end - start).total_seconds() / 3600
    if delta < 0:
        delta += 24
    return Decimal(str(round(delta, 2)))


def pick_break_minutes(
    gross: Decimal, rules: list[EmployerBreakRule]
) -> int:
    """Highest-threshold match wins. Returns unpaid break minutes."""
    best = 0
    for r in rules:
        if gross >= r.min_shift_hours and r.unpaid_break_minutes > best:
            best = r.unpaid_break_minutes
    return best


def apply_break_minutes(gross: Decimal, break_minutes: int) -> Decimal:
    if break_minutes <= 0:
        return gross
    net = gross - (Decimal(break_minutes) / Decimal(60))
    if net < 0:
        return Decimal("0.00")
    return Decimal(str(round(float(net), 2)))


def apply_break_rules(
    gross: Decimal, rules: list[EmployerBreakRule]
) -> Decimal:
    return apply_break_minutes(gross, pick_break_minutes(gross, rules))


def net_hours_with_rules(
    start_time: str, end_time: str, rules: list[EmployerBreakRule]
) -> Decimal:
    return apply_break_rules(gross_hours(start_time, end_time), rules)


async def recompute_shifts_for_employer(
    db: AsyncSession, employer_id: UUID
) -> int:
    """Recompute hours_worked + break for each shift. Skips manual overrides."""
    emp = await db.execute(
        select(Employer)
        .where(Employer.id == employer_id)
        .options(selectinload(Employer.break_rules))
    )
    employer = emp.scalar_one_or_none()
    if not employer:
        return 0
    rules = list(employer.break_rules)
    q = await db.execute(
        select(Shift).where(
            Shift.employer_id == employer_id, Shift.break_overridden == False  # noqa: E712
        )
    )
    shifts = q.scalars().all()
    for s in shifts:
        gross = gross_hours(s.start_time, s.end_time)
        mins = pick_break_minutes(gross, rules)
        s.break_minutes = mins
        s.hours_worked = apply_break_minutes(gross, mins)
    await db.flush()
    return len(shifts)


async def get_or_create_employer(
    db: AsyncSession, user_id: UUID, name: str
) -> Employer:
    name = name.strip()
    result = await db.execute(
        select(Employer)
        .where(Employer.user_id == user_id, Employer.name == name)
        .options(selectinload(Employer.break_rules))
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    employer = Employer(user_id=user_id, name=name, break_rules=[])
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
        gross = gross_hours(ext.start_time, ext.end_time)
        mins = pick_break_minutes(gross, list(employer.break_rules))
        hours = apply_break_minutes(gross, mins)
        db.add(
            Shift(
                user_id=user_id,
                employer_id=employer.id,
                shift_date=shift_date,
                start_time=ext.start_time,
                end_time=ext.end_time,
                hours_worked=hours,
                break_minutes=mins,
                break_overridden=False,
                source=source,
                external_id=external_id,
                raw_content=raw_content,
            )
        )
        inserted += 1
    await db.flush()
    return inserted
