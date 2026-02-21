"""
User Data Access Layer (Repository)

Responsibilities:
- Encapsulate User-related CRUD queries.
- Do NOT manage transaction boundaries (no commit/rollback here).
- Leave commit/rollback to the request-scoped DB dependency (get_db).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import DbSession
from app.model.user import User


class UserRepository:
    """Repository for User entity."""

    def __init__(self, db: Session):
        """Store the request-scoped SQLAlchemy session."""
        self.db = db

    def create(self, username: str, password: str) -> User:
        """
        Create and persist a new user entity.

        Notes:
        - No commit here (transaction is committed by get_db() after request succeeds).
        - flush() ensures INSERT is issued so generated fields (e.g., id) become available.
        """
        user = User(username=username, password=password, role="user", is_active=True)
        self.db.add(user)
        self.db.flush()  # Ensure INSERT is executed within the ongoing transaction
        self.db.refresh(user)  # Load DB-generated defaults/values into the object
        return user

    def get_by_id(self, user_id: int) -> User | None:
        """Return user by id or None if not found."""
        stmt = select(User).where(User.id == user_id)
        return self.db.scalar(stmt)

    def get_by_username(self, username: str) -> User | None:
        """Return user by username or None if not found."""
        stmt = select(User).where(User.username == username)
        return self.db.scalar(stmt)

    def refresh(self, user: User) -> User:
        """
        Refresh an already-loaded user entity from the database.

        Useful if DB triggers/defaults might change fields.
        """
        self.db.flush()
        self.db.refresh(user)
        return user


def get_user_repository(db: DbSession) -> UserRepository:
    """FastAPI dependency: construct repository with request-scoped session."""
    return UserRepository(db)


UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]
