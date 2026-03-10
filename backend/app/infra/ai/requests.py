"""Public request models for the internal AI SDK."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, field_validator

from app.core import ApiModel


class AIRequest(ApiModel):
    """Define fields shared by all SDK request types."""

    provider: str = Field(min_length=1)
    model: str = Field(min_length=1)
    timeout_ms: int | None = Field(default=None, ge=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None


class TextMessage(ApiModel):
    """Represent one conversational message for text generation."""

    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class TextGenerateRequest(AIRequest):
    """Capture a text generation request in provider-agnostic form."""

    messages: list[TextMessage] = Field(min_length=1)
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1)
    response_format: Literal["text", "json"] = "text"
    stop: list[str] | None = None


class EmbeddingRequest(AIRequest):
    """Capture a single or batch embedding request."""

    input: str | list[str]
    dimensions: int | None = Field(default=None, ge=1)

    @field_validator("input")
    @classmethod
    def validate_input(cls, value: str | list[str]) -> str | list[str]:
        """Reject empty embedding inputs early at SDK boundaries.

        Args:
            value: Raw embedding input provided by the caller.

        Returns:
            The validated input value.
        """
        if isinstance(value, str):
            if not value.strip():
                raise ValueError("Embedding input must not be empty")
            return value

        if not value:
            raise ValueError("Embedding batch input must not be empty")

        if any(not item.strip() for item in value):
            raise ValueError("Embedding batch input must not contain empty strings")

        return value


class ImageGenerateRequest(AIRequest):
    """Capture image generation parameters without leaking provider schemas."""

    prompt: str = Field(min_length=1)
    size: str = "1024x1024"
    count: int = Field(default=1, ge=1, le=10)
    format: str = "png"
    quality: str | None = None


class AudioGenerateRequest(AIRequest):
    """Capture text-to-audio generation parameters."""

    input_text: str = Field(min_length=1)
    voice: str = "alloy"
    format: str = "mp3"
    sample_rate: int | None = Field(default=None, ge=1)
    speed: float | None = Field(default=None, gt=0)
