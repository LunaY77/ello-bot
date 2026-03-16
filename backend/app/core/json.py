"""Small JSON helpers."""

from __future__ import annotations

import json
from typing import Any

from app.core.types import JsonObject, JsonValue


def dump_json(payload: JsonValue | JsonObject | dict[str, Any]) -> str:
    """Serialize JSON-compatible data with compact formatting.

    Args:
        payload: JSON-compatible payload to serialize.

    Returns:
        Compact JSON string.
    """
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def load_json(payload: str) -> JsonValue:
    """Deserialize a JSON string into Python data.

    Args:
        payload: JSON string to parse.

    Returns:
        Parsed JSON value.
    """
    return json.loads(payload)
