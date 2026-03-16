"""Log configuration shared by runtime and services."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import TYPE_CHECKING

from loguru import logger

from app.core.config import settings

if TYPE_CHECKING:
    from loguru import Record


def _otel_patcher(record: Record) -> None:
    """Attach trace metadata to Loguru records when telemetry is active.

    Args:
        record: Mutable Loguru record being prepared for output.
    """
    trace_id = "0"
    span_id = "0"
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        context = span.get_span_context()
        if context and context.trace_id:
            trace_id = format(context.trace_id, "032x")
            span_id = format(context.span_id, "016x")
    except Exception:
        pass

    record["extra"]["trace_id"] = trace_id
    record["extra"]["span_id"] = span_id


def setup_logger():
    """Configure the shared Loguru logger for console and file output.

    Returns:
        Configured Loguru logger instance.
    """
    logger.remove()
    logger.configure(patcher=_otel_patcher)

    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "trace_id={extra[trace_id]} span_id={extra[span_id]} | "
        "<level>{message}</level>"
    )

    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.log.LEVEL,
        colorize=True,
        catch=True,
    )

    if not settings.DEBUG:
        # File logging is enabled only outside debug mode so local iteration stays lightweight.
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


log = setup_logger()
