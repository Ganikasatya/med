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
    app_name: str = "TapCure API"
    app_version: str = "2.0.0"
    debug: bool = True

    # --- Database ---
    # Examples:
    #   sqlite:///./tapcure.db                (default, local dev)
    #   postgresql+psycopg2://user:pass@host/dbname  (production)
    database_url: str = "sqlite:///./tapcure.db"

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

    # --- Razorpay (booking-fee payments) ---
    # Use TEST keys (rzp_test_…) for dev. key_secret stays server-side ONLY; only
    # key_id is ever sent to the browser. Leave blank to disable payments — the
    # booking flow then proceeds without a payment step.
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    # Optional: set this to the webhook secret from the Razorpay dashboard to
    # enable the server-to-server safety net (completes a booking if the browser
    # confirm never arrives). Leave blank to skip webhooks.
    razorpay_webhook_secret: str = ""
    # Flat online booking fee (₹) charged at booking to reserve the token. The
    # actual consultation fee is collected at the clinic, NOT online. Set to 0 to
    # disable the online fee entirely.
    booking_fee: float = 10.0

    # --- Voice assistant (OpenAI-compatible) ---
    # Powers the patient "Book by Voice" guide: Whisper for speech-to-text and a
    # small chat model for understanding messy speech in en/te/hi. Leave the key
    # blank to disable cloud voice — the frontend then falls back to the free
    # on-device browser Web Speech API automatically.
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_stt_model: str = "whisper-1"
    openai_nlu_model: str = "gpt-4o-mini"

    # --- Email (SMTP) ---
    # Powers real transactional email (clinic approval/rejection, test sends).
    # Leave MAIL_ENABLED=false to keep the no-network mock (DB-logged only).
    # For Gmail, SMTP_PASSWORD must be a 16-char App Password (not the account
    # password) with 2-Step Verification enabled.
    mail_enabled: bool = False
    mail_provider: str = "smtp"
    mail_from_email: str = ""
    mail_from_name: str = "TapCure"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    smtp_timeout_seconds: int = 10

    # --- Routing / road travel time ---
    # The leave-by ETA uses a provider chain that always fails open:
    #   Google Distance Matrix  →  OpenRouteService  →  haversine estimate.
    # Each provider is tried only if the one above is unconfigured/unreachable, so
    # the feature keeps working (just less precise) no matter which keys are set.
    #
    # Google Distance Matrix (most accurate, live traffic). Needs a Google Maps
    # Platform key with billing enabled; restrict it to the Distance Matrix +
    # Geocoding APIs and lock it to your server IP. Leave blank to skip Google and
    # fall through to OpenRouteService. This is the SERVER key (kept secret); the
    # browser Places autocomplete uses a separate VITE_GOOGLE_MAPS_API_KEY.
    google_maps_api_key: str = ""
    google_maps_base_url: str = "https://maps.googleapis.com/maps/api"
    # OpenRouteService (free, no credit card — sign up at openrouteservice.org/dev).
    # The fallback when no Google key is set. Blank -> fall through to haversine.
    openrouteservice_api_key: str = ""
    openrouteservice_base_url: str = "https://api.openrouteservice.org"

    # --- Speech-to-text provider ---
    # "openai" uses Whisper via OPENAI_API_KEY. "deepgram" uses Deepgram Nova.
    stt_provider: str = "openai"
    deepgram_api_key: str = ""
    deepgram_base_url: str = "https://api.deepgram.com"
    deepgram_model: str = "nova-3"

    # --- Text-to-speech (Cartesia Sonic) ---
    # Speaks the assistant prompts in natural Indian-language voices — crucially
    # real Telugu, which most browsers can't synthesise. Leave the key (or the
    # voice id) blank to disable: the frontend then falls back to the browser's
    # on-device speech. One Sonic voice can speak every supported language; set a
    # per-language id only if you want a different voice for Telugu/Hindi.
    cartesia_api_key: str = ""
    cartesia_base_url: str = "https://api.cartesia.ai"
    cartesia_version: str = "2026-03-01"
    cartesia_model: str = "sonic-3.5"
    cartesia_voice_id: str = ""       # default voice (all languages)
    cartesia_voice_te: str = ""       # optional override for Telugu
    cartesia_voice_hi: str = ""       # optional override for Hindi
    cartesia_voice_en: str = ""       # optional override for English

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
