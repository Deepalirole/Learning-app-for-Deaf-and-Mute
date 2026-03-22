import base64
import io
import os
import tempfile
import time

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from PIL import Image

from app import db as db_module
from app.models import GestureHistory
from app.rate_limiter import limiter
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "detect_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    storage = getattr(limiter, "storage", None) or getattr(limiter, "_storage", None)
    if storage is not None:
        if hasattr(storage, "reset"):
            storage.reset()
        elif hasattr(storage, "clear"):
            storage.clear()

    with TestClient(app) as c:
        signup = c.post(
            "/auth/signup",
            json={"email": "det@gmail.com", "password": "SecureP@ss1", "name": "Det User"},
        )
        token = signup.json()["data"]["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


def _make_base64_image() -> str:
    img = Image.new("RGB", (10, 10), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class StubDetector:
    def __init__(self, hands):
        self._hands = hands

    def extract_landmarks(self, rgb):
        return self._hands


class StubClassifier:
    def __init__(self, gesture, confidence):
        self._gesture = gesture
        self._confidence = confidence

    def classify(self, hands):
        return self._gesture, self._confidence


def test_model_loads_once_at_startup(client):
    app.state.hand_detector = StubDetector(
        [[{"x": 0.0, "y": 0.0, "z": 0.0} for _ in range(21)]]
    )
    app.state.gesture_classifier = StubClassifier("A", 0.9)

    assert app.state.model_init_count == 1

    frame = _make_base64_image()
    for _ in range(5):
        r = client.post("/detect", json={"frame": frame})
        assert r.status_code == 200

    assert app.state.model_init_count == 1


def test_valid_base64_image_gesture_returned(client):
    app.state.hand_detector = StubDetector(
        [[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]]
    )
    app.state.gesture_classifier = StubClassifier("A", 0.81)

    r = client.post("/detect", json={"frame": _make_base64_image()})
    assert r.status_code == 200
    body = r.json()
    assert body["gesture"] == "A"
    assert body["confidence"] >= 0.80
    assert isinstance(body["landmarks"], list)
    assert len(body["landmarks"]) == 21


def test_low_confidence_suppressed(client):
    app.state.hand_detector = StubDetector(
        [[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]]
    )
    app.state.gesture_classifier = StubClassifier("A", 0.6)

    r = client.post("/detect", json={"frame": _make_base64_image()})
    assert r.status_code == 200
    body = r.json()
    assert body["gesture"] is None
    assert body["confidence"] < 0.75
    assert body["message"] == "No clear sign detected"


def test_no_hand_in_frame(client):
    app.state.hand_detector = StubDetector([])
    app.state.gesture_classifier = StubClassifier("A", 0.9)

    r = client.post("/detect", json={"frame": _make_base64_image()})
    assert r.status_code == 200
    assert r.json()["gesture"] is None
    assert r.json()["message"] == "No hand detected"


def test_both_hands_handled(client):
    hands = [
        [{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)],
        [{"x": 0.3, "y": 0.4, "z": 0.0} for _ in range(21)],
    ]
    app.state.hand_detector = StubDetector(hands)
    app.state.gesture_classifier = StubClassifier("L", 0.9)

    r = client.post("/detect", json={"frame": _make_base64_image()})
    assert r.status_code == 200
    assert r.json()["gesture"] == "L"


def test_rate_limiting_enforced(client):
    app.state.hand_detector = StubDetector(
        [[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]]
    )
    app.state.gesture_classifier = StubClassifier("A", 0.9)

    frame = _make_base64_image()
    for i in range(30):
        r = client.post("/detect", json={"frame": frame})
        assert r.status_code == 200

    r = client.post("/detect", json={"frame": frame})
    assert r.status_code == 429


def test_gesture_saved_to_db(client, db_url):
    app.state.hand_detector = StubDetector(
        [[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]]
    )
    app.state.gesture_classifier = StubClassifier("A", 0.9)

    r = client.post("/detect", json={"frame": _make_base64_image()})
    assert r.status_code == 200

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        row = session.query(GestureHistory).order_by(GestureHistory.id.desc()).first()
        assert row is not None
        assert row.gesture == "A"
        assert float(row.confidence) == 0.9


def test_speech_endpoint_generates_audio_and_deletes_temp_file(client):
    temp_dir = tempfile.gettempdir()
    before = {p for p in os.listdir(temp_dir) if p.endswith(".mp3")}

    r = client.get("/detect/speech/Hello")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/mpeg")
    assert len(r.content) > 0

    time.sleep(0.2)
    after = {p for p in os.listdir(temp_dir) if p.endswith(".mp3")}
    assert after == before
