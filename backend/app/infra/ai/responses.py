"""Public response models for the internal AI SDK."""

from __future__ import annotations

from pydantic import Field

from app.core import ApiModel

from .types import AIFinishReason, AIUsage, Artifact, AttemptRecord


class AIResponse(ApiModel):
    """Define fields shared by all SDK response types."""

    request_id: str
    provider_request_id: str | None = None
    provider: str
    model: str
    resolved_provider: str
    resolved_model: str
    latency_ms: int
    usage: AIUsage = Field(default_factory=AIUsage)
    attempt_count: int = 1
    attempts: list[AttemptRecord] = Field(default_factory=list)


class TextGenerateResponse(AIResponse):
    """Return a normalized text generation result."""

    text: str
    finish_reason: AIFinishReason


class EmbeddingResponse(AIResponse):
    """Return a normalized embedding result."""

    vectors: list[list[float]]
    dimensions: int


class ImageGenerateResponse(AIResponse):
    """Return normalized image artifacts."""

    artifacts: list[Artifact]
    mime_type: str | None = None


class AudioGenerateResponse(AIResponse):
    """Return normalized audio artifacts."""

    artifacts: list[Artifact]
    mime_type: str | None = None
    duration_ms: int | None = None
