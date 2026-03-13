import os

import requests
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.rate_limiter import limiter

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

SYSTEM_PROMPT = (
    "You are a helpful assistant for a Sign Language Learning Platform. "
    "Help users with: how to use the app, sign language tips, learning strategies, technical issues. "
    "Keep responses short and friendly."
)

FALLBACK_REPLY = "I'm having trouble right now. Please contact deepalirole@gmail.com"


def _local_reply(message: str) -> str:
    m = (message or "").strip().lower()
    if not m:
        return "Please type a question and I’ll try to help."

    if "start" in m and "learn" in m:
        return (
            "To start learning: go to Learn → pick a level → open a lesson and follow the steps. "
            "Then use Practice to test yourself and track progress on Dashboard."
        )
    if "camera" in m or "webcam" in m:
        return (
            "To use the camera: open Detect and allow browser permissions. "
            "Make sure your hand is well-lit and centered in the frame. You can switch cameras from the top buttons."
        )
    if "detect" in m or "detection" in m:
        return (
            "In Detect: turn on the camera, then enable Detection. If confidence is low, try better lighting and keep your hand steady."
        )
    if "practice" in m:
        return "Practice tip: do short sessions daily. Focus on accuracy first, then speed. Repeat hard signs 5–10 times."
    if "login" in m or "sign in" in m:
        return "If login fails, double-check email/password, then try logging out and logging in again. You can also reset your password from Login."
    if "sign up" in m or "signup" in m or "create account" in m:
        return "To create an account: open Sign Up, enter your name/email/password, then log in. If it fails, refresh and try again."

    return (
        "I can help with lessons, practice tips, using Detect/camera, or troubleshooting. "
        "What are you trying to do right now?"
    )


class ChatbotRequest(BaseModel):
    message: str
    conversation_history: list = []


def _is_disallowed(message: str) -> bool:
    m = message.lower()
    keywords = ["hack", "ddos", "phish", "malware", "exploit"]
    return any(k in m for k in keywords)


def _build_prompt(message: str, history: list) -> str:
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


def _call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-pro:generateContent"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    resp = requests.post(url, params={"key": api_key}, json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    # Typical response structure: candidates[0].content.parts[0].text
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


@router.post("/message")
@limiter.limit("20/minute")
def message(payload: ChatbotRequest, request: Request):
    if not payload.message or not payload.message.strip():
        return JSONResponse(status_code=400, content={"error": True, "message": "Message cannot be empty"})

    if _is_disallowed(payload.message):
        reply = "I can’t help with that. I can help with sign language learning and using this app—try asking about camera use, lessons, or practice tips."
        return {"success": True, "data": {"reply": reply}, "reply": reply}

    msg = payload.message.strip()
    history = payload.conversation_history or []

    if not os.getenv("GEMINI_API_KEY"):
        reply = _local_reply(msg)
        if len(reply) > 500:
            reply = reply[:500]
        return {"success": True, "data": {"reply": reply}, "reply": reply}

    prompt = _build_prompt(msg, history)

    try:
        reply = _call_gemini(prompt)
        if len(reply) > 500:
            reply = reply[:500]
        return {"success": True, "data": {"reply": reply}, "reply": reply}
    except Exception:
        return {"success": True, "data": {"reply": FALLBACK_REPLY}, "reply": FALLBACK_REPLY}
