from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


def _needs_ssl(url: str) -> bool:
    lowered = url.lower()
    return not any(h in lowered for h in ("@localhost", "@127.0.0.1"))


connect_args = {"ssl": True} if _needs_ssl(settings.database_url) else {}

engine = create_async_engine(
    settings.database_url, echo=False, future=True, connect_args=connect_args
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
