from __future__ import annotations

import logging
import time
from typing import Any

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User
from app.services.inbox import generate_inbox_address

logger = logging.getLogger(__name__)

_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not settings.clerk_jwks_url:
            raise RuntimeError("Clerk publishable key not configured")
        _jwk_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwk_client


def verify_clerk_token(token: str) -> dict[str, Any]:
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
            leeway=30,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.PyJWTError as exc:
        logger.warning("JWT verify failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if claims.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")
    return claims


async def _fetch_clerk_email(clerk_id: str) -> str | None:
    if not settings.clerk_secret_key:
        return None
    url = f"https://api.clerk.com/v1/users/{clerk_id}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                url, headers={"Authorization": f"Bearer {settings.clerk_secret_key}"}
            )
            if r.status_code != 200:
                return None
            data = r.json()
            addrs = data.get("email_addresses") or []
            primary_id = data.get("primary_email_address_id")
            for a in addrs:
                if a.get("id") == primary_id:
                    return a.get("email_address")
            return addrs[0].get("email_address") if addrs else None
    except Exception as exc:
        logger.warning("Clerk user fetch failed: %s", exc)
        return None


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )
    token = authorization.split(" ", 1)[1].strip()
    claims = verify_clerk_token(token)
    clerk_id = claims.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Token missing sub")

    q = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = q.scalar_one_or_none()
    if user:
        return user

    email = claims.get("email") or await _fetch_clerk_email(clerk_id) or ""
    user = User(
        clerk_id=clerk_id,
        email=email,
        unique_inbox=generate_inbox_address(),
        calendar_sync_enabled=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
