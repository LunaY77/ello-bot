"""Gemini provider adapter backed by raw HTTPX requests."""

from __future__ import annotations

import asyncio
import base64
import json
from collections.abc import AsyncIterator
from math import gcd
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
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
    TextMessage,
)
from ...responses import EmbeddingResponse, ImageGenerateResponse, TextGenerateResponse
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


class GeminiProviderAdapter(ProviderAdapter):
    """Talk to Gemini REST APIs through stable SDK interfaces."""

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
        """Generate a complete text response through Gemini's content API.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized text generation response.
        """
        started_at = perf_counter()
        payload = self._build_generate_content_payload(request)
        response = await self._request(
            "POST",
            self._build_model_path(model, "generateContent"),
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
            usage=self._parse_usage(body.get("usageMetadata")),
            text=self._extract_text(body),
            finish_reason=self._map_finish_reason(self._first_candidate(body).get("finishReason")),
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
        """Stream normalized text events from Gemini SSE responses.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            An async iterator of normalized stream events.
        """
        payload = self._build_generate_content_payload(request)
        accumulated_text = ""
        usage = AIUsage()
        text_started = False
        finish_reason = AIFinishReason.STOP
        provider_request_id: str | None = None

        try:
            async with self._client.stream(
                "POST",
                self._build_url(model, self._build_model_path(model, "streamGenerateContent")),
                params={"alt": "sse"},
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
                    candidate = self._first_candidate(payload_chunk)
                    parts = candidate.get("content", {}).get("parts", [])
                    delta_text = "".join(part.get("text", "") for part in parts if part.get("text"))

                    if delta_text and not text_started:
                        text_started = True
                        yield AITextStartEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                        )

                    if delta_text:
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

                    if payload_chunk.get("usageMetadata"):
                        usage = self._parse_usage(payload_chunk.get("usageMetadata"))
                        yield AIUsageEvent(
                            request_id=context.request_id,
                            provider=model.provider,
                            model=model.model_id,
                            attempt=0,
                            provider_request_id=provider_request_id,
                            usage=usage,
                        )

                    if candidate.get("finishReason"):
                        finish_reason = self._map_finish_reason(candidate.get("finishReason"))

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
                "Gemini text streaming was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except AIError:
            raise
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Gemini text stream timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Gemini text stream transport failed",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
                partial_text=accumulated_text or None,
            ) from exc
        except Exception as exc:
            raise AIProviderUnavailableError(
                "Gemini text stream failed unexpectedly",
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
        """Generate embeddings through Gemini's embedding API.

        Args:
            request: Normalized SDK embedding request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized embedding response.
        """
        started_at = perf_counter()
        inputs = [request.input] if isinstance(request.input, str) else request.input

        vectors: list[list[float]] = []
        total_usage = AIUsage()
        provider_request_ids: list[str] = []

        # Gemini's public REST examples focus on one input per request, so the SDK
        # batches at the orchestration layer while still returning a single response.
        for item in inputs:
            payload = self._build_embedding_payload(text=item, dimensions=request.dimensions)
            response = await self._request(
                "POST",
                self._build_model_path(model, "embedContent"),
                model=model,
                context=context,
                json_body=payload,
            )
            body = response.json()
            embedding = body.get("embedding", {}).get("values", [])
            vectors.append(embedding)

            provider_request_id = self._extract_request_id(response)
            if provider_request_id:
                provider_request_ids.append(provider_request_id)

            usage = self._parse_usage(body.get("usageMetadata"))
            total_usage = AIUsage.from_counts(
                input_tokens=total_usage.input_tokens + usage.input_tokens,
                output_tokens=total_usage.output_tokens + usage.output_tokens,
                total_tokens=total_usage.total_tokens + usage.total_tokens,
            )

        dimensions = len(vectors[0]) if vectors else 0
        if any(len(vector) != dimensions for vector in vectors):
            raise AIProviderUnavailableError(
                "Gemini returned inconsistent embedding dimensions",
                provider=model.provider,
                model=model.model_id,
            )

        return EmbeddingResponse(
            request_id=context.request_id,
            provider_request_id=provider_request_ids[0] if len(provider_request_ids) == 1 else None,
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=total_usage,
            vectors=vectors,
            dimensions=dimensions,
        )

    async def generate_image(
        self,
        request: ImageGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> ImageGenerateResponse:
        """Generate images through Gemini image-capable models.

        Args:
            request: Normalized SDK image generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized image generation response.
        """
        started_at = perf_counter()
        payload = self._build_image_payload(request)
        response = await self._request(
            "POST",
            self._build_model_path(model, "generateContent"),
            model=model,
            context=context,
            json_body=payload,
        )
        body = response.json()
        artifacts = self._parse_image_artifacts(body)
        mime_type = artifacts[0].mime_type if artifacts else None

        return ImageGenerateResponse(
            request_id=context.request_id,
            provider_request_id=self._extract_request_id(response),
            provider=model.provider,
            model=model.model_id,
            resolved_provider=model.provider,
            resolved_model=model.model_id,
            latency_ms=int((perf_counter() - started_at) * 1000),
            usage=self._parse_usage(body.get("usageMetadata")),
            artifacts=artifacts,
            mime_type=mime_type,
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
                "Gemini request was cancelled",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.TimeoutException as exc:
            raise AITimeoutError(
                "Gemini request timed out",
                provider=model.provider,
                model=model.model_id,
                raw_error=exc,
            ) from exc
        except httpx.HTTPError as exc:
            raise AITransportError(
                "Gemini transport request failed",
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
        """Map one Gemini error response into the stable SDK hierarchy.

        Args:
            response: HTTP response returned by Gemini.
            model: Resolved provider/model pair selected by the router.

        Returns:
            None.
        """
        error_type, message = self._extract_error(response)
        status_code = response.status_code

        if status_code in {401, 403}:
            raise AIAuthError(
                message, provider=model.provider, model=model.model_id, http_status=status_code
            )
        if status_code == 429:
            raise AIRateLimitError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=status_code,
            )
        if status_code in {408, 504}:
            raise AITimeoutError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=status_code,
            )
        if "policy" in message.lower() or "safety" in message.lower() or error_type == "SAFETY":
            raise AIPolicyDeniedError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=status_code,
            )
        if status_code < 500:
            raise AIValidationError(
                message,
                provider=model.provider,
                model=model.model_id,
                http_status=status_code,
            )
        raise AIProviderUnavailableError(
            message,
            provider=model.provider,
            model=model.model_id,
            http_status=status_code,
        )

    def _build_generate_content_payload(self, request: TextGenerateRequest) -> dict[str, Any]:
        """Translate the stable text request into Gemini's generateContent payload.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            A JSON-serializable payload accepted by Gemini.
        """
        payload: dict[str, Any] = {
            "contents": self._build_contents(request.messages),
        }
        generation_config: dict[str, Any] = {}
        if request.temperature is not None:
            generation_config["temperature"] = request.temperature
        if request.max_tokens is not None:
            generation_config["maxOutputTokens"] = request.max_tokens
        if request.response_format == "json":
            generation_config["responseMimeType"] = "application/json"
        if request.stop:
            generation_config["stopSequences"] = request.stop
        if generation_config:
            payload["generationConfig"] = generation_config

        system_prompt = self._extract_system_prompt(request.messages)
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        return payload

    def _build_embedding_payload(self, *, text: str, dimensions: int | None) -> dict[str, Any]:
        """Translate one SDK embedding item into Gemini's embedContent payload.

        Args:
            text: Plain-text input to embed.
            dimensions: Optional target embedding dimensions.

        Returns:
            A JSON-serializable payload accepted by Gemini.
        """
        payload: dict[str, Any] = {"content": {"parts": [{"text": text}]}}
        if dimensions is not None:
            payload["outputDimensionality"] = dimensions
        return payload

    def _build_image_payload(self, request: ImageGenerateRequest) -> dict[str, Any]:
        """Translate the stable image request into Gemini's image payload.

        Args:
            request: Normalized SDK image generation request.

        Returns:
            A JSON-serializable payload accepted by Gemini image-capable models.
        """
        image_config: dict[str, Any] = {}
        aspect_ratio = self._size_to_aspect_ratio(request.size)
        if aspect_ratio is not None:
            image_config["aspectRatio"] = aspect_ratio

        generation_config: dict[str, Any] = {
            "responseModalities": ["TEXT", "IMAGE"],
            "candidateCount": request.count,
        }
        if image_config:
            generation_config["imageConfig"] = image_config

        return {
            "contents": [{"role": "user", "parts": [{"text": request.prompt}]}],
            "generationConfig": generation_config,
        }

    def _build_contents(self, messages: list[TextMessage]) -> list[dict[str, Any]]:
        """Convert SDK chat messages into Gemini content entries.

        Args:
            messages: Ordered SDK conversation messages.

        Returns:
            A list of Gemini content entries.
        """
        contents = [
            {
                "role": self._map_message_role(message.role),
                "parts": [{"text": message.content}],
            }
            for message in messages
            if message.role != "system"
        ]
        if not contents:
            raise AIValidationError("Gemini requires at least one non-system message")
        return contents

    def _extract_system_prompt(self, messages: list[TextMessage]) -> str | None:
        """Join all system messages into Gemini's dedicated system instruction.

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
        """Map SDK roles to Gemini content roles.

        Args:
            role: SDK message role.

        Returns:
            The Gemini role string.
        """
        if role == "assistant":
            return "model"
        return "user"

    def _build_model_path(self, model: ResolvedModel, action: str) -> str:
        """Build the model-relative Gemini REST path.

        Args:
            model: Resolved provider/model pair selected by the router.
            action: Gemini action suffix such as ``generateContent``.

        Returns:
            A provider-relative path starting with ``/models/``.
        """
        model_name = model.model_id.removeprefix("models/")
        return f"/models/{model_name}:{action}"

    def _build_headers(
        self, *, model: ResolvedModel, context: ProviderRequestContext
    ) -> dict[str, str]:
        """Compose normalized headers for one Gemini call.

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
            "x-goog-api-key": api_key,
            "content-type": "application/json",
            **model.provider_config.default_headers,
        }
        if context.idempotency_key:
            headers["Idempotency-Key"] = context.idempotency_key
        return headers

    def _build_url(self, model: ResolvedModel, path: str) -> str:
        """Build an absolute Gemini endpoint URL.

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
        """Extract the Gemini request id when present.

        Args:
            response: HTTP response returned by Gemini.

        Returns:
            The provider request id if the header is present, otherwise ``None``.
        """
        return response.headers.get("x-request-id") or response.headers.get("request-id")

    def _first_candidate(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Return the first Gemini candidate object or an empty mapping.

        Args:
            payload: Raw Gemini response payload.

        Returns:
            The first candidate dictionary.
        """
        candidates = payload.get("candidates") or []
        return candidates[0] if candidates else {}

    def _extract_text(self, payload: dict[str, Any]) -> str:
        """Collect all text parts from the first Gemini candidate.

        Args:
            payload: Raw Gemini response payload.

        Returns:
            The concatenated text emitted by the provider.
        """
        candidate = self._first_candidate(payload)
        parts = candidate.get("content", {}).get("parts", [])
        return "".join(part.get("text", "") for part in parts if part.get("text"))

    def _parse_usage(self, usage_payload: dict[str, Any] | None) -> AIUsage:
        """Normalize Gemini usage payloads into the SDK usage structure.

        Args:
            usage_payload: Raw Gemini usage payload.

        Returns:
            A normalized usage object.
        """
        if not usage_payload:
            return AIUsage()

        input_tokens = usage_payload.get("promptTokenCount", 0)
        output_tokens = usage_payload.get("candidatesTokenCount", 0) + usage_payload.get(
            "thoughtsTokenCount",
            0,
        )
        return AIUsage.from_counts(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=usage_payload.get("totalTokenCount"),
        )

    def _map_finish_reason(self, finish_reason: str | None) -> AIFinishReason:
        """Normalize Gemini finish reasons into stable SDK values.

        Args:
            finish_reason: Raw Gemini finish reason.

        Returns:
            A normalized SDK finish reason.
        """
        normalized = (finish_reason or "").upper()
        if normalized in {"MAX_TOKENS", "MAX_TOKENS_FINISHED"}:
            return AIFinishReason.LENGTH
        if normalized in {"SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"}:
            return AIFinishReason.CONTENT_FILTER
        return AIFinishReason.STOP

    def _extract_error(self, response: httpx.Response) -> tuple[str | None, str]:
        """Extract a Gemini error code and message from a response.

        Args:
            response: HTTP response returned by Gemini.

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
                return error.get("status"), error.get("message", response.text)

        return None, response.text or f"Gemini request failed with status {response.status_code}"

    def _parse_image_artifacts(self, payload: dict[str, Any]) -> list[Artifact]:
        """Collect image parts from Gemini candidates into SDK artifacts.

        Args:
            payload: Raw Gemini response payload.

        Returns:
            A list of normalized image artifacts.
        """
        artifacts: list[Artifact] = []
        for candidate_index, candidate in enumerate(payload.get("candidates", []), start=1):
            parts = candidate.get("content", {}).get("parts", [])
            for part_index, part in enumerate(parts, start=1):
                inline_data = part.get("inlineData") or {}
                if not inline_data.get("data"):
                    continue

                # Gemini image responses inline base64 image data inside the content parts.
                artifacts.append(
                    Artifact(
                        kind=ArtifactKind.BINARY,
                        content=base64.b64decode(inline_data["data"]),
                        mime_type=inline_data.get("mimeType", "image/png"),
                        filename=f"gemini-image-{candidate_index}-{part_index}",
                    )
                )
        return artifacts

    def _size_to_aspect_ratio(self, size: str) -> str | None:
        """Convert a ``WIDTHxHEIGHT`` string into a Gemini aspect ratio.

        Args:
            size: SDK image size string such as ``1024x1024``.

        Returns:
            A reduced ratio string like ``1:1``, or ``None`` when parsing fails.
        """
        try:
            width_raw, height_raw = size.lower().split("x", maxsplit=1)
            width = int(width_raw)
            height = int(height_raw)
        except (TypeError, ValueError):
            return None

        if width <= 0 or height <= 0:
            return None

        divisor = gcd(width, height)
        return f"{width // divisor}:{height // divisor}"
