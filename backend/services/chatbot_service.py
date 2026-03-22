"""
Gemini-backed chatbot helpers. API key is always read from the environment.
"""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a helpful assistant for a Sign Language Learning Platform. "
    "Help users with: how to use the app, sign language tips, learning strategies, technical issues. "
    "Keep responses short and friendly."
)

# Shown when GEMINI_API_KEY is not set (e.g. local / misconfigured deploy).
MISSING_GEMINI_KEY_MESSAGE = (
    "The AI assistant isn’t fully configured on the server yet (missing API key). "
    "You can still use Learn, Detect, and Progress in the app. "
    "For quick guidance, try the Help section or ask your teacher—"
    "and you can email deepalirole@gmail.com if you need support."
)

# Shown when the key is set but the Gemini request fails (network, quota, model error, etc.).
GEMINI_UNAVAILABLE_MESSAGE = (
    "I’m having trouble connecting to the AI service right now. Please try again in a minute. "
    "If it keeps happening, contact deepalirole@gmail.com."
)

# Try in order — model names change; first working wins (Google AI Studio / Generative Language API).
_GEMINI_MODEL_IDS = (
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-pro",
)


def get_gemini_api_key() -> str | None:
    """Read Gemini API key from the environment (never hard-coded)."""
    raw = os.getenv("GEMINI_API_KEY")
    if raw is None:
        return None
    key = raw.strip()
    return key or None


def build_prompt(message: str, history: list) -> str:
    lines = [SYSTEM_PROMPT, ""]
    if history:
        lines.append("Conversation history:")
        for turn in history:
            role = turn.get("role") or turn.get("speaker") or "user"
            content = turn.get("content") or turn.get("message") or ""
            lines.append(f"{role}: {content}")
        lines.append("")
    lines.append(f"user: {message}")
    return "\n".join(lines)


def _extract_text_from_response(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        feedback = data.get("promptFeedback") or {}
        block = feedback.get("blockReason")
        if block:
            raise RuntimeError(f"Content blocked: {block}")
        raise RuntimeError("No candidates")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    if not parts:
        raise RuntimeError("No parts")

    text = parts[0].get("text")
    if not text:
        raise RuntimeError("Empty text")

    return str(text).strip()


def call_gemini(prompt: str) -> str:
    """
    Call Google Generative Language API. Raises on missing key or if all models fail.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    last_error: Exception | None = None

    for model_id in _GEMINI_MODEL_IDS:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_id}:generateContent"
        )
        try:
            # json= sets Content-Type; avoid extra kwargs so tests can monkeypatch simple fake_post(url, params, json, timeout).
            resp = requests.post(
                url,
                params={"key": api_key},
                json=payload,
                timeout=45,
            )
            if resp.status_code == 404:
                logger.info("Gemini model %s not available (404), trying next", model_id)
                continue
            resp.raise_for_status()
            data = resp.json()
            return _extract_text_from_response(data)
        except requests.HTTPError as e:
            last_error = e
            status = e.response.status_code if e.response is not None else None
            if status in (401, 403):
                raise RuntimeError("Invalid or unauthorized GEMINI_API_KEY") from e
            if status == 429:
                raise RuntimeError("Gemini API rate limit exceeded") from e
            if status in (404, 400):
                logger.info(
                    "Gemini model %s failed (%s): %s",
                    model_id,
                    status,
                    (e.response.text[:200] if e.response is not None else ""),
                )
                continue
            raise
        except (RuntimeError, requests.RequestException, ValueError, KeyError) as e:
            last_error = e
            logger.info("Gemini model %s error: %s", model_id, e)
            continue

    if last_error:
        raise last_error
    raise RuntimeError("No Gemini model responded")
