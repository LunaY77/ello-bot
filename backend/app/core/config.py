"""Application configuration for the single-user rewrite."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app import __app_name__, __version__


class ServerSettings(BaseSettings):
    """HTTP server configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="SERVER_",
        extra="ignore",
    )

    HOST: str = "0.0.0.0"
    PORT: int = 8000


class DatabaseSettings(BaseSettings):
    """Database connectivity settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="DB_",
        extra="ignore",
    )

    URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ello_bot"


class CacheSettings(BaseSettings):
    """Redis connectivity settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="REDIS_",
        extra="ignore",
    )

    URL: str = "redis://localhost:6379/0"


class LogSettings(BaseSettings):
    """Application logging configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="LOG_",
        extra="ignore",
    )

    LEVEL: str = "INFO"
    FILE: str = "logs/app.log"
    MAX_SIZE: int = 10 * 1024 * 1024


class OtelSettings(BaseSettings):
    """Optional OpenTelemetry configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="OTEL_",
        extra="ignore",
    )

    ENABLED: bool = False
    SERVICE_NAME: str = "ello-bot-backend"
    EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4318"
    ENVIRONMENT: str = "dev"


class BootstrapSettings(BaseSettings):
    """Bootstrap-admin configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="BOOTSTRAP_",
        extra="ignore",
    )

    ENABLED: bool = True
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = ""
    ADMIN_DISPLAY_NAME: str = "System Admin"

    def resolved_admin_password(self, *, debug: bool) -> str:
        """Return the configured bootstrap password or a debug-only fallback.

        Args:
            debug: Whether the application is running in debug mode.

        Returns:
            Bootstrap-admin password to apply during initialization.
        """
        if self.ADMIN_PASSWORD:
            return self.ADMIN_PASSWORD
        if debug:
            return "DevOnly_Admin_12345678"
        raise ValueError(
            "BOOTSTRAP_ADMIN_PASSWORD must be set when DEBUG is False and bootstrap is enabled"
        )


class AuthSettings(BaseSettings):
    """Authentication and session timing configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="AUTH_",
        extra="ignore",
    )

    REGISTRATION_ENABLED: bool = False
    ACCESS_TOKEN_TTL_SECONDS: int = 30 * 60
    REFRESH_TOKEN_TTL_DAYS: int = 30


class Settings(BaseSettings):
    """Root application settings composed from the backend subsystems."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = __app_name__
    APP_VERSION: str = __version__
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    server: ServerSettings = Field(default_factory=ServerSettings)
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    cache: CacheSettings = Field(default_factory=CacheSettings)
    log: LogSettings = Field(default_factory=LogSettings)
    otel: OtelSettings = Field(default_factory=OtelSettings)
    bootstrap: BootstrapSettings = Field(default_factory=BootstrapSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)

    @model_validator(mode="after")
    def validate_security_settings(self) -> Settings:
        """Validate bootstrap security requirements after settings load.

        Returns:
            The validated settings object.
        """
        if self.DEBUG:
            return self
        if self.bootstrap.ENABLED and not self.bootstrap.ADMIN_PASSWORD:
            raise ValueError(
                "BOOTSTRAP_ADMIN_PASSWORD must be set when DEBUG is False and bootstrap is enabled"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings instance.

    Returns:
        Process-wide settings object.
    """
    return Settings()


settings = get_settings()
