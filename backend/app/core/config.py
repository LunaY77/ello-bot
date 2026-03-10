"""
Core Configuration Module

Uses pydantic-settings for environment variable management.
Settings are split into logical sub-classes, each with its own env_prefix.
Environment variable priority: system environment variables > .env file > default values
"""

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app import __app_name__, __version__
from app.infra.ai.config import AISettings


class ServerSettings(BaseSettings):
    """Server configuration — env prefix: SERVER_"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="SERVER_", extra="ignore"
    )

    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")


class DatabaseSettings(BaseSettings):
    """Database configuration — env prefix: DB_

    Supported dialects:
    - PostgreSQL (async): postgresql+asyncpg://user:password@localhost/dbname
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="DB_", extra="ignore"
    )

    URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ello_bot",
        description="Database connection string",
    )


class CacheSettings(BaseSettings):
    """Redis cache configuration — env prefix: REDIS_"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="REDIS_", extra="ignore"
    )

    URL: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")


class JwtSettings(BaseSettings):
    """JWT authentication configuration — env prefix: JWT_"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="JWT_", extra="ignore"
    )

    SECRET_KEY: str = Field(default="", description="JWT secret key, MUST be set in production")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    EXPIRE_MINUTES: int = Field(default=30, description="Token expiration time in minutes")
    ISSUER: str = Field(default="app", description="JWT issuer")
    AUDIENCE: str = Field(default="app", description="JWT audience")


class LogSettings(BaseSettings):
    """Logging configuration — env prefix: LOG_"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="LOG_", extra="ignore"
    )

    LEVEL: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR")
    FILE: str = Field(default="logs/app.log", description="Log file path")
    MAX_SIZE: int = Field(
        default=10 * 1024 * 1024, description="Maximum log file size in bytes, default 10MB"
    )


class OtelSettings(BaseSettings):
    """OpenTelemetry observability configuration — env prefix: OTEL_"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="OTEL_", extra="ignore"
    )

    ENABLED: bool = Field(default=False, description="Enable OpenTelemetry instrumentation")
    SERVICE_NAME: str = Field(default="ello-bot-backend", description="OTel service name")
    EXPORTER_OTLP_ENDPOINT: str = Field(
        default="http://localhost:4318", description="OTLP HTTP endpoint"
    )
    ENVIRONMENT: str = Field(default="dev", description="Deployment environment tag")


class BootstrapSettings(BaseSettings):
    """IAM bootstrap configuration — env prefix: BOOTSTRAP_."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", env_prefix="BOOTSTRAP_", extra="ignore"
    )

    ENABLED: bool = Field(default=True, description="Enable automatic IAM bootstrap")
    TENANT_SLUG: str = Field(default="personal", description="Initial tenant slug")
    TENANT_NAME: str = Field(default="Personal", description="Initial tenant display name")
    ADMIN_USERNAME: str = Field(default="admin", description="Bootstrap administrator username")
    ADMIN_PASSWORD: str = Field(
        default="",
        description="Bootstrap administrator password; must be set outside debug mode",
    )
    ADMIN_DISPLAY_NAME: str = Field(
        default="System Admin",
        description="Bootstrap administrator display name",
    )

    def resolved_admin_password(self, *, debug: bool) -> str:
        """Resolve the bootstrap administrator password.

        Args:
            debug: Whether the application is currently running in debug mode.

        Returns:
            The configured bootstrap administrator password, or a debug-only fallback value.
        """
        if self.ADMIN_PASSWORD:
            return self.ADMIN_PASSWORD
        if debug:
            return "DevOnly_Admin_12345678"
        raise ValueError(
            "BOOTSTRAP_ADMIN_PASSWORD must be set when DEBUG is False and bootstrap is enabled"
        )


class Settings(BaseSettings):
    """Top-level application configuration — aggregates all sub-settings.

    Sub-settings are instantiated via default_factory; each reads its own
    prefixed env vars independently from the same .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App-level (no prefix) ----
    APP_NAME: str = __app_name__
    APP_VERSION: str = __version__
    DEBUG: bool = Field(default=False, description="Debug mode, should be False in production")
    CORS_ORIGINS: list[str] = Field(default=["*"], description="Allowed CORS origins")

    # ---- Sub-settings ----
    server: ServerSettings = Field(default_factory=ServerSettings)
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    cache: CacheSettings = Field(default_factory=CacheSettings)
    jwt: JwtSettings = Field(default_factory=JwtSettings)
    log: LogSettings = Field(default_factory=LogSettings)
    otel: OtelSettings = Field(default_factory=OtelSettings)
    bootstrap: BootstrapSettings = Field(default_factory=BootstrapSettings)
    ai: AISettings = Field(default_factory=AISettings)

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate security-sensitive settings after loading configuration.

        Args:
            None

        Returns:
            The validated settings object.
        """
        if self.DEBUG:
            return self

        # Production configuration must always use an explicit strong JWT signing key.
        if not self.jwt.SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY must be set when DEBUG is False")

        if len(self.jwt.SECRET_KEY.encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 bytes when DEBUG is False")

        # Bootstrap is allowed in production, but only when the initial admin password is explicit.
        if self.bootstrap.ENABLED and not self.bootstrap.ADMIN_PASSWORD:
            raise ValueError(
                "BOOTSTRAP_ADMIN_PASSWORD must be set when DEBUG is False and bootstrap is enabled"
            )

        return self


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings singleton.

    Args:
        None

    Returns:
        Settings: The cached configuration object for the current process.
    """
    return Settings()


# Global configuration instance
settings = get_settings()
