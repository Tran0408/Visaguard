from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import SemesterPeriod, User
from app.schemas import UserOut, UserSetupIn

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_user_out(user: User, has_periods: bool) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        unique_inbox=user.unique_inbox,
        university=user.university,
        calendar_sync_enabled=user.calendar_sync_enabled,
        onboarded=bool(user.university) and has_periods,
    )


@router.get("/me", response_model=UserOut)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    periods_q = await db.execute(
        select(SemesterPeriod).where(SemesterPeriod.user_id == user.id).limit(1)
    )
    has_periods = periods_q.scalar_one_or_none() is not None
    return _to_user_out(user, has_periods)


@router.post("/setup", response_model=UserOut)
async def complete_setup(
    payload: UserSetupIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    user.university = payload.university

    existing_q = await db.execute(
        select(SemesterPeriod).where(SemesterPeriod.user_id == user.id)
    )
    for old in existing_q.scalars():
        await db.delete(old)

    for p in payload.semester_periods:
        db.add(
            SemesterPeriod(
                user_id=user.id,
                start_date=p.start_date,
                end_date=p.end_date,
                is_semester=p.is_semester,
                label=p.label,
            )
        )

    await db.commit()
    await db.refresh(user)
    return _to_user_out(user, has_periods=bool(payload.semester_periods))
