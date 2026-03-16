"""SQLAlchemy models for the user aggregate."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BIGINT, Boolean, DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import (
    DEFAULT_USER_AVATAR_URL,
    DEFAULT_USER_LOCALE,
    DEFAULT_USER_MODEL,
    DEFAULT_USER_SYSTEM_PROMPT,
    DEFAULT_USER_THEME,
)
from app.infra.db.base import Base

if TYPE_CHECKING:
    from app.infra.db.models.session import AuthSessionModel


class UserModel(Base):
    """SQLAlchemy model storing user accounts."""

    __tablename__ = "users"

    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(BIGINT, Identity(start=1), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        default=DEFAULT_USER_AVATAR_URL,
        server_default=DEFAULT_USER_AVATAR_URL,
    )
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    session_version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    settings: Mapped[UserSettingsModel | None] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    auth_sessions: Mapped[list[AuthSessionModel]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )


class UserSettingsModel(Base):
    """SQLAlchemy model storing per-user preference settings."""

    __tablename__ = "user_settings"

    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(BIGINT, Identity(start=1), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    locale: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DEFAULT_USER_LOCALE,
        server_default=DEFAULT_USER_LOCALE,
    )
    theme: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DEFAULT_USER_THEME,
        server_default=DEFAULT_USER_THEME,
    )
    system_prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=DEFAULT_USER_SYSTEM_PROMPT,
        server_default=DEFAULT_USER_SYSTEM_PROMPT,
    )
    default_model: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default=DEFAULT_USER_MODEL,
        server_default=DEFAULT_USER_MODEL,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[UserModel] = relationship(back_populates="settings", lazy="raise")
