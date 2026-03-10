"""Helpers for translating SDK stream events to and from Server-Sent Events."""

from __future__ import annotations

from collections.abc import AsyncIterator


async def parse_sse_messages(lines: AsyncIterator[str]) -> AsyncIterator[str]:
    """Parse raw SSE lines into concatenated ``data:`` payload strings.

    Args:
        lines: Async iterator that yields raw SSE lines.

    Returns:
        An async iterator of joined event payloads.
    """
    buffer: list[str] = []
    async for line in lines:
        if line == "":
            if buffer:
                yield "\n".join(buffer)
                buffer.clear()
            continue

        if line.startswith(":"):
            continue

        if line.startswith("data:"):
            buffer.append(line[5:].lstrip())

    if buffer:
        yield "\n".join(buffer)


def encode_sse_event(event_name: str, payload: str) -> bytes:
    """Encode one logical event payload into SSE wire format.

    Args:
        event_name: Logical SSE event name.
        payload: Serialized event payload.

    Returns:
        Bytes ready to be written to an SSE response body.
    """
    return f"event: {event_name}\ndata: {payload}\n\n".encode()
