from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.rate_limiter import limiter
from services.chatbot_service import (
    GEMINI_UNAVAILABLE_MESSAGE,
    MISSING_GEMINI_KEY_MESSAGE,
    build_prompt,
    call_gemini,
    get_gemini_api_key,
)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatbotRequest(BaseModel):
    message: str
    conversation_history: list = []


def _is_disallowed(message: str) -> bool:
    m = message.lower()
    keywords = ["hack", "ddos", "phish", "malware", "exploit"]
    return any(k in m for k in keywords)


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

    if not get_gemini_api_key():
        reply = MISSING_GEMINI_KEY_MESSAGE
        if len(reply) > 500:
            reply = reply[:500]
        return {"success": True, "data": {"reply": reply}, "reply": reply}

    prompt = build_prompt(msg, history)

    try:
        reply = call_gemini(prompt)
        if len(reply) > 500:
            reply = reply[:500]
        return {"success": True, "data": {"reply": reply}, "reply": reply}
    except Exception:
        reply = GEMINI_UNAVAILABLE_MESSAGE
        if len(reply) > 500:
            reply = reply[:500]
        return {"success": True, "data": {"reply": reply}, "reply": reply}
