"""AppRuntime owns process-level resources and service assembly."""

from __future__ import annotations

from fastapi import FastAPI

from app.application.session.service import SessionService
from app.application.user.service import UserService
from app.core import log, settings
from app.infra.cache.redis import AccessSessionSnapshotStore, create_redis_client
from app.infra.db.session import create_db_engine, create_session_factory
from app.infra.db.uow import SqlAlchemyUnitOfWorkFactory
from app.infra.observability.instrument import init_observability
from app.runtime.container import (
    RuntimeGateways,
    RuntimeRegistries,
    RuntimeResources,
    RuntimeServices,
)
from app.runtime.state import RuntimeState


class AppRuntime:
    """Own process-level resources, wiring, and lifecycle transitions."""

    def __init__(self, app: FastAPI) -> None:
        """Initialize the runtime shell and empty dependency containers.

        Args:
            app: FastAPI application that hosts the runtime lifecycle.
        """
        self.app = app
        self.config = settings
        self.resources = RuntimeResources()
        self.gateways = RuntimeGateways()
        self.registries = RuntimeRegistries()
        self.services = RuntimeServices()
        self.state = RuntimeState.CREATED

    async def start(self) -> None:
        """Assemble long-lived resources and application services.

        Returns:
            None.
        """
        if self.state not in {RuntimeState.CREATED, RuntimeState.STOPPED}:
            return

        self.state = RuntimeState.STARTING
        # Runtime owns process-wide resources so routes and services never create them ad hoc.
        self.resources.db_engine = create_db_engine(self.config)
        self.resources.session_factory = create_session_factory(self.resources.db_engine)
        self.resources.redis = create_redis_client(self.config.cache.URL)
        self.resources.access_session_store = AccessSessionSnapshotStore(self.resources.redis)

        init_observability(
            app=self.app,
            engine=self.resources.db_engine.sync_engine,
            settings=self.config,
        )

        # Services receive fully assembled infrastructure through the runtime root.
        uow_factory = SqlAlchemyUnitOfWorkFactory(
            session_factory=self.resources.session_factory,
        )
        self.services.user = UserService(
            settings=self.config,
            uow_factory=uow_factory,
            access_session_store=self.resources.access_session_store,
        )
        self.services.session = SessionService(
            settings=self.config,
            uow_factory=uow_factory,
            access_session_store=self.resources.access_session_store,
        )

        if self.config.bootstrap.ENABLED:
            # Bootstrap admin repair remains idempotent so startup can safely re-run it.
            await self.services.user.ensure_bootstrap_admin()

        self.state = RuntimeState.STARTED
        log.info("Application runtime started")

    async def stop(self) -> None:
        """Dispose long-lived resources owned by the runtime.

        Returns:
            None.
        """
        if self.state not in {RuntimeState.STARTING, RuntimeState.STARTED}:
            return

        self.state = RuntimeState.STOPPING
        if self.resources.redis is not None:
            await self.resources.redis.aclose()
        if self.resources.db_engine is not None:
            await self.resources.db_engine.dispose()
        self.state = RuntimeState.STOPPED
        log.info("Application runtime stopped")
