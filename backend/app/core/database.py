"""
Database Connection Configuration
"""

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

# Configure engine based on database type
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite specific configuration: allow multi-threaded access
    connect_args = {"check_same_thread": False}

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,  # SQL statement logging
    pool_pre_ping=True,  # Test connection before use
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Dependency function to get database session

    Used for FastAPI's Depends injection, ensures session is closed after request.

    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()  # Rollback on error
        raise
    finally:
        db.close()


# SQLAlchemy Base class for model definitions
Base = declarative_base(
    metadata=MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )
)

DbSession = Annotated[Session, Depends(get_db)]
