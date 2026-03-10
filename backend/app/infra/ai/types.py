"""Core types used by the internal AI SDK."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from time import time
from typing import Any
from uuid import uuid4

from pydantic import Field, model_validator

from app.core import ApiModel


class AICapability(StrEnum):
    """Enumerate the stable capability groups exposed by the SDK."""

    TEXT_GENERATION = "text_gen"
    EMBEDDING = "embedding"
    IMAGE_GENERATION = "image_gen"
    AUDIO_GENERATION = "audio_gen"


class AIModality(StrEnum):
    """Enumerate supported input and output modalities."""

    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"


class AIFinishReason(StrEnum):
    """Normalize provider-specific finish reasons into stable SDK values."""

    STOP = "stop"
    LENGTH = "length"
    CONTENT_FILTER = "content_filter"
    TOOL_USE = "tool_use"
    ERROR = "error"
    CANCELLED = "cancelled"


class ArtifactKind(StrEnum):
    """Describe how a generated artifact is referenced."""

    BINARY = "binary"
    FILE = "file"
    URL = "url"


class AIUsage(ApiModel):
    """Represent token usage in a provider-agnostic format."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float | None = None

    @classmethod
    def from_counts(
        cls,
        input_tokens: int = 0,
        output_tokens: int = 0,
        total_tokens: int | None = None,
    ) -> AIUsage:
        """Build a usage object from normalized token counters.

        Args:
            input_tokens: Number of input or prompt tokens.
            output_tokens: Number of output or completion tokens.
            total_tokens: Optional total token count override.

        Returns:
            A normalized usage object.
        """
        normalized_total = (
            total_tokens if total_tokens is not None else input_tokens + output_tokens
        )
        return cls(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=normalized_total,
        )


class Artifact(ApiModel):
    """Store generated binary, file-based, or remote artifacts in one shape."""

    kind: ArtifactKind
    mime_type: str | None = None
    content: bytes | None = Field(default=None, repr=False)
    path: str | None = None
    url: str | None = None
    filename: str | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> Artifact:
        """Ensure the artifact contains exactly one reference source.

        Args:
            None.

        Returns:
            The validated artifact instance.
        """
        source_count = sum(
            source is not None
            for source in (
                self.content,
                self.path,
                self.url,
            )
        )
        if source_count != 1:
            raise ValueError("Artifact must include exactly one of content, path, or url")
        return self


class AttemptRecord(ApiModel):
    """Capture per-attempt execution metadata for observability and debugging."""

    attempt: int
    provider: str
    model: str
    alias: str | None = None
    success: bool = False
    latency_ms: int | None = None
    retry_index: int = 0
    error_type: str | None = None
    error_message: str | None = None
    provider_request_id: str | None = None


@dataclass(slots=True, frozen=True)
class ModelSpec:
    """Describe one routable model entry inside the registry."""

    alias: str
    provider: str
    model_id: str
    capabilities: tuple[AICapability, ...]
    input_modalities: tuple[AIModality, ...]
    output_modalities: tuple[AIModality, ...]
    supports_stream: bool = False
    supports_json: bool = False
    supports_vision: bool = False
    provider_options: dict[str, Any] = field(default_factory=dict)

    def supports(self, capability: AICapability) -> bool:
        """Return whether the model advertises the requested capability.

        Args:
            capability: Capability required by the caller.

        Returns:
            ``True`` when the model advertises the given capability.
        """
        return capability in self.capabilities


@dataclass(slots=True, frozen=True)
class ProviderConfig:
    """Carry provider runtime configuration injected by application settings."""

    name: str
    api_key: str | None
    base_url: str
    timeout_ms: int
    max_retries: int
    backoff_base_ms: int
    default_headers: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class ResolvedModel:
    """Combine a routed model spec with the provider runtime configuration."""

    spec: ModelSpec
    provider_config: ProviderConfig

    @property
    def alias(self) -> str:
        """Expose the logical alias used by the model registry.

        Args:
            None.

        Returns:
            The logical alias registered for the model.
        """
        return self.spec.alias

    @property
    def provider(self) -> str:
        """Expose the resolved provider name.

        Args:
            None.

        Returns:
            The provider name configured for the route.
        """
        return self.spec.provider

    @property
    def model_id(self) -> str:
        """Expose the concrete provider model identifier.

        Args:
            None.

        Returns:
            The concrete provider model id.
        """
        return self.spec.model_id

    @property
    def timeout_ms(self) -> int:
        """Expose the effective default timeout for this route.

        Args:
            None.

        Returns:
            The default timeout in milliseconds.
        """
        return self.provider_config.timeout_ms

    @property
    def max_retries(self) -> int:
        """Expose the effective retry budget for this route.

        Args:
            None.

        Returns:
            The maximum number of retries allowed for the route.
        """
        return self.provider_config.max_retries


@dataclass(slots=True)
class ProviderRequestContext:
    """Store per-call runtime context shared with provider adapters."""

    request_id: str = field(default_factory=lambda: uuid4().hex)
    timeout_ms: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    idempotency_key: str | None = None
    started_at_ms: int = field(default_factory=lambda: int(time() * 1000))
