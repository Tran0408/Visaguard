from __future__ import annotations

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Employer, Shift, User
from app.schemas import ShiftCreate, ShiftListItem, ShiftUpdate
from app.services.shifts import (
    apply_break_minutes,
    get_or_create_employer,
    gross_hours,
    pick_break_minutes,
)

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


def _validate_time(t: str) -> str:
    if not _TIME_RE.match(t):
        raise HTTPException(status_code=400, detail=f"Invalid time: {t}")
    hh, mm = map(int, t.split(":"))
    if hh > 23 or mm > 59:
        raise HTTPException(status_code=400, detail=f"Invalid time: {t}")
    return t


def _shift_to_item(s: Shift, employer_name: str | None) -> ShiftListItem:
    return ShiftListItem(
        id=s.id,
        shift_date=s.shift_date,
        start_time=s.start_time,
        end_time=s.end_time,
        hours_worked=s.hours_worked,
        break_minutes=s.break_minutes,
        break_overridden=s.break_overridden,
        source=s.source,
        employer_name=employer_name,
    )


@router.get("", response_model=list[ShiftListItem])
async def list_shifts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ShiftListItem]:
    q = await db.execute(
        select(Shift)
        .where(Shift.user_id == user.id)
        .options(selectinload(Shift.employer))
        .order_by(Shift.shift_date.desc(), Shift.start_time.desc())
    )
    shifts = q.scalars().all()
    return [
        _shift_to_item(s, s.employer.resolved_name if s.employer else None)
        for s in shifts
    ]


@router.post("", response_model=ShiftListItem, status_code=201)
async def create_shift(
    payload: ShiftCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShiftListItem:
    _validate_time(payload.start_time)
    _validate_time(payload.end_time)
    employer = await get_or_create_employer(db, user.id, payload.employer_name)
    gross = gross_hours(payload.start_time, payload.end_time)
    mins = pick_break_minutes(gross, list(employer.break_rules))
    hours = apply_break_minutes(gross, mins)
    shift = Shift(
        user_id=user.id,
        employer_id=employer.id,
        shift_date=payload.shift_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        hours_worked=hours,
        break_minutes=mins,
        break_overridden=False,
        source="manual",
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return _shift_to_item(shift, employer.resolved_name)


@router.patch("/{shift_id}", response_model=ShiftListItem)
async def update_shift(
    shift_id: UUID,
    payload: ShiftUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShiftListItem:
    q = await db.execute(
        select(Shift)
        .where(Shift.id == shift_id)
        .options(
            selectinload(Shift.employer).selectinload(Employer.break_rules)
        )
    )
    shift = q.scalar_one_or_none()
    if not shift or shift.user_id != user.id:
        raise HTTPException(status_code=404, detail="Shift not found")

    times_changed = False
    if payload.start_time is not None:
        shift.start_time = _validate_time(payload.start_time)
        times_changed = True
    if payload.end_time is not None:
        shift.end_time = _validate_time(payload.end_time)
        times_changed = True

    gross = gross_hours(shift.start_time, shift.end_time)
    if gross <= 0:
        raise HTTPException(status_code=400, detail="end time must be after start")

    if payload.break_minutes is not None:
        shift.break_minutes = payload.break_minutes
        shift.break_overridden = True
    elif times_changed and not shift.break_overridden:
        rules = list(shift.employer.break_rules) if shift.employer else []
        shift.break_minutes = pick_break_minutes(gross, rules)

    shift.hours_worked = apply_break_minutes(gross, shift.break_minutes)

    await db.commit()
    await db.refresh(shift)
    return _shift_to_item(
        shift, shift.employer.resolved_name if shift.employer else None
    )


@router.delete("/{shift_id}", status_code=204, response_class=Response)
async def delete_shift(
    shift_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shift = await db.get(Shift, shift_id)
    if not shift or shift.user_id != user.id:
        raise HTTPException(status_code=404, detail="Shift not found")
    await db.delete(shift)
    await db.commit()
    return Response(status_code=204)
