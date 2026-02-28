"""Shared test fixtures and configuration."""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure app settings can be initialized in CI even without a local .env.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci-and-pytest-123456")

from app.core.database import Base, get_db
from app.main import app
from app.model.user import User
from app.utils.auth import create_access_token, hash_password


@pytest.fixture
def db_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def session_factory(db_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine, expire_on_commit=False)


@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.main.SessionLocal", session_factory):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    user = User(
        username="testuser",
        password=hash_password("password123"),
        role="user",
        is_active=True,
        avatar="",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": str(test_user.id), "token_type": "access"})
    return {"Authorization": f"Bearer {token}"}
