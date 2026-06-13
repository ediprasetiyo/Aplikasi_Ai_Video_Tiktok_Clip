from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "production", "test"] = Field(default="development")

    redis_url: str = Field(default="redis://localhost:6379")
    api_base_url: str = Field(default="http://localhost:4000")
    internal_api_secret: str = Field(default="dev-only-secret-change-me")

    r2_endpoint: str = Field(default="http://localhost:9000")
    r2_access_key_id: str = Field(default="minioadmin")
    r2_secret_access_key: str = Field(default="minioadmin")
    r2_bucket: str = Field(default="tiktok-clips")

    groq_api_key: str | None = Field(default=None)

    whisper_model: str = Field(default="small")
    whisper_device: Literal["cpu", "cuda", "auto"] = Field(default="cpu")
    whisper_cpu_threads: int = Field(default=4, ge=1, le=32)
    whisper_compute_type: str = Field(default="int8")

    work_dir: str = Field(default="/tmp/tiktok-clip")  # noqa: S108


settings = Settings()
