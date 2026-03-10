"""Pytest configuration for backend tests."""

from __future__ import annotations

import os

# The application settings require a JWT secret unless DEBUG is true.
# Tests set the minimal environment up front so importing app modules stays deterministic.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("JWT_SECRET_KEY", "12345678901234567890123456789012")
