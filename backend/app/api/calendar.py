from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from icalendar import Calendar
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.services.calendar_sync import fetch_ics, sync_user_ics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class IcsUrlIn(BaseModel):
    url: str


class CalendarStatusOut(BaseModel):
    connected: bool
    ics_url_masked: str | None = None
    last_synced_at: str | None = None


def _mask(url: str) -> str:
    if len(url) < 16:
        return "…" + url[-6:]
    return url[:24] + "…" + url[-6:]


@router.get("/status", response_model=CalendarStatusOut)
async def status_(user: User = Depends(get_current_user)) -> CalendarStatusOut:
    return CalendarStatusOut(
        connected=bool(user.roster_ics_url),
        ics_url_masked=_mask(user.roster_ics_url) if user.roster_ics_url else None,
        last_synced_at=user.calendar_last_synced_at.isoformat()
        if user.calendar_last_synced_at
        else None,
    )


@router.post("/ics")
async def save_ics(
    payload: IcsUrlIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    if not (url.startswith("http://") or url.startswith("https://") or url.startswith("webcal://")):
        raise HTTPException(status_code=400, detail="URL must start with http(s):// or webcal://")

    try:
        body = await fetch_ics(url)
        Calendar.from_ical(body)
    except Exception as exc:
        logger.info("ICS validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=f"Feed unreachable or invalid: {exc}")

    user.roster_ics_url = url
    user.calendar_sync_enabled = True
    await db.commit()

    try:
        scanned, inserted = await sync_user_ics(db, user)
    except Exception as exc:
        logger.exception("Initial ICS sync failed")
        return {"saved": True, "sync_error": str(exc)}
    return {"saved": True, "scanned": scanned, "inserted": inserted}


@router.post("/sync")
async def sync_now(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not user.roster_ics_url:
        raise HTTPException(status_code=400, detail="Calendar not connected")
    try:
        scanned, inserted = await sync_user_ics(db, user)
    except Exception as exc:
        logger.exception("Manual ICS sync failed")
        raise HTTPException(status_code=502, detail=f"Sync failed: {exc}")
    return {"scanned": scanned, "inserted": inserted}


@router.delete("/ics")
async def disconnect(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user.roster_ics_url = None
    user.calendar_sync_enabled = False
    user.calendar_last_synced_at = None
    await db.commit()
    return {"status": "disconnected"}
