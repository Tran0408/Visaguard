from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import SemesterPeriod, User
from app.schemas import SemesterPeriodIn, SemesterPeriodOut

router = APIRouter(prefix="/api/semester-periods", tags=["semester-periods"])


@router.get("", response_model=list[SemesterPeriodOut])
async def list_periods(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SemesterPeriodOut]:
    q = await db.execute(
        select(SemesterPeriod)
        .where(SemesterPeriod.user_id == user.id)
        .order_by(SemesterPeriod.start_date)
    )
    return [SemesterPeriodOut.model_validate(p) for p in q.scalars()]


@router.post("", response_model=SemesterPeriodOut, status_code=201)
async def create_period(
    payload: SemesterPeriodIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SemesterPeriodOut:
    period = SemesterPeriod(
        user_id=user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_semester=payload.is_semester,
        label=payload.label,
    )
    db.add(period)
    await db.commit()
    await db.refresh(period)
    return SemesterPeriodOut.model_validate(period)


@router.put("/{period_id}", response_model=SemesterPeriodOut)
async def update_period(
    period_id: UUID,
    payload: SemesterPeriodIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SemesterPeriodOut:
    period = await db.get(SemesterPeriod, period_id)
    if not period or period.user_id != user.id:
        raise HTTPException(status_code=404, detail="Period not found")
    period.start_date = payload.start_date
    period.end_date = payload.end_date
    period.is_semester = payload.is_semester
    period.label = payload.label
    await db.commit()
    await db.refresh(period)
    return SemesterPeriodOut.model_validate(period)


@router.delete("/{period_id}", status_code=204, response_class=Response)
async def delete_period(
    period_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await db.get(SemesterPeriod, period_id)
    if not period or period.user_id != user.id:
        raise HTTPException(status_code=404, detail="Period not found")
    await db.delete(period)
    await db.commit()
    return Response(status_code=204)
