"""Provider adapter tests for the Gemini implementation."""

from __future__ import annotations

import base64
import json

import httpx
import pytest

from app.infra.ai import (
    AIUsage,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
    TextMessage,
)
from app.infra.ai.providers.gemini import GeminiProviderAdapter
from app.infra.ai.types import (
    AICapability,
    AIModality,
    ModelSpec,
    ProviderConfig,
    ProviderRequestContext,
    ResolvedModel,
)


def build_text_model() -> ResolvedModel:
    """Build a Gemini text model used in unit tests."""
    return ResolvedModel(
        spec=ModelSpec(
            alias="chat.gemini",
            provider="gemini",
            model_id="gemini-2.5-flash",
            capabilities=(AICapability.TEXT_GENERATION,),
            input_modalities=(AIModality.TEXT,),
            output_modalities=(AIModality.TEXT,),
            supports_stream=True,
        ),
        provider_config=ProviderConfig(
            name="gemini",
            api_key="test-key",
            base_url="https://generativelanguage.googleapis.test/v1beta",
            timeout_ms=10_000,
            max_retries=0,
            backoff_base_ms=1,
        ),
    )


def build_embedding_model() -> ResolvedModel:
    """Build a Gemini embedding model used in unit tests."""
    return ResolvedModel(
        spec=ModelSpec(
            alias="embedding.gemini",
            provider="gemini",
            model_id="gemini-embedding-001",
            capabilities=(AICapability.EMBEDDING,),
            input_modalities=(AIModality.TEXT,),
            output_modalities=(AIModality.TEXT,),
        ),
        provider_config=build_text_model().provider_config,
    )


def build_image_model() -> ResolvedModel:
    """Build a Gemini image model used in unit tests."""
    return ResolvedModel(
        spec=ModelSpec(
            alias="image.gemini",
            provider="gemini",
            model_id="gemini-2.5-flash-image",
            capabilities=(AICapability.IMAGE_GENERATION,),
            input_modalities=(AIModality.TEXT,),
            output_modalities=(AIModality.IMAGE,),
        ),
        provider_config=build_text_model().provider_config,
    )


@pytest.mark.asyncio
async def test_generate_text_parses_generate_content_response() -> None:
    """The provider should normalize Gemini's non-stream text response."""

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic Gemini text response."""
        assert request.url.path == "/v1beta/models/gemini-2.5-flash:generateContent"
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {"parts": [{"text": "hello gemini"}]},
                        "finishReason": "STOP",
                    }
                ],
                "usageMetadata": {
                    "promptTokenCount": 3,
                    "candidatesTokenCount": 2,
                    "totalTokenCount": 5,
                },
            },
            headers={"x-request-id": "gemini-123"},
        )

    adapter = GeminiProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    response = await adapter.generate_text(
        TextGenerateRequest(
            provider="gemini",
            model="gemini-2.5-flash",
            messages=[TextMessage(role="user", content="hello")],
        ),
        build_text_model(),
        ProviderRequestContext(request_id="sdk-gemini"),
    )

    assert response.request_id == "sdk-gemini"
    assert response.provider_request_id == "gemini-123"
    assert response.text == "hello gemini"
    assert response.usage == AIUsage.from_counts(3, 2, 5)


@pytest.mark.asyncio
async def test_stream_text_parses_gemini_sse_events() -> None:
    """The provider should normalize Gemini SSE chunks into SDK events."""
    sse_payload = "\n\n".join(
        [
            f"data: {json.dumps({'candidates': [{'content': {'parts': [{'text': 'Hel'}]}}]})}",
            f"data: {json.dumps({'candidates': [{'content': {'parts': [{'text': 'lo'}]}, 'finishReason': 'STOP'}], 'usageMetadata': {'promptTokenCount': 1, 'candidatesTokenCount': 1, 'totalTokenCount': 2}})}",
            "",
        ]
    )

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic Gemini streaming response."""
        assert request.url.path == "/v1beta/models/gemini-2.5-flash:streamGenerateContent"
        assert request.url.params["alt"] == "sse"
        return httpx.Response(
            200,
            text=sse_payload,
            headers={"x-request-id": "gemini-stream"},
        )

    adapter = GeminiProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    events = [
        event
        async for event in adapter.stream_text(
            TextGenerateRequest(
                provider="gemini",
                model="gemini-2.5-flash",
                messages=[TextMessage(role="user", content="hello")],
            ),
            build_text_model(),
            ProviderRequestContext(request_id="sdk-gemini-stream"),
        )
    ]

    assert [event.event for event in events] == [
        "start",
        "text_start",
        "text_delta",
        "text_delta",
        "usage",
        "text_end",
        "done",
    ]
    assert events[-1].text == "Hello"


@pytest.mark.asyncio
async def test_embed_supports_batch_inputs() -> None:
    """The provider should normalize batch embeddings across multiple requests."""
    embedding_vectors = [[0.1, 0.2], [0.3, 0.4]]

    def handler(request: httpx.Request) -> httpx.Response:
        """Return one embedding per inbound request."""
        assert request.url.path == "/v1beta/models/gemini-embedding-001:embedContent"
        body = json.loads(request.content.decode("utf-8"))
        text = body["content"]["parts"][0]["text"]
        vector = embedding_vectors[0] if text == "a" else embedding_vectors[1]
        return httpx.Response(
            200,
            json={
                "embedding": {"values": vector},
                "usageMetadata": {
                    "promptTokenCount": 1,
                    "candidatesTokenCount": 0,
                    "totalTokenCount": 1,
                },
            },
        )

    adapter = GeminiProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    response = await adapter.embed(
        EmbeddingRequest(provider="gemini", model="gemini-embedding-001", input=["a", "b"]),
        build_embedding_model(),
        ProviderRequestContext(request_id="sdk-gemini-embed"),
    )

    assert response.dimensions == 2
    assert response.vectors == embedding_vectors
    assert response.usage == AIUsage.from_counts(2, 0, 2)


@pytest.mark.asyncio
async def test_generate_image_parses_inline_image_data() -> None:
    """The provider should normalize Gemini image parts into artifacts."""
    image_bytes = b"fake-image"

    def handler(request: httpx.Request) -> httpx.Response:
        """Return a deterministic Gemini image response."""
        assert request.url.path == "/v1beta/models/gemini-2.5-flash-image:generateContent"
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "inlineData": {
                                        "mimeType": "image/png",
                                        "data": base64.b64encode(image_bytes).decode("utf-8"),
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
        )

    adapter = GeminiProviderAdapter(
        default_timeout_ms=10_000,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    response = await adapter.generate_image(
        ImageGenerateRequest(
            provider="gemini",
            model="gemini-2.5-flash-image",
            prompt="draw a cat",
        ),
        build_image_model(),
        ProviderRequestContext(request_id="sdk-gemini-image"),
    )

    assert response.artifacts[0].mime_type == "image/png"
    assert response.artifacts[0].content == image_bytes
