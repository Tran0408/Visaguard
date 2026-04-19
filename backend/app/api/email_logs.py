from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import EmailLog, User

router = APIRouter(prefix="/api/email-logs", tags=["email-logs"])


class EmailLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    received_at: datetime
    from_address: str | None = None
    subject: str | None = None
    status: str | None = None
    shifts_extracted: int = 0
    error_message: str | None = None


@router.get("/recent", response_model=list[EmailLogItem])
async def recent_logs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EmailLogItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    q = await db.execute(
        select(EmailLog)
        .where(EmailLog.user_id == user.id, EmailLog.received_at >= cutoff)
        .order_by(EmailLog.received_at.desc())
        .limit(20)
    )
    return list(q.scalars().all())
