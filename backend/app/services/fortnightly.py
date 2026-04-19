from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta

from app.models import SemesterPeriod, Shift

SEMESTER_LIMIT = 48
UNLIMITED = 999

# Reference Monday for fortnight alignment (any Monday works; this one is 2024-01-01).
_FORTNIGHT_ANCHOR = date(2024, 1, 1)


def get_current_fortnight_period(anchor_date: date, today: date | None = None) -> tuple[date, date]:
    """Return (start, end) of the 14-day period containing today, anchored on anchor_date."""
    today = today or date.today()
    days_since_anchor = (today - anchor_date).days
    if days_since_anchor < 0:
        return anchor_date, anchor_date + timedelta(days=13)
    period_number = days_since_anchor // 14
    period_start = anchor_date + timedelta(days=period_number * 14)
    period_end = period_start + timedelta(days=13)
    return period_start, period_end


def get_fixed_fortnight_period(today: date | None = None) -> tuple[date, date]:
    """Return (Mon, Sun+7) of fortnight containing today, aligned to calendar weeks."""
    today = today or date.today()
    days_since_anchor = (today - _FORTNIGHT_ANCHOR).days
    period_number = days_since_anchor // 14
    period_start = _FORTNIGHT_ANCHOR + timedelta(days=period_number * 14)
    period_end = period_start + timedelta(days=13)
    return period_start, period_end


def get_rolling_period(today: date | None = None) -> tuple[date, date]:
    """Return (today-13, today) rolling 14-day window."""
    today = today or date.today()
    return today - timedelta(days=13), today


def get_hours_in_period(
    shifts: Iterable[Shift], period_start: date, period_end: date
) -> float:
    return sum(
        float(shift.hours_worked)
        for shift in shifts
        if period_start <= shift.shift_date <= period_end
    )


def get_limit_for_period(
    semester_periods: Iterable[SemesterPeriod], period_start: date
) -> int:
    for p in semester_periods:
        if p.start_date <= period_start <= p.end_date:
            return SEMESTER_LIMIT if p.is_semester else UNLIMITED
    return SEMESTER_LIMIT


def is_semester_for_period(
    semester_periods: Iterable[SemesterPeriod], period_start: date
) -> bool:
    for p in semester_periods:
        if p.start_date <= period_start <= p.end_date:
            return p.is_semester
    return True


def threshold_label(hours: float, limit: int) -> str:
    if limit >= UNLIMITED:
        return "safe"
    ratio = hours / limit if limit else 0
    if ratio >= 1.0:
        return "breach"
    if ratio >= 0.9:
        return "danger"
    if ratio >= 0.75:
        return "warn"
    return "safe"
