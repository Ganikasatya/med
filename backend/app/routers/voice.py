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
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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


def _require_voice_enabled() -> str:
    key = (settings.openai_api_key or "").strip()
    if not key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud voice is not configured; use the on-device fallback.",
        )
    return key


# ============================================================ Transcribe =====
@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    me: User = Depends(get_current_user),
):
    """Speech-to-text via Whisper. `language` is a short code (en/te/hi)."""
    key = _require_voice_enabled()
    data = await audio.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty audio upload")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Audio too large")

    form = {"model": settings.openai_stt_model, "response_format": "json"}
    hint = _WHISPER_LANG.get((language or "").lower()[:2])
    if hint:
        form["language"] = hint
    files = {"file": (audio.filename or "speech.webm", data, audio.content_type or "audio/webm")}

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            res = await client.post(
                f"{settings.openai_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {key}"},
                data=form,
                files=files,
            )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Speech service unreachable")

    if res.status_code >= 400:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Speech service error ({res.status_code})")
    text = (res.json() or {}).get("text", "")
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


@router.get("/status")
def voice_status(me: User = Depends(get_current_user)):
    """Lets the UI show 'high-accuracy voice on' vs 'using on-device voice'."""
    return {"cloud_voice": bool((settings.openai_api_key or "").strip())}
