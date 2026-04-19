from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Shift, User
from app.schemas import ShiftCreate, ShiftListItem
from app.services.shifts import compute_hours, get_or_create_employer

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


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
        ShiftListItem(
            id=s.id,
            shift_date=s.shift_date,
            start_time=s.start_time,
            end_time=s.end_time,
            hours_worked=s.hours_worked,
            source=s.source,
            employer_name=s.employer.name if s.employer else None,
        )
        for s in shifts
    ]


@router.post("", response_model=ShiftListItem, status_code=201)
async def create_shift(
    payload: ShiftCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShiftListItem:
    employer = await get_or_create_employer(db, user.id, payload.employer_name)
    hours = compute_hours(payload.start_time, payload.end_time)
    shift = Shift(
        user_id=user.id,
        employer_id=employer.id,
        shift_date=payload.shift_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        hours_worked=hours,
        source="manual",
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftListItem(
        id=shift.id,
        shift_date=shift.shift_date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hours_worked=shift.hours_worked,
        source=shift.source,
        employer_name=employer.name,
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
