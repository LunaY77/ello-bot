"""FastAPI lifespan for AppRuntime."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.runtime.app_runtime import AppRuntime


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    """Run the FastAPI lifespan around the application runtime.

    Args:
        app: FastAPI application receiving the runtime instance.

    Returns:
        Async context manager controlling startup and shutdown.
    """
    runtime = AppRuntime(app)
    await runtime.start()
    app.state.runtime = runtime
    try:
        yield
    finally:
        await runtime.stop()
