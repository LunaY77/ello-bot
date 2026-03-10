"""Configuration models for the internal AI SDK."""

from __future__ import annotations

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AIProviderSettings(BaseModel):
    """Store the minimal runtime configuration required by one provider."""

    api_key: str = ""
    base_url: str | None = None


class AIAnthropicSettings(AIProviderSettings):
    """Store Anthropic-specific runtime configuration."""

    api_version: str = "2023-06-01"


class AISettings(BaseSettings):
    """Store global AI SDK settings and provider runtime credentials."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="AI_",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore",
    )

    record_content: bool = False
    content_preview_chars: int = 500
    default_timeout_ms: int = 60_000
    technical_retry_count: int = 1
    technical_retry_backoff_ms: int = 250

    openai: AIProviderSettings = Field(default_factory=AIProviderSettings)
    anthropic: AIAnthropicSettings = Field(default_factory=AIAnthropicSettings)
    gemini: AIProviderSettings = Field(default_factory=AIProviderSettings)
