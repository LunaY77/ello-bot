"""FastAPI and SQLAlchemy observability wiring."""

from __future__ import annotations

from fastapi import FastAPI
from sqlalchemy import Engine

from app.core.config import Settings
from app.core.logging import log


def init_observability(*, app: FastAPI, engine: Engine, settings: Settings) -> None:
    """Initialize optional OpenTelemetry instrumentation for the runtime.

    Args:
        app: FastAPI application to instrument.
        engine: SQLAlchemy engine to instrument.
        settings: Application settings controlling telemetry behavior.
    """
    if not settings.otel.ENABLED:
        log.info("OpenTelemetry is disabled (OTEL_ENABLED=false)")
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": settings.otel.SERVICE_NAME,
            "service.version": settings.APP_VERSION,
            "deployment.environment": settings.otel.ENVIRONMENT,
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=f"{settings.otel.EXPORTER_OTLP_ENDPOINT}/v1/traces")
        )
    )
    trace.set_tracer_provider(provider)

    # Instrument adapters after the provider is installed so all spans share the same resource metadata.
    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)
    RedisInstrumentor().instrument()
    log.info("OpenTelemetry initialized")
