"""
Logging Configuration Module

Uses loguru for logging, supporting:
- Console colored output
- File output (rotated by date)
- Configurable log levels
- Complete context information (time, level, module name, function name, line number)
"""

import sys
from pathlib import Path

from loguru import logger

from app.core.config import settings


def setup_logger():
    """Configure logging system

    Configuration includes:
    - Remove default handler
    - Add console handler (colored output)
    - Add file handler (rotated by date, retained for 30 days)
    - Set log format
    """
    # Remove default handler
    logger.remove()

    # Log format: time | level | module name | function:line | message
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # Console output - use log level from configuration
    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.LOG_LEVEL,
        colorize=True,
        catch=True,  # Catch exceptions instead of crashing
    )

    # File output - use log file path and max size from configuration
    if not settings.DEBUG:
        log_path = Path(settings.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger.add(
            settings.LOG_FILE,
            format=log_format,
            level=settings.LOG_LEVEL,
            rotation=settings.LOG_MAX_SIZE,  # Rotate by file size
            retention="30 days",  # Retain for 30 days
            compression="zip",  # Compress old logs
            encoding="utf-8",
            catch=True,
            enqueue=True,  # Async write to avoid blocking
        )

    return logger


# Initialize logging system
log = setup_logger()
