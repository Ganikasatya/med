"""
Application settings, loaded from environment / a local .env file.

The single most important knob is DATABASE_URL: it defaults to a local SQLite
file so the API runs with zero setup, and switches to PostgreSQL by pointing it
at a postgres:// URL — no code changes anywhere else.
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "BookMyDoctor API"
    app_version: str = "2.0.0"
    debug: bool = True

    # --- Database ---
    # Examples:
    #   sqlite:///./bookmydoctor.db                (default, local dev)
    #   postgresql+psycopg2://user:pass@host/dbname  (production)
    database_url: str = "sqlite:///./ruralop.db"

    # --- Auth / JWT ---
    # CHANGE THIS in production via the SECRET_KEY env var.
    secret_key: str = "dev-insecure-change-me-please-0123456789abcdef"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30           # short-lived access token
    refresh_token_expire_days: int = 30             # long-lived refresh token

    # --- CORS (Vite dev server by default) ---
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ]

    # --- Seeding ---
    seed_on_startup: bool = True

    # --- Voice assistant (OpenAI-compatible) ---
    # Powers the patient "Book by Voice" guide: Whisper for speech-to-text and a
    # small chat model for understanding messy speech in en/te/hi. Leave the key
    # blank to disable cloud voice — the frontend then falls back to the free
    # on-device browser Web Speech API automatically.
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_stt_model: str = "whisper-1"
    openai_nlu_model: str = "gpt-4o-mini"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        """Allow CORS_ORIGINS to be given as a comma-separated string in env."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
