"""OpenTelemetry instrumentation helpers for the internal AI SDK."""

from __future__ import annotations

from contextlib import AbstractContextManager
from typing import Any

from opentelemetry import metrics, trace
from opentelemetry.trace import Status, StatusCode

from .config import AISettings
from .exceptions import AIError
from .responses import AIResponse
from .types import AIUsage, ResolvedModel


class AITelemetry:
    """Encapsulate tracing, metrics, and optional content recording for AI calls."""

    def __init__(self, settings: AISettings) -> None:
        """Initialize no-op-safe OpenTelemetry primitives for AI instrumentation.

        Args:
            settings: AI SDK configuration that controls content recording behavior.

        Returns:
            None.
        """
        self._settings = settings
        self._tracer = trace.get_tracer("app.infra.ai")
        self._meter = metrics.get_meter("app.infra.ai")
        self._request_counter = self._meter.create_counter("ai.request.count")
        self._failure_counter = self._meter.create_counter("ai.request.failure.count")
        self._latency_histogram = self._meter.create_histogram("ai.request.latency.ms")
        self._input_token_counter = self._meter.create_counter("ai.request.input_tokens")
        self._output_token_counter = self._meter.create_counter("ai.request.output_tokens")

    def start_request_span(
        self,
        *,
        operation_name: str,
        request_id: str,
        model_label: str,
        capability: str,
    ) -> AbstractContextManager[Any]:
        """Start the top-level span for a single SDK request.

        Args:
            operation_name: Logical SDK operation name such as ``text.generate``.
            request_id: Stable SDK request id.
            model_label: Human-readable model label used for telemetry.
            capability: Capability name associated with the operation.

        Returns:
            A context manager that activates the request span.
        """
        attributes = {
            "ai.operation_name": operation_name,
            "ai.request_id": request_id,
            "ai.model_label": model_label,
            "ai.capability": capability,
            "gen_ai.operation.name": operation_name,
        }
        return self._tracer.start_as_current_span("ai.request", attributes=attributes)

    def start_attempt_span(
        self,
        *,
        operation_name: str,
        request_id: str,
        model: ResolvedModel,
        attempt: int,
        retry_index: int,
    ) -> AbstractContextManager[Any]:
        """Start the per-provider-attempt span.

        Args:
            operation_name: Logical SDK operation name such as ``text.generate``.
            request_id: Stable SDK request id.
            model: Resolved provider/model pair selected by the router.
            attempt: One-based execution attempt index.
            retry_index: Zero-based technical retry index on the same route.

        Returns:
            A context manager that activates the attempt span.
        """
        attributes = {
            "ai.operation_name": operation_name,
            "ai.request_id": request_id,
            "ai.provider": model.provider,
            "ai.model": model.model_id,
            "ai.attempt": attempt,
            "ai.retry_index": retry_index,
            "gen_ai.request.model": model.model_id,
            "gen_ai.system": model.provider,
        }
        return self._tracer.start_as_current_span("ai.provider.attempt", attributes=attributes)

    def record_success(self, *, operation_name: str, response: AIResponse) -> None:
        """Record success metrics for a completed request.

        Args:
            operation_name: Logical SDK operation name such as ``text.generate``.
            response: Final normalized SDK response.

        Returns:
            None.
        """
        attributes = {
            "operation_name": operation_name,
            "provider": response.provider,
            "model": response.model,
        }
        self._request_counter.add(1, attributes)
        self._latency_histogram.record(response.latency_ms, attributes)
        self._record_usage(response.usage, attributes)

    def record_failure(
        self,
        *,
        operation_name: str,
        provider: str | None,
        model: str | None,
        error: AIError,
        latency_ms: int | None = None,
    ) -> None:
        """Record failure metrics for a request or attempt.

        Args:
            operation_name: Logical SDK operation name such as ``text.generate``.
            provider: Optional provider associated with the failure.
            model: Optional model associated with the failure.
            error: Normalized SDK exception raised by the operation.
            latency_ms: Optional latency captured before the failure.

        Returns:
            None.
        """
        attributes = {
            "operation_name": operation_name,
            "provider": provider or "unknown",
            "model": model or "unknown",
            "error_type": error.__class__.__name__,
        }
        self._failure_counter.add(1, attributes)
        if latency_ms is not None:
            self._latency_histogram.record(latency_ms, attributes)

    def enrich_success_span(self, span: Any, response: AIResponse) -> None:
        """Attach normalized response metadata to an open span.

        Args:
            span: Active OpenTelemetry span to enrich.
            response: Final normalized SDK response.

        Returns:
            None.
        """
        span.set_attribute("ai.provider", response.provider)
        span.set_attribute("ai.model", response.model)
        span.set_attribute("ai.request_id", response.request_id)
        span.set_attribute("ai.latency_ms", response.latency_ms)
        span.set_attribute("ai.attempt_count", response.attempt_count)
        span.set_attribute("ai.finish_reason", getattr(response, "finish_reason", None) or "n/a")
        span.set_attribute("ai.input_tokens", response.usage.input_tokens)
        span.set_attribute("ai.output_tokens", response.usage.output_tokens)
        span.set_status(Status(StatusCode.OK))

        if self._settings.record_content:
            output_preview = getattr(response, "text", None)
            if output_preview:
                span.add_event(
                    "ai.output.preview",
                    {"preview": self._sanitize_content(output_preview)},
                )

    def enrich_error_span(self, span: Any, error: AIError) -> None:
        """Attach normalized error metadata to an open span.

        Args:
            span: Active OpenTelemetry span to enrich.
            error: Normalized SDK exception raised by the operation.

        Returns:
            None.
        """
        span.set_attribute("error.type", error.__class__.__name__)
        span.set_attribute("ai.error_code", error.error_code)
        span.set_attribute("ai.retryable", error.retryable)
        span.set_status(Status(StatusCode.ERROR, error.message))

        if self._settings.record_content and error.partial_text:
            span.add_event(
                "ai.partial_output.preview",
                {"preview": self._sanitize_content(error.partial_text)},
            )

    def record_request_preview(self, span: Any, prompt_preview: str | None) -> None:
        """Optionally record a sanitized prompt preview on the current span.

        Args:
            span: Active OpenTelemetry span to enrich.
            prompt_preview: Sanitized or truncated prompt preview text.

        Returns:
            None.
        """
        if not self._settings.record_content or not prompt_preview:
            return

        span.add_event("ai.prompt.preview", {"preview": self._sanitize_content(prompt_preview)})

    def _record_usage(self, usage: AIUsage, attributes: dict[str, Any]) -> None:
        """Emit token metrics when usage information is available.

        Args:
            usage: Normalized usage object attached to the response.
            attributes: Metric attribute set attached to the datapoints.

        Returns:
            None.
        """
        self._input_token_counter.add(usage.input_tokens, attributes)
        self._output_token_counter.add(usage.output_tokens, attributes)

    def _sanitize_content(self, content: str) -> str:
        """Trim content previews before writing them to telemetry.

        Args:
            content: Prompt or output preview text.

        Returns:
            The truncated preview string.
        """
        return content[: self._settings.content_preview_chars]
