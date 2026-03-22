"""
Gemini-backed chatbot helpers. API key is always read from the environment.
"""

from __future__ import annotations

import os

import requests

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


def call_gemini(prompt: str) -> str:
    """
    Call Google Generative Language API. Raises on missing key or bad/unexpected response.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")

    # gemini-1.5-flash is widely available on the v1beta API (gemini-pro is often deprecated).
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash:generateContent"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    resp = requests.post(url, params={"key": api_key}, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("No candidates")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    if not parts:
        raise RuntimeError("No parts")

    text = parts[0].get("text")
    if not text:
        raise RuntimeError("Empty text")

    return str(text).strip()
