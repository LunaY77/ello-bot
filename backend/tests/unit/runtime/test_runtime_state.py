from fastapi import FastAPI

from app.runtime.app_runtime import AppRuntime
from app.runtime.state import RuntimeState


def test_runtime_starts_in_created_state():
    runtime = AppRuntime(FastAPI())

    assert runtime.state is RuntimeState.CREATED
    assert runtime.resources.db_engine is None
    assert runtime.resources.redis is None
