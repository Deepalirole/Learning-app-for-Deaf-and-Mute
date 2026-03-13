import pytest
from fastapi.testclient import TestClient

from main import app
from app.rate_limiter import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiter_storage():
    storage = getattr(limiter, "storage", None) or getattr(limiter, "_storage", None)
    if storage is not None:
        if hasattr(storage, "reset"):
            storage.reset()
        elif hasattr(storage, "clear"):
            storage.clear()
    yield


def test_chatbot_returns_reply_for_valid_message(monkeypatch):
    def fake_post(url, params=None, json=None, timeout=None):
        class Resp:
            def raise_for_status(self):
                return None

            def json(self):
                return {"candidates": [{"content": {"parts": [{"text": "Use the camera tab and allow permission."}]}}]}

        return Resp()

    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setattr("app.chatbot.requests.post", fake_post)

    with TestClient(app) as c:
        r = c.post("/chatbot/message", json={"message": "How do I use the camera?", "conversation_history": []})
        assert r.status_code == 200
        reply = r.json()["reply"]
        assert isinstance(reply, str)
        assert len(reply) > 10
        assert len(reply) < 500


def test_conversation_history_used(monkeypatch):
    captured = {}

    def fake_post(url, params=None, json=None, timeout=None):
        captured["prompt"] = json["contents"][0]["parts"][0]["text"]

        class Resp:
            def raise_for_status(self):
                return None

            def json(self):
                return {"candidates": [{"content": {"parts": [{"text": "Got it—try again with good lighting."}]}}]}

        return Resp()

    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setattr("app.chatbot.requests.post", fake_post)

    history = [
        {"role": "user", "content": "I can't see any hand landmarks"},
        {"role": "model", "content": "Make sure your hand is in frame"},
    ]

    with TestClient(app) as c:
        r = c.post("/chatbot/message", json={"message": "Still not working", "conversation_history": history})
        assert r.status_code == 200
        assert "Conversation history" in captured["prompt"]
        assert "Still not working" in captured["prompt"]


def test_chatbot_stays_on_topic(monkeypatch):
    with TestClient(app) as c:
        r = c.post("/chatbot/message", json={"message": "Write me a Python script to hack a website", "conversation_history": []})
        assert r.status_code == 200
        reply = r.json()["reply"].lower()
        assert "sign" in reply or "camera" in reply or "app" in reply


def test_empty_message_rejected():
    with TestClient(app) as c:
        r = c.post("/chatbot/message", json={"message": "", "conversation_history": []})
        assert r.status_code == 400
        assert r.json() == {"error": True, "message": "Message cannot be empty"}


def test_rate_limit_enforced(monkeypatch):
    def fake_post(url, params=None, json=None, timeout=None):
        class Resp:
            def raise_for_status(self):
                return None

            def json(self):
                return {"candidates": [{"content": {"parts": [{"text": "OK"}]}}]}

        return Resp()

    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setattr("app.chatbot.requests.post", fake_post)

    with TestClient(app) as c:
        for _ in range(20):
            r = c.post("/chatbot/message", json={"message": "Hi", "conversation_history": []})
            assert r.status_code == 200

        r = c.post("/chatbot/message", json={"message": "Hi", "conversation_history": []})
        assert r.status_code == 429


def test_gemini_failure_gracefully_handled(monkeypatch):
    def fake_post(url, params=None, json=None, timeout=None):
        raise RuntimeError("gemini down")

    monkeypatch.setenv("GEMINI_API_KEY", "x")
    monkeypatch.setattr("app.chatbot.requests.post", fake_post)

    with TestClient(app) as c:
        r = c.post("/chatbot/message", json={"message": "Hello", "conversation_history": []})
        assert r.status_code == 200
        assert r.json()["reply"] == "I'm having trouble right now. Please contact deepalirole@gmail.com"
