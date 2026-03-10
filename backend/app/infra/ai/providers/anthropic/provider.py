"""Anthropic provider adapter backed by raw HTTPX requests."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from time import perf_counter
from typing import Any

import httpx

from ...adapters.sse import parse_sse_messages
from ...exceptions import (
    AIAuthError,
    AIConfigError,
    AIError,
    AIPolicyDeniedError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIRequestCancelledError,
    AITimeoutError,
    AITransportError,
    AIValidationError,
)
from ...requests import TextGenerateRequest, TextMessage
from ...responses import TextGenerateResponse
from ...stream import (
    AIDoneEvent,
    AIStartEvent,
    AITextDeltaEvent,
    AITextEndEvent,
    AITextStartEvent,
    AIUsageEvent,
)
from ...types import AIFinishReason, AIUsage, ProviderRequestContext, ResolvedModel
from ..base import ProviderAdapter


class AnthropicProviderAdapter(ProviderAdapter):
    """Talk to Anthropic's Messages API through stable SDK interfaces."""

    def __init__(
        self,
        *,
        default_timeout_ms: int,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        """Create the provider adapter.

        Args:
            default_timeout_ms: Default timeout applied when the request does not override it.
            http_client: Optional shared HTTP client injected by tests or application code.

        Returns:
            None.
        """
        self._default_timeout_ms = default_timeout_ms
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient()

    async def aclose(self) -> None:
        """Close the underlying HTTP client when the adapter owns it.

        Args:
            None.

        Returns:
            None.
        """
        if self._owns_client:
            await self._client.aclose()

    async def generate_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> TextGenerateResponse:
        """Generate a complete text response through the Messages API.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized text generation response.
        """
        started_at = perf_counter()
        payload = self._build_messages_payload(request=request, model=model, stream=False)
        response = await self._request(
            "POST",
            "/messages",
            model=model,
            context=context,
            json_body=payload,
        )
        body = response.json()

        return TextGenerateResponse(
            request_id=context.request_id,
            provider_request_id=self._extract_request_id(response),
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=self._parse_usage(body.get("usage")),
            text=self._extract_text(body.get("content", [])),
            finish_reason=self._map_finish_reason(body.get("stop_reason")),
        )

    async def stream_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> AsyncIterator[
        AIStartEvent
        | AITextStartEvent
        | AITextDeltaEvent
        | AITextEndEvent
        | AIUsageEvent
        | AIDoneEvent
    ]:
        """Stream normalized text events from Anthropic SSE responses.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            An async iterator of normalized stream events.
        """
        payload = self._build_messages_payload(request=request, model=model, stream=True)
        accumulated_text = ""
        usage = AIUsage()
        text_started = False
        finish_reason = AIFinishReason.STOP
        provider_request_id: str | None = None

        try:
            async with self._client.stream(
                "POST",
                self._build_url(model, "/messages"),
                json=payload,
                headers=self._build_headers(model=model, context=context),
                timeout=self._resolve_timeout(model, context),
            ) as response:
                provider_request_id = self._extract_request_id(response)
                if response.is_error:
                    await self._raise_response_error(response, model=model)

                yield AIStartEvent(
                    request_id=context.request_id,
                    provider=model.provider,
                    model=model.model_id,
                    attempt=0,
                    provider_request_id=provider_request_id,
                )

                async for message in parse_sse_messages(response.aiter_lines()):
                    if not message:
                        continue

                    payload_chunk = json.loads(message)
                    payload_type = payload_chunk.get("type")

                    if payload_type == "ping":
                        continue

                    if payload_type == "error":
                        raise self._build_stream_error(
                            payload_chunk=payload_chunk,
                            model=model,
                            partial_text=accumulated_text or None,
                        )

                    if payload_type == "message_start":
                        usage = self._parse_usage(payload_chunk.get("message", {}).get("usage"))
                        yield AIUsageEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            usage=usage,
                        )
                        continue

                    if payload_type == "content_block_start":
                        block = payload_chunk.get("content_block", {})
                        if block.get("type") != "text":
                            continue

                        if not text_started:
                            text_started = True
                            yield AITextStartEvent(
                                request_id=context.request_id,
                                provider=model.provider,
                                model=model.model_id,
                                attempt=0,
                                provider_request_id=provider_request_id,
                            )

                        # Anthropic may send initial text in the start block.
                        initial_text = block.get("text") or ""
                        if initial_text:
                            accumulated_text += initial_text
                            yield AITextDeltaEvent(
                                request_id=context.request_id,
                                provider=model.provider,
                                model=model.model_id,
                                attempt=0,
                                provider_request_id=provider_request_id,
                                delta=initial_text,
                                text=accumulated_text,
                            )
                        continue

                    if payload_type == "content_block_delta":
                        delta = payload_chunk.get("delta", {})
                        if delta.get("type") != "text_delta":
                            continue

                        delta_text = delta.get("text") or ""
                        if not delta_text:
                            continue

                        if not text_started:
                            text_started = True
                            yield AITextStartEvent(
                                request_id=context.request_id,
                                provider=model.provider,
                                model=model.model_id,
                                attempt=0,
                                provider_request_id=provider_request_id,
                            )

                        accumulated_text += delta_text
                        yield AITextDeltaEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            delta=delta_text,
                            text=accumulated_text,
                        )
                        continue

                    if payload_type == "message_delta":
                        finish_reason = self._map_finish_reason(
                            payload_chunk.get("delta", {}).get("stop_reason")
                        )
                        usage = self._merge_usage(usage, payload_chunk.get("usage"))
                        yield AIUsageEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            usage=usage,
                        )
                        continue

                    if payload_type == "message_stop":
                        break

                if text_started:
                    yield AITextEndEvent(
                        request_id=context.request_id,
                        provider=model.provider,
                        model=model.model_id,
                        attempt=0,
                        provider_request_id=provider_request_id,
                        text=accumulated_text,
                    )

                yield AIDoneEvent(
                    request_id=context.request_id,
                    provider=model.provider,
                    model=model.model_id,
                    attempt=0,
                    provider_request_id=provider_request_id,
                    text=accumulated_text,
                    finish_reason=finish_reason,
                    usage=usage,
                )
        except asyncio.CancelledError as exc:
            raise AIRequestCancelledError(
                "Anthropic text streaming was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except AIError:
            raise
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Anthropic text stream timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Anthropic text stream transport failed",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except Exception as exc:
            raise AIProviderUnavailableError(
                "Anthropic text stream failed unexpectedly",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc

    async def _request(
        self,
        method: str,
        path: str,
        *,
        model: ResolvedModel,
        context: ProviderRequestContext,
        json_body: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Send one JSON request and normalize transport failures.

        Args:
            method: HTTP method name.
            path: Provider-relative endpoint path.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.
            json_body: Optional JSON request payload.

        Returns:
            The successful HTTP response object.
        """
        try:
            response = await self._client.request(
                method,
                self._build_url(model, path),
                json=json_body,
                headers=self._build_headers(model=model, context=context),
                timeout=self._resolve_timeout(model, context),
            )
        except asyncio.CancelledError as exc:
            raise AIRequestCancelledError(
                "Anthropic request was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Anthropic request timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Anthropic transport request failed",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc

        if response.is_error:
            await self._raise_response_error(response, model=model)
        return response

    async def _raise_response_error(
        self, response: httpx.Response, *, model: ResolvedModel
    ) -> None:
        """Map one Anthropic error response into the stable SDK hierarchy.

        Args:
            response: HTTP response returned by Anthropic.
            model: Resolved provider/model pair selected by the router.

        Returns:
            None.
        """
        error_type, message = self._extract_error(response)
        raise self._build_error(
            error_type=error_type,
            message=message,
            http_status=response.status_code,
            model=model,
        )

    def _build_messages_payload(
        self,
        *,
        request: TextGenerateRequest,
        model: ResolvedModel,
        stream: bool,
    ) -> dict[str, Any]:
        """Translate the stable text request into an Anthropic payload.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            stream: Whether Anthropic should return SSE events.

        Returns:
            A JSON-serializable payload accepted by the Messages API.
        """
        system_prompt = self._extract_system_prompt(request.messages)
        messages = [
            {
                "role": self._map_message_role(message.role),
                "content": message.content,
            }
            for message in request.messages
            if message.role != "system"
        ]
        if not messages:
            raise AIValidationError("Anthropic requires at least one non-system message")

        payload: dict[str, Any] = {
            "model": model.model_id,
            "messages": messages,
            "stream": stream,
            # Anthropic requires max_tokens, so the SDK supplies a safe default.
            "max_tokens": request.max_tokens or 1024,
        }
        if system_prompt:
            payload["system"] = system_prompt
        if request.temperature is not None:
            payload["temperature"] = request.temperature
        if request.stop:
            payload["stop_sequences"] = request.stop
        return payload

    def _build_headers(
        self, *, model: ResolvedModel, context: ProviderRequestContext
    ) -> dict[str, str]:
        """Compose normalized headers for one Anthropic call.

        Args:
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A dictionary of HTTP headers.
        """
        api_key = model.provider_config.api_key
        if not api_key:
            raise AIConfigError(f"Provider '{model.provider}' does not have an API key configured")

        headers = {
            "x-api-key": api_key,
            "content-type": "application/json",
            **model.provider_config.default_headers,
        }
        if context.idempotency_key:
            headers["Idempotency-Key"] = context.idempotency_key
        return headers

    def _build_url(self, model: ResolvedModel, path: str) -> str:
        """Build an absolute Anthropic endpoint URL.

        Args:
            model: Resolved provider/model pair selected by the router.
            path: Provider-relative endpoint path.

        Returns:
            The absolute request URL.
        """
        return f"{model.provider_config.base_url.rstrip('/')}{path}"

    def _resolve_timeout(self, model: ResolvedModel, context: ProviderRequestContext) -> float:
        """Resolve the effective request timeout.

        Args:
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            The effective timeout expressed in seconds.
        """
        timeout_ms = context.timeout_ms or model.timeout_ms or self._default_timeout_ms
        return timeout_ms / 1000

    def _extract_request_id(self, response: httpx.Response) -> str | None:
        """Extract the Anthropic request id when present.

        Args:
            response: HTTP response returned by Anthropic.

        Returns:
            The provider request id if the header is present, otherwise ``None``.
        """
        return response.headers.get("request-id") or response.headers.get("x-request-id")

    def _extract_text(self, content_blocks: list[dict[str, Any]]) -> str:
        """Collect all text blocks from an Anthropic message response.

        Args:
            content_blocks: Raw Anthropic content blocks.

        Returns:
            The concatenated text emitted by the provider.
        """
        return "".join(
            block.get("text", "") for block in content_blocks if block.get("type") == "text"
        )

    def _extract_system_prompt(self, messages: list[TextMessage]) -> str | None:
        """Join all system messages into Anthropic's dedicated system field.

        Args:
            messages: Ordered SDK conversation messages.

        Returns:
            A joined system prompt string, or ``None`` when no system message exists.
        """
        system_messages = [message.content for message in messages if message.role == "system"]
        if not system_messages:
            return None
        return "\n\n".join(system_messages)

    def _map_message_role(self, role: str) -> str:
        """Map SDK roles to Anthropic message roles.

        Args:
            role: SDK message role.

        Returns:
            The Anthropic role string.
        """
        if role == "assistant":
            return "assistant"
        return "user"

    def _parse_usage(self, usage_payload: dict[str, Any] | None) -> AIUsage:
        """Normalize Anthropic usage payloads into the SDK usage structure.

        Args:
            usage_payload: Raw Anthropic usage payload.

        Returns:
            A normalized usage object.
        """
        if not usage_payload:
            return AIUsage()

        input_tokens = usage_payload.get("input_tokens", 0)
        output_tokens = usage_payload.get("output_tokens", 0)
        total_tokens = input_tokens + output_tokens
        return AIUsage.from_counts(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
        )

    def _merge_usage(self, usage: AIUsage, usage_delta: dict[str, Any] | None) -> AIUsage:
        """Merge cumulative stream usage updates into the current usage object.

        Args:
            usage: Usage accumulated so far.
            usage_delta: Partial usage payload emitted by a stream event.

        Returns:
            The updated normalized usage object.
        """
        if not usage_delta:
            return usage
        return AIUsage.from_counts(
            input_tokens=usage.input_tokens,
            output_tokens=usage_delta.get("output_tokens", usage.output_tokens),
            total_tokens=usage.input_tokens + usage_delta.get("output_tokens", usage.output_tokens),
        )

    def _map_finish_reason(self, finish_reason: str | None) -> AIFinishReason:
        """Normalize Anthropic finish reasons into stable SDK values.

        Args:
            finish_reason: Raw Anthropic stop reason.

        Returns:
            A normalized SDK finish reason.
        """
        if finish_reason == "max_tokens":
            return AIFinishReason.LENGTH
        if finish_reason == "tool_use":
            return AIFinishReason.TOOL_USE
        return AIFinishReason.STOP

    def _extract_error(self, response: httpx.Response) -> tuple[str | None, str]:
        """Extract an Anthropic error type and message from a response.

        Args:
            response: HTTP response returned by Anthropic.

        Returns:
            A tuple of ``(error_type, message)``.
        """
        try:
            payload = response.json()
        except ValueError:
            payload = None

        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                return error.get("type"), error.get("message", response.text)

        return None, response.text or f"Anthropic request failed with status {response.status_code}"

    def _build_error(
        self,
        *,
        error_type: str | None,
        message: str,
        http_status: int | None,
        model: ResolvedModel,
        partial_text: str | None = None,
    ) -> AIError:
        """Map Anthropic error metadata into a normalized SDK exception.

        Args:
            error_type: Anthropic-specific error code when present.
            message: Human-readable error message.
            http_status: HTTP status code associated with the failure.
            model: Resolved provider/model pair selected by the router.
            partial_text: Partial stream output captured before the failure.

        Returns:
            A normalized SDK exception instance.
        """
        if error_type in {"authentication_error", "permission_error"} or http_status in {401, 403}:
            return AIAuthError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        if error_type == "rate_limit_error" or http_status == 429:
            return AIRateLimitError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        if error_type in {"api_error", "overloaded_error"} or http_status == 529:
            return AIProviderUnavailableError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        if http_status in {408, 504}:
            return AITimeoutError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        if "policy" in message.lower() or "safety" in message.lower():
            return AIPolicyDeniedError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        if http_status is not None and http_status < 500:
            return AIValidationError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=http_status,
                partial_text=partial_text,
            )
        return AITransportError(
            message,
            provider=model.provider,
            model=model.model_id,
            http_status=http_status,
            partial_text=partial_text,
        )

    def _build_stream_error(
        self,
        *,
        payload_chunk: dict[str, Any],
        model: ResolvedModel,
        partial_text: str | None,
    ) -> AIError:
        """Convert an Anthropic stream error event into a normalized exception.

        Args:
            payload_chunk: Raw SSE payload decoded from JSON.
            model: Resolved provider/model pair selected by the router.
            partial_text: Partial stream output captured before the failure.

        Returns:
            A normalized SDK exception instance.
        """
        error_payload = payload_chunk.get("error", {})
        return self._build_error(
            error_type=error_payload.get("type"),
            message=error_payload.get("message", "Anthropic stream failed"),
            http_status=None,
            model=model,
            partial_text=partial_text,
        )
