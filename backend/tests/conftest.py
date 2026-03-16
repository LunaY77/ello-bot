from __future__ import annotations

import importlib
import os
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from alembic.config import Config
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from alembic import command

# Configure the application for the dedicated test infrastructure before importing app modules.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DB_URL", "postgresql+asyncpg://ello:12345678@localhost:5433/ello_test")
os.environ.setdefault("REDIS_URL", "redis://:12345678@localhost:6380/0")
os.environ.setdefault("OTEL_ENABLED", "false")
os.environ.setdefault("BOOTSTRAP_ENABLED", "true")
os.environ.setdefault("BOOTSTRAP_ADMIN_USERNAME", "admin")
os.environ.setdefault("BOOTSTRAP_ADMIN_PASSWORD", "BootstrapAdmin_123456")
os.environ.setdefault("BOOTSTRAP_ADMIN_DISPLAY_NAME", "Bootstrap Admin")
os.environ.setdefault("AUTH_REGISTRATION_ENABLED", "false")

config_module = importlib.import_module("app.core.config")
database_base_module = importlib.import_module("app.infra.db.base")
database_session_module = importlib.import_module("app.infra.db.session")
redis_module = importlib.import_module("app.infra.cache.redis")
app_module = importlib.import_module("app.main")

settings = config_module.settings
Base = database_base_module.Base
engine = database_session_module.create_db_engine(settings)
SessionLocal = database_session_module.create_session_factory(engine)
redis_client = redis_module.create_redis_client(settings.cache.URL)
app = app_module.app

BACKEND_DIR = Path(__file__).resolve().parents[1]


async def _truncate_all_tables() -> None:
    """Remove all application rows while preserving the migrated schema."""
    table_names = ", ".join(f'"{table.name}"' for table in reversed(Base.metadata.sorted_tables))
    if not table_names:
        return

    async with engine.begin() as connection:
        # Reset identities as well so tests can assert stable ids when needed.
        await connection.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))


@pytest.fixture(scope="session")
def migrated_database() -> None:
    """Apply all Alembic migrations to the dedicated test database once per session."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(config, "head")


@pytest_asyncio.fixture(scope="function")
async def integration_state(
    request: pytest.FixtureRequest,
    migrated_database: None,
) -> AsyncGenerator[None, None]:
    """Clean the real database and Redis state around each integration test."""
    if request.node.get_closest_marker("integration") is None:
        yield
        return

    # Start each integration case from an empty state before the app lifespan bootstraps product data.
    await _truncate_all_tables()
    await redis_client.flushdb()
    try:
        yield
    finally:
        # Clear persisted sessions and test data so the next case gets a fresh bootstrap run.
        await redis_client.flushdb()
        await _truncate_all_tables()


@pytest_asyncio.fixture(scope="function")
async def client(integration_state: None) -> AsyncGenerator[AsyncClient, None]:
    """Provide a lifespan-aware HTTP client that uses production DI wiring."""
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
            yield async_client


@pytest_asyncio.fixture(scope="function")
async def db_session(integration_state: None) -> AsyncGenerator[AsyncSession, None]:
    """Expose a real database session for integration assertions."""
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def redis_for_assertions(integration_state: None):
    """Expose the real Redis client used by the application."""
    yield redis_client
