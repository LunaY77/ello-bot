"""
User Model Definition

Field description:
- id: Primary key (auto-increment integer)
- username: Username (unique)
- password: Password (bcrypt encrypted)
- avatar: Avatar URL
- role: Role (default "user")
- is_active: Is active (default True)
- created_at: Creation time
- updated_at: Update time
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """User table model

    Merges basic user information and authentication info, the core user table in the system.

    Table: users

    Columns:
        id: User unique identifier (auto-increment integer)
        username: Username (for login, unique)
        password: Password (bcrypt encrypted)
        avatar: Avatar URL
        role: User role (admin/user/pending)
        is_active: Is account active
        created_at: Creation time
        updated_at: Update time
    """

    __tablename__ = "users"

    # Primary key - auto-increment integer
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Username - unique index, used for login
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Password - bcrypt encrypted storage
    password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Avatar URL
    avatar: Mapped[str] = mapped_column(String(500), default="")

    # User role
    role: Mapped[str] = mapped_column(
        String(20),
        default="user",  # admin, user, pending
    )

    # Is account active
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Creation time
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Update time
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"
