"""
Logging Configuration Module

Uses loguru for logging, supporting:
- Console colored output
- File output (rotated by size)
- Configurable log levels
- OpenTelemetry trace_id / span_id injection via patcher
"""

import sys
from pathlib import Path
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from loguru import Record

from .config import settings


def _otel_patcher(record: "Record") -> None:
    """Inject trace_id and span_id from current OTel span into log record extra."""
    trace_id = "0"
    span_id = "0"
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx and ctx.trace_id:
            trace_id = format(ctx.trace_id, "032x")
            span_id = format(ctx.span_id, "016x")
    except Exception:
        pass
    record["extra"]["trace_id"] = trace_id
    record["extra"]["span_id"] = span_id


def setup_logger():
    """Configure logging system

    Configuration includes:
    - Remove default handler
    - Add console handler (colored output)
    - Add file handler (rotated by size, retained for 30 days)
    - Patch every log record with trace_id / span_id
    """
    # Remove default handler
    logger.remove()

    # Inject trace context into every log record
    logger.configure(patcher=_otel_patcher)

    # Log format: time | level | module:function:line | trace_id span_id | message
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "trace_id={extra[trace_id]} span_id={extra[span_id]} | "
        "<level>{message}</level>"
    )

    # Console output - use log level from configuration
    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.log.LEVEL,
        colorize=True,
        catch=True,
    )

    # File output - use log file path and max size from configuration
    if not settings.DEBUG:
        log_path = Path(settings.log.FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger.add(
            settings.log.FILE,
            format=log_format,
            level=settings.log.LEVEL,
            rotation=settings.log.MAX_SIZE,
            retention="30 days",
            compression="zip",
            encoding="utf-8",
            catch=True,
            enqueue=True,
        )

    return logger


# Initialize logging system
log = setup_logger()
