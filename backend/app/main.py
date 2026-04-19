from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import calendar, fortnightly, semesters, shifts, users, webhooks
from app.config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="VisaGuard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router)
app.include_router(fortnightly.router)
app.include_router(users.router)
app.include_router(shifts.router)
app.include_router(semesters.router)
app.include_router(calendar.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
