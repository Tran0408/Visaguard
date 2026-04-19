from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ShiftExtraction(BaseModel):
    employer: str
    date: str
    start_time: str
    end_time: str
    hours: float
    confidence: str = "medium"


class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shift_date: date
    start_time: str
    end_time: str
    hours_worked: Decimal
    source: str
    employer_id: UUID | None = None


class ShiftCreate(BaseModel):
    employer_name: str
    shift_date: date
    start_time: str
    end_time: str


class FortnightlySummary(BaseModel):
    hours_used: float
    limit: int
    hours_remaining: float
    period_start: date
    period_end: date
    is_semester: bool
    days_remaining: int
    percent_used: float
    threshold: str = Field(description="safe|warn|danger|breach")
    rolling_hours_used: float
    rolling_period_start: date
    rolling_period_end: date
    rolling_threshold: str = Field(description="safe|warn|danger|breach")


class PostmarkAttachment(BaseModel):
    Name: str
    Content: str
    ContentType: str
    ContentLength: int | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    unique_inbox: str
    university: str | None = None
    calendar_sync_enabled: bool
    onboarded: bool


class UserSetupIn(BaseModel):
    university: str
    semester_periods: list["SemesterPeriodIn"]


class SemesterPeriodIn(BaseModel):
    start_date: date
    end_date: date
    is_semester: bool
    label: str | None = None


class SemesterPeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    start_date: date
    end_date: date
    is_semester: bool
    label: str | None = None


class EmployerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class ShiftListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shift_date: date
    start_time: str
    end_time: str
    hours_worked: Decimal
    break_minutes: int
    break_overridden: bool
    source: str
    employer_name: str | None = None


class ShiftUpdate(BaseModel):
    start_time: str | None = None
    end_time: str | None = None
    break_minutes: int | None = Field(default=None, ge=0, le=480)


class PostmarkInboundPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    From: str | None = None
    To: str | None = None
    OriginalRecipient: str | None = None
    Subject: str | None = None
    TextBody: str | None = None
    HtmlBody: str | None = None
    MessageID: str | None = None
    Attachments: list[PostmarkAttachment] = []
