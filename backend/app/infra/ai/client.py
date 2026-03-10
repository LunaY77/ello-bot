"""Public AI client entrypoints and orchestration logic."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from functools import lru_cache
from time import perf_counter
from typing import Annotated, TypeVar
from uuid import uuid4

from fastapi import Depends

from app.core import settings

from .config import AISettings
from .exceptions import AIError, AIRequestCancelledError, AITransportError
from .providers.anthropic import AnthropicProviderAdapter
from .providers.base import ProviderAdapter
from .providers.gemini import GeminiProviderAdapter
from .providers.openai import OpenAICompatibleProviderAdapter
from .registry import ModelRegistry, build_default_registry
from .requests import (
    AIRequest,
    AudioGenerateRequest,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
)
from .responses import (
    AIResponse,
    AudioGenerateResponse,
    EmbeddingResponse,
    ImageGenerateResponse,
    TextGenerateResponse,
)
from .retry import compute_backoff_seconds, should_retry
from .router import AIRouter
from .stream import (
    AIDoneEvent,
    AITextDeltaEvent,
    AnyAIStreamEvent,
    build_error_event,
    set_event_attempt,
)
from .telemetry import AITelemetry
from .types import AICapability, AttemptRecord, ProviderRequestContext, ResolvedModel

ResponseT = TypeVar("ResponseT", bound=AIResponse)


class TextClient:
    """Expose text generation operations under ``ai_client.text``."""

    def __init__(self, owner: AIClient) -> None:
        """Bind the sub-client to the shared root client.

        Args:
            owner: Root async AI client that owns the orchestration logic.

        Returns:
            None.
        """
        self._owner = owner

    async def generate(self, request: TextGenerateRequest) -> TextGenerateResponse:
        """Generate a complete text response.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            A normalized text generation response.
        """
        return await self._owner._generate_text(request)

    async def stream(self, request: TextGenerateRequest) -> AsyncIterator[AnyAIStreamEvent]:
        """Stream normalized text events.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            An async iterator of normalized stream events.
        """
        async for event in self._owner._stream_text(request):
            yield event


class EmbeddingClient:
    """Expose embedding operations under ``ai_client.embedding``."""

    def __init__(self, owner: AIClient) -> None:
        """Bind the sub-client to the shared root client.

        Args:
            owner: Root async AI client that owns the orchestration logic.

        Returns:
            None.
        """
        self._owner = owner

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate embeddings for one or more inputs.

        Args:
            request: Normalized SDK embedding request.

        Returns:
            A normalized embedding response.
        """
        return await self._owner._embed(request)


class ImageClient:
    """Expose image generation operations under ``ai_client.image``."""

    def __init__(self, owner: AIClient) -> None:
        """Bind the sub-client to the shared root client.

        Args:
            owner: Root async AI client that owns the orchestration logic.

        Returns:
            None.
        """
        self._owner = owner

    async def generate(self, request: ImageGenerateRequest) -> ImageGenerateResponse:
        """Generate one or more images from a prompt.

        Args:
            request: Normalized SDK image generation request.

        Returns:
            A normalized image generation response.
        """
        return await self._owner._generate_image(request)


class AudioClient:
    """Expose audio generation operations under ``ai_client.audio``."""

    def __init__(self, owner: AIClient) -> None:
        """Bind the sub-client to the shared root client.

        Args:
            owner: Root async AI client that owns the orchestration logic.

        Returns:
            None.
        """
        self._owner = owner

    async def generate(self, request: AudioGenerateRequest) -> AudioGenerateResponse:
        """Generate audio from text input.

        Args:
            request: Normalized SDK audio generation request.

        Returns:
            A normalized audio generation response.
        """
        return await self._owner._generate_audio(request)


class AIClient:
    """Provide the single public async entrypoint for all AI capabilities."""

    def __init__(
        self,
        *,
        registry: ModelRegistry,
        adapters: dict[str, ProviderAdapter],
        telemetry: AITelemetry,
    ) -> None:
        """Initialize the root client with routing, adapters, and telemetry.

        Args:
            registry: Shared model registry used to resolve providers and models.
            adapters: Provider adapters keyed by provider name.
            telemetry: Telemetry helper used to record spans and metrics.

        Returns:
            None.
        """
        self._registry = registry
        self._router = AIRouter(registry)
        self._adapters = adapters
        self._telemetry = telemetry

        self.text = TextClient(self)
        self.embedding = EmbeddingClient(self)
        self.image = ImageClient(self)
        self.audio = AudioClient(self)

    async def aclose(self) -> None:
        """Close all registered provider adapters.

        Args:
            None.

        Returns:
            None.
        """
        await asyncio.gather(*(adapter.aclose() for adapter in self._adapters.values()))

    async def _generate_text(self, request: TextGenerateRequest) -> TextGenerateResponse:
        """Execute a full text generation request with technical retries.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            A normalized text generation response.
        """
        return await self._execute_with_retry(
            request=request,
            capability=AICapability.TEXT_GENERATION,
            operation_name="text.generate",
            executor=lambda adapter, model, context: adapter.generate_text(request, model, context),
        )

    async def _embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Execute an embedding request with technical retries.

        Args:
            request: Normalized SDK embedding request.

        Returns:
            A normalized embedding response.
        """
        return await self._execute_with_retry(
            request=request,
            capability=AICapability.EMBEDDING,
            operation_name="embedding.embed",
            executor=lambda adapter, model, context: adapter.embed(request, model, context),
        )

    async def _generate_image(self, request: ImageGenerateRequest) -> ImageGenerateResponse:
        """Execute an image generation request with technical retries.

        Args:
            request: Normalized SDK image generation request.

        Returns:
            A normalized image generation response.
        """
        return await self._execute_with_retry(
            request=request,
            capability=AICapability.IMAGE_GENERATION,
            operation_name="image.generate",
            executor=lambda adapter, model, context: adapter.generate_image(
                request, model, context
            ),
        )

    async def _generate_audio(self, request: AudioGenerateRequest) -> AudioGenerateResponse:
        """Execute an audio generation request with technical retries.

        Args:
            request: Normalized SDK audio generation request.

        Returns:
            A normalized audio generation response.
        """
        return await self._execute_with_retry(
            request=request,
            capability=AICapability.AUDIO_GENERATION,
            operation_name="audio.generate",
            executor=lambda adapter, model, context: adapter.generate_audio(
                request, model, context
            ),
        )

    async def _stream_text(self, request: TextGenerateRequest) -> AsyncIterator[AnyAIStreamEvent]:
        """Execute a streaming text request with cautious pre-output retries.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            An async iterator of normalized stream events.
        """
        resolved = self._router.resolve(
            request=request,
            capability=AICapability.TEXT_GENERATION,
            require_stream=True,
        )
        adapter = self._get_adapter(resolved.provider)
        request_id = uuid4().hex
        request_started_at = perf_counter()
        prompt_preview = self._build_prompt_preview(request)
        retry_budget = max(resolved.max_retries, 0)
        last_error: AIError | None = None

        with self._telemetry.start_request_span(
            operation_name="text.stream",
            request_id=request_id,
            model_label=resolved.alias,
            capability=AICapability.TEXT_GENERATION.value,
        ) as request_span:
            self._telemetry.record_request_preview(request_span, prompt_preview)

            for retry_index in range(retry_budget + 1):
                attempt_number = retry_index + 1
                context = self._build_request_context(
                    request_id=request_id, request=request, model=resolved
                )
                buffered_events: list[AnyAIStreamEvent] = []
                output_visible = False

                with self._telemetry.start_attempt_span(
                    operation_name="text.stream",
                    request_id=request_id,
                    model=resolved,
                    attempt=attempt_number,
                    retry_index=retry_index,
                ) as attempt_span:
                    try:
                        async for event in adapter.stream_text(request, resolved, context):
                            normalized_event = set_event_attempt(event, attempt=attempt_number)

                            # Keep bookkeeping events private until text becomes visible.
                            # This lets the SDK retry transport failures without exposing
                            # noisy intermediate attempts to downstream consumers.
                            if (
                                isinstance(normalized_event, AITextDeltaEvent)
                                and not output_visible
                            ):
                                output_visible = True
                                for buffered_event in buffered_events:
                                    yield buffered_event
                                buffered_events.clear()

                            if not output_visible and normalized_event.event in {
                                "start",
                                "text_start",
                                "usage",
                            }:
                                buffered_events.append(normalized_event)
                                continue

                            if normalized_event.event == "text_end" and not output_visible:
                                output_visible = True
                                for buffered_event in buffered_events:
                                    yield buffered_event
                                buffered_events.clear()

                            if isinstance(normalized_event, AIDoneEvent):
                                for buffered_event in buffered_events:
                                    yield buffered_event
                                buffered_events.clear()
                                yield normalized_event

                                response = TextGenerateResponse(
                                    request_id=request_id,
                                    provider_request_id=normalized_event.provider_request_id,
                                    provider=resolved.provider,
                                    model=resolved.model_id,
                                    resolved_provider=resolved.provider,
                                    resolved_model=resolved.model_id,
                                    latency_ms=int((perf_counter() - request_started_at) * 1000),
                                    usage=normalized_event.usage,
                                    attempt_count=attempt_number,
                                    attempts=[],
                                    text=normalized_event.text,
                                    finish_reason=normalized_event.finish_reason,
                                )
                                self._telemetry.enrich_success_span(attempt_span, response)
                                self._telemetry.enrich_success_span(request_span, response)
                                self._telemetry.record_success(
                                    operation_name="text.stream",
                                    response=response,
                                )
                                return

                            yield normalized_event

                        raise AITransportError(
                            "Provider stream ended without a terminal done event",
                            provider=resolved.provider,
                            model=resolved.model_id,
                        )
                    except asyncio.CancelledError as exc:
                        normalized_error = AIRequestCancelledError(
                            "Text stream was cancelled",
                            provider=resolved.provider,
                            model=resolved.model_id,
                            raw_error=exc,
                        )
                    except Exception as exc:
                        normalized_error = self._normalize_error(exc, resolved)
                    self._telemetry.enrich_error_span(attempt_span, normalized_error)

                last_error = normalized_error

                should_retry_now = (
                    retry_index < retry_budget
                    and should_retry(normalized_error)
                    and not output_visible
                    and not normalized_error.partial_text
                )
                if should_retry_now:
                    await asyncio.sleep(
                        compute_backoff_seconds(
                            resolved.provider_config.backoff_base_ms,
                            retry_index,
                        )
                    )
                    continue

                for buffered_event in buffered_events:
                    yield buffered_event

                self._telemetry.enrich_error_span(request_span, normalized_error)
                self._telemetry.record_failure(
                    operation_name="text.stream",
                    provider=resolved.provider,
                    model=resolved.model_id,
                    error=normalized_error,
                    latency_ms=int((perf_counter() - request_started_at) * 1000),
                )
                yield build_error_event(
                    error=normalized_error,
                    request_id=request_id,
                    provider=resolved.provider,
                    model=resolved.model_id,
                    attempt=attempt_number,
                )
                return

        final_error = self._build_terminal_error(last_error, resolved=resolved)
        self._telemetry.record_failure(
            operation_name="text.stream",
            provider=resolved.provider,
            model=resolved.model_id,
            error=final_error,
            latency_ms=int((perf_counter() - request_started_at) * 1000),
        )
        yield build_error_event(
            error=final_error,
            request_id=request_id,
            provider=resolved.provider,
            model=resolved.model_id,
            attempt=max(retry_budget + 1, 1),
        )

    async def _execute_with_retry(
        self,
        *,
        request: AIRequest,
        capability: AICapability,
        operation_name: str,
        executor: Callable[
            [ProviderAdapter, ResolvedModel, ProviderRequestContext], Awaitable[ResponseT]
        ],
    ) -> ResponseT:
        """Execute a non-streaming operation with technical retries and telemetry.

        Args:
            request: Normalized SDK request object.
            capability: Capability required by the current operation.
            operation_name: Logical SDK operation name such as ``text.generate``.
            executor: Provider-specific coroutine that performs the actual request.

        Returns:
            A normalized SDK response produced by the successful attempt.
        """
        resolved = self._router.resolve(request=request, capability=capability)
        adapter = self._get_adapter(resolved.provider)
        request_id = uuid4().hex
        request_started_at = perf_counter()
        prompt_preview = self._build_prompt_preview(request)
        attempts: list[AttemptRecord] = []
        retry_budget = max(resolved.max_retries, 0)
        last_error: AIError | None = None

        with self._telemetry.start_request_span(
            operation_name=operation_name,
            request_id=request_id,
            model_label=resolved.alias,
            capability=capability.value,
        ) as request_span:
            self._telemetry.record_request_preview(request_span, prompt_preview)

            for retry_index in range(retry_budget + 1):
                attempt_number = retry_index + 1
                context = self._build_request_context(
                    request_id=request_id, request=request, model=resolved
                )
                attempt_started_at = perf_counter()
                attempt_record = AttemptRecord(
                    attempt=attempt_number,
                    provider=resolved.provider,
                    model=resolved.model_id,
                    alias=resolved.alias,
                    retry_index=retry_index,
                )

                with self._telemetry.start_attempt_span(
                    operation_name=operation_name,
                    request_id=request_id,
                    model=resolved,
                    attempt=attempt_number,
                    retry_index=retry_index,
                ) as attempt_span:
                    try:
                        raw_response = await executor(adapter, resolved, context)
                        # Attach SDK-owned metadata after the provider-specific payload
                        # is normalized, so adapters stay focused on protocol mapping.
                        response = self._finalize_response(
                            response=raw_response,
                            request_id=request_id,
                            resolved_model=resolved,
                            attempts=attempts
                            + [
                                attempt_record.model_copy(
                                    update={
                                        "success": True,
                                        "latency_ms": int(
                                            (perf_counter() - attempt_started_at) * 1000
                                        ),
                                        "provider_request_id": raw_response.provider_request_id,
                                    }
                                )
                            ],
                            total_latency_ms=int((perf_counter() - request_started_at) * 1000),
                        )
                        self._telemetry.enrich_success_span(attempt_span, response)
                        self._telemetry.enrich_success_span(request_span, response)
                        self._telemetry.record_success(
                            operation_name=operation_name,
                            response=response,
                        )
                        return response
                    except asyncio.CancelledError as exc:
                        normalized_error = AIRequestCancelledError(
                            f"{operation_name} was cancelled",
                            provider=resolved.provider,
                            model=resolved.model_id,
                            raw_error=exc,
                        )
                    except Exception as exc:
                        normalized_error = self._normalize_error(exc, resolved)
                    self._telemetry.enrich_error_span(attempt_span, normalized_error)

                last_error = normalized_error
                latency_ms = int((perf_counter() - attempt_started_at) * 1000)
                attempts.append(
                    attempt_record.model_copy(
                        update={
                            "success": False,
                            "latency_ms": latency_ms,
                            "error_type": normalized_error.__class__.__name__,
                            "error_message": normalized_error.message,
                        }
                    )
                )
                if retry_index < retry_budget and should_retry(normalized_error):
                    await asyncio.sleep(
                        compute_backoff_seconds(
                            resolved.provider_config.backoff_base_ms,
                            retry_index,
                        )
                    )
                    continue

                self._telemetry.enrich_error_span(request_span, normalized_error)
                self._telemetry.record_failure(
                    operation_name=operation_name,
                    provider=resolved.provider,
                    model=resolved.model_id,
                    error=normalized_error,
                    latency_ms=int((perf_counter() - request_started_at) * 1000),
                )
                raise normalized_error

        final_error = self._build_terminal_error(last_error, resolved=resolved)
        self._telemetry.record_failure(
            operation_name=operation_name,
            provider=resolved.provider,
            model=resolved.model_id,
            error=final_error,
            latency_ms=int((perf_counter() - request_started_at) * 1000),
        )
        raise final_error

    def _get_adapter(self, provider: str) -> ProviderAdapter:
        """Resolve the adapter responsible for one provider.

        Args:
            provider: Provider name used by the current route.

        Returns:
            The registered provider adapter.
        """
        adapter = self._adapters.get(provider)
        if adapter is None:
            raise AITransportError(f"No adapter registered for provider '{provider}'")
        return adapter

    def _build_request_context(
        self,
        *,
        request_id: str,
        request: AIRequest,
        model: ResolvedModel,
    ) -> ProviderRequestContext:
        """Build the runtime context passed to provider adapters.

        Args:
            request_id: Stable SDK request id shared across attempts.
            request: Normalized SDK request object.
            model: Resolved provider/model pair selected by the router.

        Returns:
            The provider request context for the current attempt.
        """
        return ProviderRequestContext(
            request_id=request_id,
            timeout_ms=request.timeout_ms or model.timeout_ms,
            metadata=dict(request.metadata),
            idempotency_key=request.idempotency_key,
        )

    def _normalize_error(self, error: Exception, model: ResolvedModel) -> AIError:
        """Coerce arbitrary exceptions into the unified AI error hierarchy.

        Args:
            error: Exception raised by the provider adapter or client logic.
            model: Resolved provider/model pair selected by the router.

        Returns:
            A normalized SDK exception instance.
        """
        if isinstance(error, BaseException) and not isinstance(error, Exception):
            raise error

        if isinstance(error, AIError):
            # Adapters may omit provider/model context for locally generated errors.
            if error.provider is None:
                error.provider = model.provider
            if error.model is None:
                error.model = model.model_id
            return error

        return AITransportError(
            str(error),
            provider=model.provider,
            model=model.model_id,
            raw_error=error,
        )

    def _build_terminal_error(self, error: AIError | None, *, resolved: ResolvedModel) -> AIError:
        """Build the final surfaced error after all attempts are exhausted.

        Args:
            error: Last normalized exception raised during execution, if any.
            resolved: Resolved provider/model pair selected by the router.

        Returns:
            A normalized SDK exception instance.
        """
        if error is not None:
            return error

        return AITransportError(
            "AI request failed",
            provider=resolved.provider,
            model=resolved.model_id,
        )

    def _finalize_response(
        self,
        *,
        response: ResponseT,
        request_id: str,
        resolved_model: ResolvedModel,
        attempts: list[AttemptRecord],
        total_latency_ms: int,
    ) -> ResponseT:
        """Attach SDK-level attempt metadata to a provider response.

        Args:
            response: Provider-normalized response returned by the adapter.
            request_id: Stable SDK request id shared across attempts.
            resolved_model: Resolved provider/model pair selected by the router.
            attempts: Attempt records collected so far.
            total_latency_ms: Total latency across every attempt.

        Returns:
            A response enriched with SDK-level metadata.
        """
        return response.model_copy(
            update={
                "request_id": request_id,
                "provider": resolved_model.provider,
                "model": resolved_model.model_id,
                "resolved_provider": resolved_model.provider,
                "resolved_model": resolved_model.model_id,
                "latency_ms": total_latency_ms,
                "attempt_count": len(attempts),
                "attempts": attempts,
            }
        )

    def _build_prompt_preview(self, request: AIRequest) -> str | None:
        """Extract a safe prompt preview used only for optional telemetry.

        Args:
            request: Normalized SDK request object.

        Returns:
            A best-effort prompt preview string, or ``None`` when unavailable.
        """
        if isinstance(request, TextGenerateRequest):
            return "\n".join(message.content for message in request.messages)
        if isinstance(request, EmbeddingRequest):
            return request.input if isinstance(request.input, str) else request.input[0]
        if isinstance(request, ImageGenerateRequest):
            return request.prompt
        if isinstance(request, AudioGenerateRequest):
            return request.input_text
        return None


def create_ai_client(
    *,
    ai_settings: AISettings | None = None,
    registry: ModelRegistry | None = None,
    adapters: dict[str, ProviderAdapter] | None = None,
    telemetry: AITelemetry | None = None,
) -> AIClient:
    """Create a fully wired async AI client instance.

    Args:
        ai_settings: Optional AI SDK settings override.
        registry: Optional prebuilt model registry.
        adapters: Optional prebuilt provider adapter mapping.
        telemetry: Optional telemetry helper override.

    Returns:
        A fully wired async AI client instance.
    """
    effective_settings = ai_settings or settings.ai
    effective_registry = registry or build_default_registry(effective_settings)
    effective_telemetry = telemetry or AITelemetry(effective_settings)

    if adapters is None:
        adapters = {
            "anthropic": AnthropicProviderAdapter(
                default_timeout_ms=effective_settings.default_timeout_ms,
            ),
            "gemini": GeminiProviderAdapter(
                default_timeout_ms=effective_settings.default_timeout_ms,
            ),
            "openai": OpenAICompatibleProviderAdapter(
                default_timeout_ms=effective_settings.default_timeout_ms,
            ),
        }

    return AIClient(
        registry=effective_registry,
        adapters=adapters,
        telemetry=effective_telemetry,
    )


@lru_cache
def get_ai_client() -> AIClient:
    """Return the process-wide shared async AI client.

    Args:
        None.

    Returns:
        The shared async AI client instance.
    """
    return create_ai_client()


async def close_ai_client() -> None:
    """Close the shared async AI client and clear the cache.

    Args:
        None.

    Returns:
        None.
    """
    if get_ai_client.cache_info().currsize == 0:
        return

    client = get_ai_client()
    await client.aclose()
    get_ai_client.cache_clear()


def get_ai_client_dependency() -> AIClient:
    """FastAPI dependency wrapper for the shared AI client.

    Args:
        None.

    Returns:
        The shared async AI client instance.
    """
    return get_ai_client()


AIClientDep = Annotated[AIClient, Depends(get_ai_client_dependency)]
