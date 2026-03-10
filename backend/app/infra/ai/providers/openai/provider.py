"""OpenAI-compatible provider adapter backed by raw HTTPX requests."""

from __future__ import annotations

import asyncio
import base64
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
from ...requests import (
    AudioGenerateRequest,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
)
from ...responses import (
    AudioGenerateResponse,
    EmbeddingResponse,
    ImageGenerateResponse,
    TextGenerateResponse,
)
from ...stream import (
    AIDoneEvent,
    AIStartEvent,
    AITextDeltaEvent,
    AITextEndEvent,
    AITextStartEvent,
    AIUsageEvent,
)
from ...types import (
    AIFinishReason,
    AIUsage,
    Artifact,
    ArtifactKind,
    ProviderRequestContext,
    ResolvedModel,
)
from ..base import ProviderAdapter


class OpenAICompatibleProviderAdapter(ProviderAdapter):
    """Talk to OpenAI-compatible APIs through stable SDK interfaces."""

    def __init__(
        self,
        *,
        default_timeout_ms: int,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        """Create the adapter with an injectable HTTPX client for testing.

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
        """Generate a complete text response from ``/chat/completions``.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized text generation response.
        """
        started_at = perf_counter()
        payload = self._build_chat_payload(request=request, model=model, stream=False)
        response = await self._request(
            "POST",
            "/chat/completions",
            model=model,
            context=context,
            json_body=payload,
        )
        body = response.json()
        choice = body["choices"][0]
        message = choice.get("message", {})
        text = message.get("content", "") or ""
        usage = self._parse_usage(body.get("usage"))
        provider_request_id = self._extract_request_id(response)
        latency_ms = int((perf_counter() - started_at) * 1000)
        return TextGenerateResponse(
            request_id=context.request_id,
            provider_request_id=provider_request_id,
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=latency_ms,
            usage=usage,
            text=text,
            finish_reason=self._map_finish_reason(choice.get("finish_reason")),
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
        """Stream text output from ``/chat/completions`` using normalized SDK events.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            An async iterator of normalized stream events.
        """
        payload = self._build_chat_payload(request=request, model=model, stream=True)
        payload["stream_options"] = {"include_usage": True}

        accumulated_text = ""
        usage = AIUsage()
        text_started = False
        finish_reason = AIFinishReason.STOP
        provider_request_id: str | None = None

        try:
            async with self._client.stream(
                "POST",
                self._build_url(model, "/chat/completions"),
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
                    if message == "[DONE]":
                        break

                    chunk = json.loads(message)
                    if chunk.get("usage"):
                        usage = self._parse_usage(chunk.get("usage"))
                        yield AIUsageEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            usage=usage,
                        )

                    choices = chunk.get("choices") or []
                    if not choices:
                        continue

                    choice = choices[0]
                    delta = choice.get("delta", {})
                    content_delta = delta.get("content") or ""

                    if content_delta and not text_started:
                        text_started = True
                        yield AITextStartEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                        )

                    if content_delta:
                        accumulated_text += content_delta
                        yield AITextDeltaEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            delta=content_delta,
                            text=accumulated_text,
                        )

                    if choice.get("finish_reason"):
                        finish_reason = self._map_finish_reason(choice.get("finish_reason"))

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
                "Text streaming was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except AIError:
            raise
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Provider text stream timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Provider text stream transport failed",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except Exception as exc:
            raise AIProviderUnavailableError(
                "Provider text stream failed unexpectedly",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc

    async def embed(
        self,
        request: EmbeddingRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> EmbeddingResponse:
        """Generate embeddings from ``/embeddings``.

        Args:
            request: Normalized SDK embedding request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized embedding response.
        """
        started_at = perf_counter()
        payload: dict[str, Any] = {
            "model": model.model_id,
            "input": request.input,
        }
        if request.dimensions is not None:
            payload["dimensions"] = request.dimensions

        response = await self._request(
            "POST",
            "/embeddings",
            model=model,
            context=context,
            json_body=payload,
        )
        body = response.json()
        vectors = [item["embedding"] for item in body.get("data", [])]
        dimensions = len(vectors[0]) if vectors else 0
        if any(len(vector) != dimensions for vector in vectors):
            raise AIProviderUnavailableError(
                "Provider returned inconsistent embedding dimensions",
                provider=model.provider,
                model=model.model_id,
            )

        return EmbeddingResponse(
            request_id=context.request_id,
            provider_request_id=self._extract_request_id(response),
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=self._parse_usage(body.get("usage")),
            vectors=vectors,
            dimensions=dimensions,
        )

    async def generate_image(
        self,
        request: ImageGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> ImageGenerateResponse:
        """Generate images from ``/images/generations``.

        Args:
            request: Normalized SDK image generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized image generation response.
        """
        started_at = perf_counter()
        payload: dict[str, Any] = {
            "model": model.model_id,
            "prompt": request.prompt,
            "n": request.count,
            "size": request.size,
            "response_format": "b64_json",
            "output_format": request.format,
        }
        if request.quality is not None:
            payload["quality"] = request.quality

        response = await self._request(
            "POST",
            "/images/generations",
            model=model,
            context=context,
            json_body=payload,
        )
        body = response.json()
        artifacts = self._parse_image_artifacts(
            body.get("data", []), default_mime_type=f"image/{request.format}"
        )
        mime_type = artifacts[0].mime_type if artifacts else None

        return ImageGenerateResponse(
            request_id=context.request_id,
            provider_request_id=self._extract_request_id(response),
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=self._parse_usage(body.get("usage")),
            artifacts=artifacts,
            mime_type=mime_type,
        )

    async def generate_audio(
        self,
        request: AudioGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> AudioGenerateResponse:
        """Generate audio from ``/audio/speech``.

        Args:
            request: Normalized SDK audio generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized audio generation response.
        """
        started_at = perf_counter()
        payload: dict[str, Any] = {
            "model": model.model_id,
            "input": request.input_text,
            "voice": request.voice,
            "response_format": request.format,
        }
        if request.speed is not None:
            payload["speed"] = request.speed
        if request.sample_rate is not None:
            payload["sample_rate"] = request.sample_rate

        response = await self._request(
            "POST",
            "/audio/speech",
            model=model,
            context=context,
            json_body=payload,
        )
        mime_type = response.headers.get(
            "content-type", self._guess_audio_mime_type(request.format)
        )
        artifact = Artifact(
            kind=ArtifactKind.BINARY,
            content=response.content,
            mime_type=mime_type,
            filename=f"{context.request_id}.{request.format}",
        )
        return AudioGenerateResponse(
            request_id=context.request_id,
            provider_request_id=self._extract_request_id(response),
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=AIUsage(),
            artifacts=[artifact],
            mime_type=mime_type,
            duration_ms=None,
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        model: ResolvedModel,
        context: ProviderRequestContext,
        json_body: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Send one JSON request and normalize transport and HTTP errors.

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
                "Provider request was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Provider request timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Provider transport request failed",
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
        """Map one error response into the stable SDK error hierarchy.

        Args:
            response: HTTP response returned by the provider.
            model: Resolved provider/model pair selected by the router.

        Returns:
            None.
        """
        error_type, message = self._extract_error(response)
        provider = model.provider
        model_id = model.model_id
        status_code = response.status_code

        if status_code in (401, 403):
            raise AIAuthError(message, provider=provider, model=model_id, http_status=status_code)
        if status_code == 429:
            raise AIRateLimitError(
                message, provider=provider, model=model_id, http_status=status_code
            )
        if status_code in (408, 504):
            raise AITimeoutError(
                message, provider=provider, model=model_id, http_status=status_code
            )
        if status_code in (400, 404, 409, 422):
            if "policy" in message.lower() or "safety" in message.lower():
                raise AIPolicyDeniedError(
                    message,
                    provider=provider,
                    model=model_id,
                    http_status=status_code,
                )
            raise AIValidationError(
                message, provider=provider, model=model_id, http_status=status_code
            )
        if 500 <= status_code < 600:
            raise AIProviderUnavailableError(
                message,
                provider=provider,
                model=model_id,
                http_status=status_code,
            )
        raise AITransportError(message, provider=provider, model=model_id, http_status=status_code)

    def _build_chat_payload(
        self,
        *,
        request: TextGenerateRequest,
        model: ResolvedModel,
        stream: bool,
    ) -> dict[str, Any]:
        """Translate the stable text request into a chat-completions payload.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            stream: Whether the provider should return SSE events.

        Returns:
            A JSON-serializable payload accepted by the chat-completions API.
        """
        payload: dict[str, Any] = {
            "model": model.model_id,
            "messages": [
                {"role": message.role, "content": message.content} for message in request.messages
            ],
            "stream": stream,
        }
        if request.temperature is not None:
            payload["temperature"] = request.temperature
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        if request.stop:
            payload["stop"] = request.stop
        if request.response_format == "json":
            payload["response_format"] = {"type": "json_object"}
        return payload

    def _build_headers(
        self, *, model: ResolvedModel, context: ProviderRequestContext
    ) -> dict[str, str]:
        """Compose normalized headers for one provider call.

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
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            **model.provider_config.default_headers,
        }
        if context.idempotency_key:
            headers["Idempotency-Key"] = context.idempotency_key
        return headers

    def _build_url(self, model: ResolvedModel, path: str) -> str:
        """Build an absolute request URL from the provider base URL and endpoint path.

        Args:
            model: Resolved provider/model pair selected by the router.
            path: Provider-relative endpoint path.

        Returns:
            The absolute request URL.
        """
        return f"{model.provider_config.base_url.rstrip('/')}{path}"

    def _resolve_timeout(self, model: ResolvedModel, context: ProviderRequestContext) -> float:
        """Resolve the effective timeout for a provider call.

        Args:
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            The effective timeout expressed in seconds.
        """
        timeout_ms = context.timeout_ms or model.timeout_ms or self._default_timeout_ms
        return timeout_ms / 1000

    def _extract_request_id(self, response: httpx.Response) -> str | None:
        """Extract a provider request id from standard response headers when available.

        Args:
            response: HTTP response returned by the provider.

        Returns:
            The provider request id if the header is present, otherwise ``None``.
        """
        return response.headers.get("x-request-id") or response.headers.get("request-id")

    def _parse_usage(self, usage_payload: dict[str, Any] | None) -> AIUsage:
        """Normalize provider usage payloads into the SDK usage structure.

        Args:
            usage_payload: Raw provider usage payload.

        Returns:
            A normalized usage object.
        """
        if not usage_payload:
            return AIUsage()
        return AIUsage.from_counts(
            input_tokens=usage_payload.get("prompt_tokens", 0),
            output_tokens=usage_payload.get("completion_tokens", 0),
            total_tokens=usage_payload.get("total_tokens"),
        )

    def _map_finish_reason(self, finish_reason: str | None) -> AIFinishReason:
        """Normalize provider finish reasons into stable SDK values.

        Args:
            finish_reason: Raw provider finish reason.

        Returns:
            A normalized SDK finish reason.
        """
        if finish_reason == "length":
            return AIFinishReason.LENGTH
        if finish_reason == "content_filter":
            return AIFinishReason.CONTENT_FILTER
        return AIFinishReason.STOP

    def _extract_error(self, response: httpx.Response) -> tuple[str | None, str]:
        """Extract a provider error code and message from JSON or text responses.

        Args:
            response: HTTP response returned by the provider.

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

        return None, response.text or f"Provider request failed with status {response.status_code}"

    def _parse_image_artifacts(
        self,
        items: list[dict[str, Any]],
        *,
        default_mime_type: str,
    ) -> list[Artifact]:
        """Normalize image generation results into SDK artifacts.

        Args:
            items: Raw provider image result items.
            default_mime_type: MIME type inferred from the request format.

        Returns:
            A list of normalized image artifacts.
        """
        artifacts: list[Artifact] = []
        for index, item in enumerate(items, start=1):
            if item.get("b64_json"):
                artifacts.append(
                    Artifact(
                        kind=ArtifactKind.BINARY,
                        content=base64.b64decode(item["b64_json"]),
                        mime_type=default_mime_type,
                        filename=f"image-{index}",
                    )
                )
                continue

            if item.get("url"):
                artifacts.append(
                    Artifact(
                        kind=ArtifactKind.URL,
                        url=item["url"],
                        mime_type=default_mime_type,
                        filename=f"image-{index}",
                    )
                )

        return artifacts

    def _guess_audio_mime_type(self, output_format: str) -> str:
        """Best-effort map a response format string to a MIME type.

        Args:
            output_format: Provider-specific audio format string.

        Returns:
            The best-effort MIME type.
        """
        return {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "opus": "audio/opus",
            "aac": "audio/aac",
            "flac": "audio/flac",
        }.get(output_format, "application/octet-stream")
