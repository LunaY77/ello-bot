"""Behavioral tests for the unified AI client orchestration layer."""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest

from app.infra.ai import (
    AIClient,
    AIClientSync,
    AIFinishReason,
    AITimeoutError,
    AITransportError,
    AIUsage,
    ModelRegistry,
    TextGenerateRequest,
    TextMessage,
)
from app.infra.ai.config import AISettings
from app.infra.ai.providers import ProviderAdapter
from app.infra.ai.responses import TextGenerateResponse
from app.infra.ai.stream import AIDoneEvent, AIStartEvent, AITextDeltaEvent, AITextStartEvent
from app.infra.ai.telemetry import AITelemetry
from app.infra.ai.types import (
    AICapability,
    AIModality,
    ModelSpec,
    ProviderConfig,
    ProviderRequestContext,
    ResolvedModel,
)

_MODEL_ALIAS = "fake:fake-primary"
_MODEL_ID = "fake-primary"


class ScriptedProviderAdapter(ProviderAdapter):
    """Return scripted responses for deterministic client orchestration tests."""

    def __init__(self) -> None:
        """Initialize per-model scripts used by the tests.

        Args:
            None.

        Returns:
            None.
        """
        self.generate_scripts: dict[str, list[object]] = {}
        self.stream_scripts: dict[str, list[object]] = {}

    async def generate_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> TextGenerateResponse:
        """Execute the next scripted generate behavior for the resolved model.

        Args:
            request: Normalized text generation request.
            model: Resolved provider/model pair selected by the client.
            context: Per-call runtime context for the provider adapter.

        Returns:
            A normalized text generation response.
        """
        del request

        action = self.generate_scripts[model.alias].pop(0)
        if isinstance(action, Exception):
            raise action

        return TextGenerateResponse(
            request_id=context.request_id,
            provider_request_id=f"provider-{model.alias}",
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=5,
            usage=AIUsage.from_counts(2, 3),
            text=str(action),
            finish_reason=AIFinishReason.STOP,
        )

    async def stream_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> AsyncIterator[object]:
        """Execute the next scripted stream behavior for the resolved model.

        Args:
            request: Normalized text generation request.
            model: Resolved provider/model pair selected by the client.
            context: Per-call runtime context for the provider adapter.

        Returns:
            An async iterator of scripted SDK events.
        """
        del request, context

        action = self.stream_scripts[model.alias].pop(0)
        if isinstance(action, Exception):
            raise action

        if hasattr(action, "__aiter__"):
            async for event in action:
                yield event
            return

        for event in action:
            yield event


def build_client(adapter: ScriptedProviderAdapter, *, max_retries: int = 1) -> AIClient:
    """Build a client wired to an in-memory fake provider.

    Args:
        adapter: Fake provider adapter used by the tests.
        max_retries: Technical retry budget configured for the fake provider.

    Returns:
        A fully wired AI client instance for tests.
    """
    registry = ModelRegistry(
        providers=(
            ProviderConfig(
                name="fake",
                api_key="test",
                base_url="https://example.test/v1",
                timeout_ms=10_000,
                max_retries=max_retries,
                backoff_base_ms=1,
            ),
        ),
        models=(
            ModelSpec(
                alias=_MODEL_ALIAS,
                provider="fake",
                model_id=_MODEL_ID,
                capabilities=(AICapability.TEXT_GENERATION,),
                input_modalities=(AIModality.TEXT,),
                output_modalities=(AIModality.TEXT,),
                supports_stream=True,
            ),
        ),
    )
    telemetry = AITelemetry(AISettings())
    return AIClient(registry=registry, adapters={"fake": adapter}, telemetry=telemetry)


def build_request() -> TextGenerateRequest:
    """Build a minimal text request used across tests.

    Args:
        None.

    Returns:
        A minimal text generation request.
    """
    return TextGenerateRequest(
        provider="fake",
        model=_MODEL_ID,
        messages=[TextMessage(role="user", content="hello")],
    )


@pytest.mark.asyncio
async def test_text_generate_retries_same_model_on_retryable_error() -> None:
    """The client should retry the same route after a retryable provider error."""
    adapter = ScriptedProviderAdapter()
    adapter.generate_scripts = {
        _MODEL_ALIAS: [
            AITimeoutError("timed out", provider="fake", model=_MODEL_ID),
            "retried answer",
        ]
    }
    client = build_client(adapter)

    response = await client.text.generate(build_request())

    assert response.text == "retried answer"
    assert response.attempt_count == 2
    assert [attempt.success for attempt in response.attempts] == [False, True]


@pytest.mark.asyncio
async def test_text_stream_retries_before_output_is_visible() -> None:
    """The client should retry a stream before any user-visible output is emitted."""
    adapter = ScriptedProviderAdapter()
    adapter.stream_scripts = {
        _MODEL_ALIAS: [
            AITimeoutError("timed out", provider="fake", model=_MODEL_ID),
            [
                AIStartEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                ),
                AITextStartEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                ),
                AITextDeltaEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                    delta="retry",
                    text="retry",
                ),
                AIDoneEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                    text="retry",
                    finish_reason=AIFinishReason.STOP,
                    usage=AIUsage.from_counts(1, 1),
                ),
            ],
        ]
    }
    client = build_client(adapter)

    events = [event async for event in client.text.stream(build_request())]

    assert [event.event for event in events] == ["start", "text_start", "text_delta", "done"]
    assert events[-1].text == "retry"
    assert all(event.attempt == 2 for event in events)


@pytest.mark.asyncio
async def test_text_stream_preserves_partial_output_on_error() -> None:
    """The client should surface partial output instead of retrying after visible output."""
    adapter = ScriptedProviderAdapter()
    adapter.stream_scripts = {
        _MODEL_ALIAS: [
            [
                AIStartEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                ),
                AITextStartEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                ),
                AITextDeltaEvent(
                    request_id="req",
                    provider="fake",
                    model=_MODEL_ID,
                    attempt=0,
                    delta="hel",
                    text="hel",
                ),
            ]
        ]
    }
    client = build_client(adapter)

    seeded_events = adapter.stream_scripts[_MODEL_ALIAS][0]

    async def broken_stream() -> AsyncIterator[object]:
        """Yield scripted output and then fail with partial text attached.

        Args:
            None.

        Returns:
            An async iterator of seeded events followed by an exception.
        """
        for event in seeded_events:
            yield event

        raise AITransportError(
            "stream failed",
            provider="fake",
            model=_MODEL_ID,
            partial_text="hel",
        )

    adapter.stream_scripts[_MODEL_ALIAS] = [broken_stream()]

    events = [event async for event in client.text.stream(build_request())]

    assert [event.event for event in events] == ["start", "text_start", "text_delta", "error"]
    assert events[-1].partial_text == "hel"
    assert events[-1].error.error_type == "AITransportError"
    assert all(event.attempt == 1 for event in events)


@pytest.mark.asyncio
async def test_sync_facade_rejects_event_loop_usage() -> None:
    """The sync facade must fail fast when called from an async context."""
    with pytest.raises(RuntimeError, match="active event loop"):
        AIClientSync().text.generate(build_request())
