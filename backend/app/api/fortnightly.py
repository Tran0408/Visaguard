from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import SemesterPeriod, Shift, User
from app.schemas import FortnightlySummary
from app.services.fortnightly import (
    UNLIMITED,
    get_fixed_fortnight_period,
    get_hours_in_period,
    get_limit_for_period,
    get_rolling_period,
    is_semester_for_period,
    threshold_label,
)

router = APIRouter(prefix="/api/fortnightly", tags=["fortnightly"])


@router.get("/current", response_model=FortnightlySummary)
async def current_fortnight(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FortnightlySummary:
    today = date.today()
    period_start, period_end = get_fixed_fortnight_period(today)
    rolling_start, rolling_end = get_rolling_period(today)

    earliest = min(period_start, rolling_start)
    latest = max(period_end, rolling_end)
    shifts_q = await db.execute(
        select(Shift).where(
            Shift.user_id == user.id,
            Shift.shift_date >= earliest,
            Shift.shift_date <= latest,
        )
    )
    shifts = list(shifts_q.scalars())

    periods_q = await db.execute(
        select(SemesterPeriod).where(SemesterPeriod.user_id == user.id)
    )
    periods = list(periods_q.scalars())

    hours_used = get_hours_in_period(shifts, period_start, period_end)
    rolling_hours = get_hours_in_period(shifts, rolling_start, rolling_end)
    limit = get_limit_for_period(periods, period_start)
    is_sem = is_semester_for_period(periods, period_start)
    days_remaining = max((period_end - today).days + 1, 0)

    hours_remaining = max(limit - hours_used, 0) if limit < UNLIMITED else 0.0
    percent = (hours_used / limit * 100) if limit < UNLIMITED else 0.0

    return FortnightlySummary(
        hours_used=round(hours_used, 2),
        limit=limit,
        hours_remaining=round(hours_remaining, 2),
        period_start=period_start,
        period_end=period_end,
        is_semester=is_sem,
        days_remaining=days_remaining,
        percent_used=round(percent, 1),
        threshold=threshold_label(hours_used, limit),
        rolling_hours_used=round(rolling_hours, 2),
        rolling_period_start=rolling_start,
        rolling_period_end=rolling_end,
        rolling_threshold=threshold_label(rolling_hours, limit),
    )
