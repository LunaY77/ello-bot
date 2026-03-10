"""Provider adapter tests for the Anthropic implementation."""

from __future__ import annotations

import json

import httpx
import pytest

from app.infra.ai import AIUsage, TextGenerateRequest, TextMessage
from app.infra.ai.providers.anthropic import AnthropicProviderAdapter
from app.infra.ai.types import (
    AICapability,
    AIModality,
    ModelSpec,
    ProviderConfig,
    ProviderRequestContext,
    ResolvedModel,
)


def build_resolved_model() -> ResolvedModel:
    """Build a stable resolved model used in Anthropic unit tests."""
    return ResolvedModel(
        spec=ModelSpec(
            alias="chat.anthropic",
            provider="anthropic",
            model_id="claude-sonnet-test",
            capabilities=(AICapability.TEXT_GENERATION,),
            input_modalities=(AIModality.TEXT,),
            output_modalities=(AIModality.TEXT,),
            supports_stream=True,
        ),
        provider_config=ProviderConfig(
            name="anthropic",
            api_key="test-key",
            base_url="https://api.anthropic.test/v1",
            timeout_ms=10_000,
            max_retries=0,
            backoff_base_ms=1,
            default_headers={"anthropic-version": "2023-06-01"},
        ),
    )


@pytest.mark.asyncio
async def test_generate_text_parses_messages_response() -> None:
    """The provider should normalize the non-stream Messages API response."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic Anthropic messages payload."""
        assert request.url.path == "/v1/messages"
        return httpx.Response(
            200,
            json={
                "content": [{"type": "text", "text": "hello anthropic"}],
                "stop_reason": "end_turn",
                "usage": {"input_tokens": 4, "output_tokens": 2},
            },
            headers={"request-id": "anthropic-123"},
        )

    adapter = AnthropicProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    response = await adapter.generate_text(
        TextGenerateRequest(
            provider="anthropic",
            model="claude-sonnet-test",
            messages=[TextMessage(role="user", content="hello")],
        ),
        build_resolved_model(),
        ProviderRequestContext(request_id="sdk-anthropic"),
    )

    assert response.request_id == "sdk-anthropic"
    assert response.provider_request_id == "anthropic-123"
    assert response.text == "hello anthropic"
    assert response.usage == AIUsage.from_counts(4, 2, 6)


@pytest.mark.asyncio
async def test_stream_text_parses_anthropic_sse_events() -> None:
    """The provider should normalize Anthropic SSE chunks into SDK events."""
    sse_payload = "\n\n".join(
        [
            f"data: {json.dumps({'type': 'message_start', 'message': {'usage': {'input_tokens': 3, 'output_tokens': 0}}})}",
            f"data: {json.dumps({'type': 'content_block_start', 'content_block': {'type': 'text', 'text': ''}})}",
            f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'Hel'}})}",
            f"data: {json.dumps({'type': 'content_block_delta', 'delta': {'type': 'text_delta', 'text': 'lo'}})}",
            f"data: {json.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn'}, 'usage': {'output_tokens': 2}})}",
            f"data: {json.dumps({'type': 'message_stop'})}",
            "",
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic Anthropic streaming response."""
        assert request.url.path == "/v1/messages"
        return httpx.Response(
            200,
            text=sse_payload,
            headers={"request-id": "anthropic-stream"},
        )

    adapter = AnthropicProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    events = [
        event
        async for event in adapter.stream_text(
            TextGenerateRequest(
                provider="anthropic",
                model="claude-sonnet-test",
                messages=[TextMessage(role="user", content="hello")],
            ),
            build_resolved_model(),
            ProviderRequestContext(request_id="sdk-anthropic-stream"),
        )
    ]

    assert [event.event for event in events] == [
        "start",
        "usage",
        "text_start",
        "text_delta",
        "text_delta",
        "usage",
        "text_end",
        "done",
    ]
    assert events[-1].text == "Hello"
