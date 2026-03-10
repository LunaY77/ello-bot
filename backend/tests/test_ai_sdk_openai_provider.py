"""Provider adapter tests for the OpenAI-compatible implementation."""

from __future__ import annotations

import json

import httpx
import pytest

from app.infra.ai import AIUsage, TextGenerateRequest, TextMessage
from app.infra.ai.exceptions import AIProviderUnavailableError
from app.infra.ai.providers.openai import OpenAICompatibleProviderAdapter
from app.infra.ai.requests import EmbeddingRequest
from app.infra.ai.types import (
    AICapability,
    AIModality,
    ModelSpec,
    ProviderConfig,
    ProviderRequestContext,
    ResolvedModel,
)


def build_resolved_model() -> ResolvedModel:
    """Build a stable resolved model used in provider unit tests."""
    return ResolvedModel(
        spec=ModelSpec(
            alias="chat.default",
            provider="openai",
            model_id="gpt-test",
            capabilities=(AICapability.TEXT_GENERATION, AICapability.EMBEDDING),
            input_modalities=(AIModality.TEXT,),
            output_modalities=(AIModality.TEXT,),
            supports_stream=True,
        ),
        provider_config=ProviderConfig(
            name="openai",
            api_key="test-key",
            base_url="https://api.example.com/v1",
            timeout_ms=10_000,
            max_retries=0,
            backoff_base_ms=1,
        ),
    )


@pytest.mark.asyncio
async def test_generate_text_parses_chat_completion_response() -> None:
    """The provider should normalize the chat completion response shape."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic chat completion payload."""
        assert request.url.path == "/v1/chat/completions"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {"content": "hello world"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 3,
                    "completion_tokens": 2,
                    "total_tokens": 5,
                },
            },
            headers={"x-request-id": "provider-123"},
        )

    model = build_resolved_model()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OpenAICompatibleProviderAdapter(default_timeout_ms=10_000, http_client=client)

    response = await adapter.generate_text(
        TextGenerateRequest(
            provider="openai",
            model="gpt-test",
            messages=[TextMessage(role="user", content="hello")],
        ),
        model,
        ProviderRequestContext(request_id="sdk-123"),
    )

    assert response.request_id == "sdk-123"
    assert response.provider_request_id == "provider-123"
    assert response.text == "hello world"
    assert response.usage == AIUsage.from_counts(3, 2, 5)


@pytest.mark.asyncio
async def test_stream_text_parses_sse_chunks() -> None:
    """The provider should normalize streaming SSE chunks into SDK events."""
    sse_payload = "\n\n".join(
        [
            f"data: {json.dumps({'choices': [{'delta': {'role': 'assistant'}}]})}",
            f"data: {json.dumps({'choices': [{'delta': {'content': 'Hel'}}]})}",
            f"data: {json.dumps({'choices': [{'delta': {'content': 'lo'}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': 1, 'completion_tokens': 1, 'total_tokens': 2}})}",
            "data: [DONE]",
            "",
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic SSE stream response."""
        assert request.url.path == "/v1/chat/completions"
        return httpx.Response(
            200,
            text=sse_payload,
            headers={"x-request-id": "provider-stream"},
        )

    model = build_resolved_model()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OpenAICompatibleProviderAdapter(default_timeout_ms=10_000, http_client=client)

    events = [
        event
        async for event in adapter.stream_text(
            TextGenerateRequest(
                provider="openai",
                model="gpt-test",
                messages=[TextMessage(role="user", content="hello")],
            ),
            model,
            ProviderRequestContext(request_id="sdk-stream"),
        )
    ]

    assert [event.event for event in events] == [
        "start",
        "text_start",
        "text_delta",
        "usage",
        "text_delta",
        "text_end",
        "done",
    ]
    assert events[-1].text == "Hello"


@pytest.mark.asyncio
async def test_embed_rejects_inconsistent_dimensions() -> None:
    """The provider should raise when embedding vectors do not share one dimension."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Return inconsistent embedding dimensions to simulate provider corruption."""
        assert request.url.path == "/v1/embeddings"
        return httpx.Response(
            200,
            json={
                "data": [
                    {"embedding": [0.1, 0.2]},
                    {"embedding": [0.1, 0.2, 0.3]},
                ]
            },
        )

    model = build_resolved_model()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OpenAICompatibleProviderAdapter(default_timeout_ms=10_000, http_client=client)

    with pytest.raises(AIProviderUnavailableError, match="inconsistent embedding dimensions"):
        await adapter.embed(
            EmbeddingRequest(provider="openai", model="gpt-test", input=["a", "b"]),
            model,
            ProviderRequestContext(request_id="sdk-embed"),
        )
