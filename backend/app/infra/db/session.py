"""DB engine and session-factory helpers."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings


def create_db_engine(config: Settings) -> AsyncEngine:
    """Create the shared async SQLAlchemy engine.

    Args:
        config: Application settings containing database configuration.

    Returns:
        Async SQLAlchemy engine.
    """
    return create_async_engine(
        config.db.URL,
        echo=config.DEBUG,
        pool_pre_ping=True,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Create the async session factory used by units of work.

    Args:
        engine: Async SQLAlchemy engine.

    Returns:
        Async sessionmaker bound to the engine.
    """
    return async_sessionmaker(
        engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
