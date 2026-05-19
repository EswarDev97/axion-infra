"""
MindFlow Backend - Configuration Module
Per TECH_STACK.md and SECURITY_ARCHITECTURE.md
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "MindFlow"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=False, alias="DEBUG")

    # Server
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # Database - PostgreSQL 16 with RLS (per TECH_STACK.md)
    database_url: str = Field(
        default="postgresql+asyncpg://axionpcs:axionpcs_secret@localhost:5432/axionpcs_db",
        alias="DATABASE_URL"
    )
    database_pool_size: int = Field(default=10, alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=20, alias="DATABASE_MAX_OVERFLOW")

    # Redis 7 (per TECH_STACK.md)
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    redis_session_db: int = Field(default=0, alias="REDIS_SESSION_DB")
    redis_celery_broker_db: int = Field(default=1, alias="REDIS_CELERY_BROKER_DB")
    redis_celery_backend_db: int = Field(default=2, alias="REDIS_CELERY_BACKEND_DB")
    redis_cache_db: int = Field(default=3, alias="REDIS_CACHE_DB")

    # MinIO (per TECH_STACK.md)
    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    minio_secure: bool = Field(default=False, alias="MINIO_SECURE")
    minio_bucket_name: str = Field(default="mindflow", alias="MINIO_BUCKET_NAME")

    # JWT Authentication (per TECH_STACK.md and API_CONTRACT.md)
    # Access Token TTL: 15 minutes (per API_CONTRACT.md)
    # Refresh Token TTL: 7 days (per API_CONTRACT.md)
    jwt_secret_key: str = Field(default="change-me-in-production", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(default=15, alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    jwt_refresh_token_expire_days: int = Field(default=7, alias="JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    jwt_issuer: str = Field(default="mindflow", alias="JWT_ISSUER")

    # Security (per THREAT_MODEL.md)
    password_min_length: int = Field(default=12, alias="PASSWORD_MIN_LENGTH")
    max_login_attempts: int = Field(default=5, alias="MAX_LOGIN_ATTEMPTS")
    account_lockout_minutes: int = Field(default=30, alias="ACCOUNT_LOCKOUT_MINUTES")

    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000"],
        alias="CORS_ORIGINS"
    )

    # Expense Module - Temporary workflow override
    # When true, new expenses skip approval workflow and are created as FINANCE_APPROVED
    # Set to false to re-enable the full approval workflow (DRAFT → SUBMITTED → ... → PAID)
    auto_finance_approval: bool = Field(default=True, alias="AUTO_FINANCE_APPROVAL")

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
