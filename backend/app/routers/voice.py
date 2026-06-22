"""
Voice assistant proxy for the patient "Book by Voice" guide.

Two thin endpoints that keep the OpenAI key server-side:

  POST /voice/transcribe  — multipart audio -> Whisper -> { text }
  POST /voice/nlu         — JSON intent task -> chat model -> structured choice

Both require an authenticated user (any role) and return HTTP 503 when no
OPENAI_API_KEY is configured, which is the frontend's signal to fall back to the
free on-device browser Web Speech API. We talk to the OpenAI REST API directly
with httpx so there's no extra SDK dependency.
"""
from __future__ import annotations

import json
from typing import List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, Field

from ..config import settings
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/voice", tags=["voice"])

# Cap uploads so a stray/oversized recording can't tie up the worker. A guided
# answer is a few seconds of speech; 25 MB is OpenAI's own Whisper limit.
MAX_AUDIO_BYTES = 25 * 1024 * 1024
HTTP_TIMEOUT = httpx.Timeout(60.0, connect=10.0)

# BCP-47 (from the frontend) -> ISO-639-1 hint for Whisper. Improves accuracy by
# telling Whisper which language to expect; unknown values are simply omitted.
_WHISPER_LANG = {"en": "en", "te": "te", "hi": "hi"}
_LANG_NAME = {"en": "English", "te": "Telugu", "hi": "Hindi"}


def _stt_provider() -> str:
    return (settings.stt_provider or "openai").strip().lower()


def _require_openai_key() -> str:
    key = (settings.openai_api_key or "").strip()
    if not key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "OpenAI is not configured.",
        )
    return key


def _require_stt_enabled() -> tuple[str, str]:
    provider = _stt_provider()
    if provider == "deepgram":
        key = (settings.deepgram_api_key or "").strip()
        if key:
            return provider, key
    elif provider == "openai":
        key = (settings.openai_api_key or "").strip()
        if key:
            return provider, key
    raise HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Cloud voice is not configured; use the on-device fallback.",
    )


def _require_voice_enabled() -> str:
    # NLU still uses OpenAI chat completions. STT may use another provider.
    return _require_openai_key()


# ============================================================ Transcribe =====
@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    """Speech-to-text via Whisper. `language` is a short code (en/te/hi).

    Intentionally public: it powers the pre-login patient voice registration
    guide. The OpenAI key stays server-side.
    """
    provider, key = _require_stt_enabled()
    data = await audio.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty audio upload")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Audio too large")

    lang = _WHISPER_LANG.get((language or "").lower()[:2]) or "en"

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            if provider == "deepgram":
                res = await client.post(
                    f"{settings.deepgram_base_url}/v1/listen",
                    params={"model": settings.deepgram_model, "language": lang, "smart_format": "true"},
                    headers={
                        "Authorization": f"Token {key}",
                        "Content-Type": audio.content_type or "audio/webm",
                    },
                    content=data,
                )
            else:
                form = {"model": settings.openai_stt_model, "response_format": "json"}
                if lang:
                    form["language"] = lang
                files = {"file": (audio.filename or "speech.webm", data, audio.content_type or "audio/webm")}
                res = await client.post(
                    f"{settings.openai_base_url}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {key}"},
                    data=form,
                    files=files,
                )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Speech service unreachable")

    if res.status_code >= 400:
        detail = res.text[:300] if res.text else f"Speech service error ({res.status_code})"
        print(f"{provider.title()} transcription error {res.status_code}: {detail}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail)

    payload = res.json() or {}
    if provider == "deepgram":
        try:
            text = payload["results"]["channels"][0]["alternatives"][0].get("transcript", "")
        except (KeyError, IndexError, TypeError):
            text = ""
    else:
        text = payload.get("text", "")
    return {"text": (text or "").strip()}


# =================================================================== NLU ======
class NluOption(BaseModel):
    id: str
    label: str


class NluRequest(BaseModel):
    transcript: str
    language: str = "en"
    # match_option: pick the option that best matches the speech (or none)
    # yes_no:       did the speaker agree? -> value "yes" | "no" | ""
    # pick_date:    resolve a spoken day to an ISO date relative to `today`
    task: Literal["match_option", "yes_no", "pick_date"] = "match_option"
    options: List[NluOption] = Field(default_factory=list)
    today: Optional[str] = None  # YYYY-MM-DD, required for pick_date
    hint: Optional[str] = None   # extra instruction, e.g. what's being chosen


class NluResponse(BaseModel):
    value: str = ""        # option id / "yes"|"no" / ISO date — "" means unclear
    confidence: float = 0.0
    reply: str = ""        # short spoken acknowledgement in the user's language


def _build_prompt(body: NluRequest) -> str:
    lang = _LANG_NAME.get((body.language or "en").lower()[:2], "English")
    base = (
        f"You interpret a patient's spoken reply (transcribed, possibly messy) in a "
        f"doctor-appointment voice assistant. The patient speaks {lang}. "
        f'Reply ONLY with compact JSON: {{"value": ..., "confidence": 0..1, "reply": "..."}}. '
        f'"reply" is a short, warm acknowledgement written in {lang}. '
        f"If the reply is unclear, set value to empty and confidence below 0.4."
    )
    if body.task == "yes_no":
        return base + ' For "value" return "yes", "no", or "".'
    if body.task == "pick_date":
        return base + (
            f' Today is {body.today}. Resolve the spoken day (today, tomorrow, a weekday, '
            f'a date) to an absolute date and return it in "value" as YYYY-MM-DD. '
            f"Never return a date in the past."
        )
    opts = "\n".join(f"- id={o.id}: {o.label}" for o in body.options)
    extra = f" Context: {body.hint}." if body.hint else ""
    return base + (
        f' For "value" return the id of the single best-matching option, or "" if none fit.'
        f"{extra}\nOptions:\n{opts}"
    )


@router.post("/nlu", response_model=NluResponse)
async def nlu(body: NluRequest, me: User = Depends(get_current_user)):
    """Map a free-form spoken reply to a structured choice for the current step."""
    key = _require_voice_enabled()
    if body.task == "pick_date" and not body.today:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "pick_date requires `today`")

    payload = {
        "model": settings.openai_nlu_model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _build_prompt(body)},
            {"role": "user", "content": body.transcript or ""},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            res = await client.post(
                f"{settings.openai_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=payload,
            )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Language service unreachable")

    if res.status_code >= 400:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Language service error ({res.status_code})")

    try:
        content = res.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not parse language service response")

    value = parsed.get("value")
    # match_option must echo back a real option id; reject hallucinated ids.
    if body.task == "match_option" and value:
        valid = {o.id for o in body.options}
        if str(value) not in valid:
            value = ""
    return NluResponse(
        value="" if value is None else str(value),
        confidence=float(parsed.get("confidence") or 0.0),
        reply=str(parsed.get("reply") or ""),
    )


# ================================================================== TTS ======
# Map the frontend's short language code to a configured Sonic voice id (falling
# back to the default voice) and to Cartesia's language code.
_TTS_VOICE = {
    "te": lambda: settings.cartesia_voice_te,
    "hi": lambda: settings.cartesia_voice_hi,
    "en": lambda: settings.cartesia_voice_en,
}
_CARTESIA_LANG = {"en": "en", "te": "te", "hi": "hi"}
MAX_TTS_CHARS = 1000


class TtsRequest(BaseModel):
    text: str
    language: str = "en"


def _tts_voice_id(language: str) -> str:
    code = (language or "en").lower()[:2]
    specific = _TTS_VOICE.get(code, lambda: "")()
    return (specific or settings.cartesia_voice_id or "").strip()


def _require_tts_enabled(language: str) -> tuple[str, str]:
    key = (settings.cartesia_api_key or "").strip()
    voice = _tts_voice_id(language)
    if not key or not voice:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud TTS is not configured; use the on-device fallback.",
        )
    return key, voice


@router.post("/tts")
async def tts(body: TtsRequest):
    """Text-to-speech via Cartesia Sonic. Returns MP3 audio bytes.

    Intentionally public (no auth): it powers the landing page and the
    login/register voice guide, which run before the patient is signed in.
    """
    key, voice = _require_tts_enabled(body.language)
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty text")
    text = text[:MAX_TTS_CHARS]

    payload = {
        "model_id": settings.cartesia_model,
        "transcript": text,
        "voice": {"mode": "id", "id": voice},
        "language": _CARTESIA_LANG.get((body.language or "en").lower()[:2], "en"),
        "output_format": {"container": "mp3", "sample_rate": 44100, "bit_rate": 128000},
    }
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            res = await client.post(
                f"{settings.cartesia_base_url}/tts/bytes",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Cartesia-Version": settings.cartesia_version,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Speech service unreachable")

    if res.status_code >= 400:
        detail = res.text[:300] if res.text else f"Speech service error ({res.status_code})"
        print(f"Cartesia TTS error {res.status_code}: {detail}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail)
    return Response(content=res.content, media_type="audio/mpeg")


@router.get("/status")
def voice_status():
    """Lets the UI show 'high-accuracy voice on' vs 'using on-device voice'.

    Public so pre-login surfaces (landing / login guide) can tell whether the
    Cartesia voice is available.
    """
    cloud_tts = bool((settings.cartesia_api_key or "").strip() and _tts_voice_id("te"))
    provider = _stt_provider()
    cloud_stt = bool(
        ((settings.deepgram_api_key or "").strip() if provider == "deepgram" else (settings.openai_api_key or "").strip())
    )
    return {
        "cloud_voice": cloud_stt,
        "cloud_stt": cloud_stt,
        "stt_provider": provider,
        "cloud_nlu": bool((settings.openai_api_key or "").strip()),
        "cloud_tts": cloud_tts,
    }
