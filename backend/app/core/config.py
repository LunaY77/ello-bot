"""
Core Configuration Module

Uses pydantic-settings for environment variable management with dynamic database configuration support.
Environment variable priority: .env file > system environment variables > default values
"""

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app import __app_name__, __version__


class Settings(BaseSettings):
    """Application Configuration Class

    Uses pydantic-settings to automatically load environment variables, supporting:
    - .env file
    - System environment variables
    - Default value configuration

    Attributes:
        APP_NAME: Application name
        APP_VERSION: Application version
        DEBUG: Debug mode flag
        DATABASE_URL: Database connection string
        SECRET_KEY: JWT secret key
        ALGORITHM: JWT algorithm
        ACCESS_TOKEN_EXPIRE_MINUTES: Token expiration time in minutes
        LOG_LEVEL: Log level
        LOG_FILE: Log file path
        LOG_MAX_SIZE: Maximum log file size in bytes
    """

    model_config = SettingsConfigDict(
        env_file=".env",  # Read .env file
        env_file_encoding="utf-8",  # .env file encoding
        case_sensitive=False,  # Environment variables are case-insensitive
        extra="ignore",  # Ignore extra fields
    )

    # Application configuration
    APP_NAME: str = __app_name__
    APP_VERSION: str = __version__
    DEBUG: bool = Field(default=False, description="Debug mode, should be False in production")

    # Database configuration - supports multiple databases
    # SQLite: sqlite:///./app.db
    # MySQL: mysql+pymysql://user:password@localhost/dbname
    # PostgreSQL: postgresql://user:password@localhost/dbname
    DATABASE_URL: str = Field(
        default="sqlite:///./app.db", description="Database connection string"
    )

    # JWT configuration
    SECRET_KEY: str = Field(default="", description="JWT secret key, MUST be set in production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="Token expiration time in minutes"
    )
    JWT_ISSUER: str = Field(default="app", description="JWT issuer")
    JWT_AUDIENCE: str = Field(default="app", description="JWT audience")

    # Server configuration
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")

    # CORS configuration
    CORS_ORIGINS: list[str] = Field(default=["*"], description="Allowed CORS origins")

    # Log configuration
    LOG_LEVEL: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR")
    LOG_FILE: str = Field(default="logs/app.log", description="Log file path")
    LOG_MAX_SIZE: int = Field(
        default=10 * 1024 * 1024, description="Maximum log file size in bytes, default 10MB"
    )

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate security-sensitive settings.

        Production mode requires a non-empty JWT key with a minimum 32-byte length.
        """
        if self.DEBUG:
            return self

        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set when DEBUG is False")

        if len(self.SECRET_KEY.encode("utf-8")) < 32:
            raise ValueError("SECRET_KEY must be at least 32 bytes when DEBUG is False")

        return self


@lru_cache
def get_settings() -> Settings:
    """Get configuration singleton

    Returns:
        Settings: Configuration instance
    """
    return Settings()


# Global configuration instance
settings = get_settings()
