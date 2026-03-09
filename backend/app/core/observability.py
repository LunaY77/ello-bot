"""
OpenTelemetry Initialization

Provides init_observability() which:
- When OTEL_ENABLED=true: configures TracerProvider, OTLP exporter,
  and instruments FastAPI, SQLAlchemy, Redis, requests, httpx, system metrics.
- When OTEL_ENABLED=false: no-op, zero overhead.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .config import settings
from .logger import log

if TYPE_CHECKING:
    from fastapi import FastAPI
    from sqlalchemy import Engine


def init_observability(
    app: FastAPI,
    engine: Engine,
) -> None:
    """Initialize OpenTelemetry tracing and instrumentation.

    No-op when settings.otel.ENABLED is False.
    All heavy imports are deferred so disabled mode adds zero import cost.

    Args:
        app: The FastAPI application instance.
        engine: The *sync* SQLAlchemy engine. For async setups pass ``async_engine.sync_engine``.
    """
    if not settings.otel.ENABLED:
        log.info("OpenTelemetry is disabled (OTEL_ENABLED=false)")
        return

    # ---- Deferred imports (only when OTel is enabled) ----
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    # ---- Resource ----
    resource = Resource.create(
        {
            "service.name": settings.otel.SERVICE_NAME,
            "service.version": settings.APP_VERSION,
            "deployment.environment": settings.otel.ENVIRONMENT,
        }
    )

    # ---- TracerProvider ----
    provider = TracerProvider(resource=resource)

    # ---- OTLP HTTP Exporter ----
    otlp_exporter = OTLPSpanExporter(
        endpoint=f"{settings.otel.EXPORTER_OTLP_ENDPOINT}/v1/traces",
    )
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    trace.set_tracer_provider(provider)

    # ---- Instrument libraries ----
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)
    RedisInstrumentor().instrument()
    RequestsInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
    SystemMetricsInstrumentor().instrument()

    log.info(
        "OpenTelemetry initialized: service={}, endpoint={}",
        settings.otel.SERVICE_NAME,
        settings.otel.EXPORTER_OTLP_ENDPOINT,
    )
