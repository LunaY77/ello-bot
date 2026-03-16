"""Unit of Work for cross-repository writes."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.infra.db.repositories import SqlAlchemySessionRepository, SqlAlchemyUserRepository


class SqlAlchemyUnitOfWork:
    """Unit of work coordinating repositories on one SQLAlchemy session."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        """Store the session factory used to open transactional scopes.

        Args:
            session_factory: Factory producing SQLAlchemy async sessions.
        """
        self._session_factory = session_factory
        self.session: AsyncSession | None = None
        self.users: SqlAlchemyUserRepository | None = None
        self.sessions: SqlAlchemySessionRepository | None = None

    async def __aenter__(self) -> SqlAlchemyUnitOfWork:
        """Open the transactional scope and instantiate repositories.

        Returns:
            The initialized unit of work.
        """
        self.session = self._session_factory()
        # Repositories share one session so cross-aggregate writes commit atomically.
        self.users = SqlAlchemyUserRepository(self.session)
        self.sessions = SqlAlchemySessionRepository(self.session)
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        """Close the transactional scope and roll back on failure.

        Args:
            exc_type: Exception type raised inside the context, if any.
            exc: Exception instance raised inside the context, if any.
            tb: Traceback for the exception, if any.
        """
        if self.session is None:
            return
        if exc is not None:
            await self.session.rollback()
        await self.session.close()

    async def commit(self) -> None:
        """Commit the open transaction when a session exists."""
        if self.session is not None:
            await self.session.commit()

    async def rollback(self) -> None:
        """Roll back the open transaction when a session exists."""
        if self.session is not None:
            await self.session.rollback()


class SqlAlchemyUnitOfWorkFactory:
    """Factory that creates SQLAlchemy-backed units of work."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        """Store the session factory used for new units of work.

        Args:
            session_factory: Factory producing SQLAlchemy async sessions.
        """
        self._session_factory = session_factory

    def __call__(self) -> SqlAlchemyUnitOfWork:
        """Create a new unit of work for one application-service operation.

        Returns:
            Fresh SQLAlchemy unit of work.
        """
        return SqlAlchemyUnitOfWork(self._session_factory)
