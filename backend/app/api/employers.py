from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Employer, EmployerBreakRule, Shift, User
from app.services.shifts import recompute_shifts_for_employer

router = APIRouter(prefix="/api/employers", tags=["employers"])


class EmployerListItem(BaseModel):
    id: UUID
    name: str
    display_name: str | None = None
    resolved_name: str
    shift_count: int


class EmployerRenameIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)


class BreakRuleIn(BaseModel):
    min_shift_hours: Decimal = Field(gt=0, le=24)
    unpaid_break_minutes: int = Field(ge=0, le=480)


class BreakRuleOut(BaseModel):
    id: UUID
    min_shift_hours: Decimal
    unpaid_break_minutes: int


class BreakRulesReplaceIn(BaseModel):
    rules: list[BreakRuleIn]


class BreakRulesReplaceOut(BaseModel):
    rules: list[BreakRuleOut]
    shifts_recomputed: int


@router.get("", response_model=list[EmployerListItem])
async def list_employers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EmployerListItem]:
    q = await db.execute(
        select(Employer, func.count(Shift.id))
        .join(Shift, Shift.employer_id == Employer.id)
        .where(Employer.user_id == user.id)
        .group_by(Employer.id)
        .having(func.count(Shift.id) > 0)
        .order_by(func.count(Shift.id).desc(), Employer.name.asc())
    )
    rows = q.all()
    return [
        EmployerListItem(
            id=e.id,
            name=e.name,
            display_name=e.display_name,
            resolved_name=e.resolved_name,
            shift_count=count,
        )
        for e, count in rows
    ]


@router.patch("/{employer_id}", response_model=EmployerListItem)
async def rename_employer(
    employer_id: UUID,
    payload: EmployerRenameIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmployerListItem:
    emp = await db.get(Employer, employer_id)
    if not emp or emp.user_id != user.id:
        raise HTTPException(status_code=404, detail="Employer not found")

    new_name = (payload.display_name or "").strip()
    emp.display_name = new_name or None
    await db.commit()
    await db.refresh(emp)

    count_q = await db.execute(
        select(func.count(Shift.id)).where(Shift.employer_id == emp.id)
    )
    count = count_q.scalar_one()

    return EmployerListItem(
        id=emp.id,
        name=emp.name,
        display_name=emp.display_name,
        resolved_name=emp.resolved_name,
        shift_count=count,
    )


@router.get("/{employer_id}/break-rules", response_model=list[BreakRuleOut])
async def list_break_rules(
    employer_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BreakRuleOut]:
    emp = await db.execute(
        select(Employer)
        .where(Employer.id == employer_id)
        .options(selectinload(Employer.break_rules))
    )
    employer = emp.scalar_one_or_none()
    if not employer or employer.user_id != user.id:
        raise HTTPException(status_code=404, detail="Employer not found")
    return [
        BreakRuleOut(
            id=r.id,
            min_shift_hours=r.min_shift_hours,
            unpaid_break_minutes=r.unpaid_break_minutes,
        )
        for r in sorted(employer.break_rules, key=lambda x: x.min_shift_hours)
    ]


@router.put(
    "/{employer_id}/break-rules", response_model=BreakRulesReplaceOut
)
async def replace_break_rules(
    employer_id: UUID,
    payload: BreakRulesReplaceIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BreakRulesReplaceOut:
    emp = await db.execute(
        select(Employer)
        .where(Employer.id == employer_id)
        .options(selectinload(Employer.break_rules))
    )
    employer = emp.scalar_one_or_none()
    if not employer or employer.user_id != user.id:
        raise HTTPException(status_code=404, detail="Employer not found")

    # Drop duplicates on min_shift_hours, keep largest break at each threshold.
    dedup: dict[Decimal, int] = {}
    for r in payload.rules:
        h = Decimal(r.min_shift_hours).quantize(Decimal("0.01"))
        dedup[h] = max(dedup.get(h, 0), r.unpaid_break_minutes)

    employer.break_rules.clear()
    await db.flush()
    for min_h, mins in sorted(dedup.items()):
        employer.break_rules.append(
            EmployerBreakRule(min_shift_hours=min_h, unpaid_break_minutes=mins)
        )
    await db.flush()

    recomputed = await recompute_shifts_for_employer(db, employer.id)
    await db.commit()
    await db.refresh(employer, attribute_names=["break_rules"])

    return BreakRulesReplaceOut(
        rules=[
            BreakRuleOut(
                id=r.id,
                min_shift_hours=r.min_shift_hours,
                unpaid_break_minutes=r.unpaid_break_minutes,
            )
            for r in sorted(employer.break_rules, key=lambda x: x.min_shift_hours)
        ],
        shifts_recomputed=recomputed,
    )
