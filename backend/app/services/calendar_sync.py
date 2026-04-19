from __future__ import annotations

import logging
import re
from datetime import date as date_cls, datetime, timedelta, timezone
from typing import Iterable

import httpx
from icalendar import Calendar
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import ShiftExtraction
from app.services.shifts import insert_extracted_shifts

logger = logging.getLogger(__name__)

SHIFT_KEYWORDS = re.compile(
    r"\b(shift|roster|rostered|work|humanforce|deputy|kronos|tanda)\b",
    re.IGNORECASE,
)

MAX_FEED_BYTES = 5 * 1024 * 1024


def _normalize_url(url: str) -> str:
    url = url.strip()
    if url.startswith("webcal://"):
        url = "https://" + url[len("webcal://"):]
    return url


async def fetch_ics(url: str) -> str:
    url = _normalize_url(url)
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        r = await client.get(url, headers={"User-Agent": "VisaGuard/1.0"})
        r.raise_for_status()
        if len(r.content) > MAX_FEED_BYTES:
            raise RuntimeError("ICS feed too large")
        return r.text


def _to_datetime(value) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date_cls):
        return None  # all-day event, skip
    return None


def _iter_events(cal: Calendar) -> Iterable[dict]:
    for comp in cal.walk("VEVENT"):
        summary = str(comp.get("summary") or "").strip()
        description = str(comp.get("description") or "").strip()
        location = str(comp.get("location") or "").strip()
        uid = str(comp.get("uid") or "").strip()

        dtstart = comp.get("dtstart")
        dtend = comp.get("dtend")
        if dtstart is None or dtend is None:
            continue
        start_dt = _to_datetime(dtstart.dt)
        end_dt = _to_datetime(dtend.dt)
        if start_dt is None or end_dt is None:
            continue

        status = str(comp.get("status") or "").upper()
        if status in ("CANCELLED",):
            continue

        yield {
            "uid": uid,
            "summary": summary,
            "description": description,
            "location": location,
            "start": start_dt,
            "end": end_dt,
        }


def event_to_extraction(ev: dict, require_keyword: bool) -> ShiftExtraction | None:
    haystack = f"{ev['summary']}\n{ev['description']}\n{ev['location']}"
    if require_keyword and not SHIFT_KEYWORDS.search(haystack):
        return None

    start_dt: datetime = ev["start"]
    end_dt: datetime = ev["end"]
    duration_hours = (end_dt - start_dt).total_seconds() / 3600
    if duration_hours < 0.5 or duration_hours > 14:
        return None

    # Convert to local-ish clock time using the event's tz if present, else UTC.
    start_local = start_dt.astimezone(start_dt.tzinfo or timezone.utc)
    end_local = end_dt.astimezone(start_dt.tzinfo or timezone.utc)

    employer = ev["summary"] or ev["location"] or "Calendar event"
    employer = employer.strip()[:80] or "Calendar event"

    return ShiftExtraction(
        employer=employer,
        date=start_local.date().isoformat(),
        start_time=start_local.strftime("%H:%M"),
        end_time=end_local.strftime("%H:%M"),
        hours=round(duration_hours, 2),
        confidence="high",
    )


async def sync_user_ics(
    db: AsyncSession,
    user: User,
    lookback_days: int = 30,
    lookahead_days: int = 90,
    require_keyword: bool = False,
) -> tuple[int, int]:
    """Returns (scanned_events, inserted_shifts). Raises on fetch/parse failure."""
    if not user.roster_ics_url:
        raise RuntimeError("No ICS URL configured")

    body = await fetch_ics(user.roster_ics_url)
    cal = Calendar.from_ical(body)

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=lookback_days)
    window_end = now + timedelta(days=lookahead_days)

    scanned = 0
    inserted_total = 0
    for ev in _iter_events(cal):
        scanned += 1
        if ev["start"] < window_start or ev["start"] > window_end:
            continue
        ext = event_to_extraction(ev, require_keyword=require_keyword)
        if ext is None:
            continue
        prefix = f"ics:{ev['uid']}" if ev["uid"] else "ics"
        inserted_total += await insert_extracted_shifts(
            db=db,
            user_id=user.id,
            extractions=[ext],
            source="calendar",
            external_id_prefix=prefix,
            raw_content=None,
        )

    user.calendar_last_synced_at = now.replace(tzinfo=None)
    await db.commit()
    return scanned, inserted_total
