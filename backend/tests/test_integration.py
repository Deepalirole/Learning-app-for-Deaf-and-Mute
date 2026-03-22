import base64
import io
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import db as db_module
from app.models import GestureHistory, User
from app.rate_limiter import limiter
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


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


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "integration_test.db"
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
        # Lifespan initializes models on startup and can overwrite these.
        # Set stubs after the client context is active.
        app.state.hand_detector = StubDetector([[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]])
        app.state.gesture_classifier = StubClassifier("A", 0.91)
        yield c


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _signup_and_login(c: TestClient, email: str, password: str, name: str) -> str:
    r = c.post("/auth/signup", json={"email": email, "password": password, "name": name})
    assert r.status_code == 200
    token = r.json()["data"]["token"]

    r2 = c.post("/auth/login", json={"email": email, "password": password})
    assert r2.status_code == 200
    assert "token" in r2.json()["data"]
    return token


def test_integration_a_full_new_user_onboarding(client, db_url):
    token = _signup_and_login(client, "onboard@gmail.com", "SecureP@ss1", "Onboard")

    # Dashboard dependencies: progress + leaderboard
    r_progress = client.get("/progress", headers=_auth_headers(token))
    assert r_progress.status_code == 200
    assert r_progress.json()["success"] is True

    r_leader = client.get("/progress/leaderboard")
    assert r_leader.status_code == 200

    # Learn: list levels and lessons, complete lesson 1
    r_levels = client.get("/learn/levels")
    assert r_levels.status_code == 200
    r_lessons = client.get("/learn/lessons/beginner")
    assert r_lessons.status_code == 200
    lessons = r_lessons.json()["data"]
    assert len(lessons) > 0

    lesson_id = lessons[0]["id"]
    r_complete = client.post(f"/learn/complete/{lesson_id}", headers=_auth_headers(token))
    assert r_complete.status_code == 200
    assert r_complete.json()["data"]["awarded"] in (True, False)

    # Verify XP=10 in progress after completing first alphabet lesson (seed is 10 XP)
    r_progress2 = client.get("/progress", headers=_auth_headers(token))
    assert r_progress2.status_code == 200
    assert r_progress2.json()["data"]["total_xp"] >= 10


def test_integration_b_full_detection_flow_latency_and_db(client, db_url):
    token = _signup_and_login(client, "detflow@gmail.com", "SecureP@ss1", "DetFlow")

    frame = _make_base64_image()
    start = time.perf_counter()
    r = client.post("/detect", json={"frame": frame}, headers=_auth_headers(token))
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert r.status_code == 200
    body = r.json()

    # Backward compatible fields
    assert body["gesture"] == "A"
    assert float(body["confidence"]) > 0.80

    # Standard envelope
    assert body["success"] is True
    assert body["data"]["gesture"] == "A"

    # Latency benchmark
    assert elapsed_ms < 800

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        row = session.query(GestureHistory).order_by(GestureHistory.id.desc()).first()
        assert row is not None
        assert row.gesture == "A"


def test_integration_c_learning_practice_loop_updates_streak_and_badges(client, db_url):
    token = _signup_and_login(client, "loop@gmail.com", "SecureP@ss1", "Loop")

    # Complete a beginner lesson to earn XP
    lessons = client.get("/learn/lessons/beginner").json()["data"]
    lesson_id = lessons[1]["id"] if len(lessons) > 1 else lessons[0]["id"]
    client.post(f"/learn/complete/{lesson_id}", headers=_auth_headers(token))

    # Practice loop: update progress once with perfect accuracy -> streak should be >= 1
    r_upd = client.post("/progress/update", json={"accuracy": 1.0}, headers=_auth_headers(token))
    assert r_upd.status_code == 200

    r_prog = client.get("/progress", headers=_auth_headers(token))
    assert r_prog.status_code == 200
    data = r_prog.json()["data"]
    assert data["current_streak"] >= 1

    # Badge system: after at least one completed lesson -> should have First Sign
    assert "First Sign" in data.get("badges_earned", [])


def test_integration_d_password_reset_full_flow(client, db_url):
    email = "pwreset@gmail.com"
    _signup_and_login(client, email, "SecureP@ss1", "PwReset")

    r_fp = client.post("/auth/forgot-password", json={"email": email})
    assert r_fp.status_code == 200

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        user = session.query(User).filter(User.email == email).one()
        token = user.reset_token
        assert token is not None

    r_reset = client.post("/auth/reset-password", json={"token": token, "new_password": "NewP@ssw0rd"})
    assert r_reset.status_code == 200

    ok = client.post("/auth/login", json={"email": email, "password": "NewP@ssw0rd"})
    assert ok.status_code == 200

    bad = client.post("/auth/login", json={"email": email, "password": "SecureP@ss1"})
    assert bad.status_code == 401


def test_integration_e_multi_user_concurrent_detect_load(db_url, monkeypatch, tmp_path):
    # Separate client instances per thread, shared DB.
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    storage = getattr(limiter, "storage", None) or getattr(limiter, "_storage", None)
    if storage is not None:
        if hasattr(storage, "reset"):
            storage.reset()
        elif hasattr(storage, "clear"):
            storage.clear()

    frame = _make_base64_image()

    def worker(i: int) -> float:
        with TestClient(app) as c:
            app.state.hand_detector = StubDetector([[{"x": 0.1, "y": 0.2, "z": 0.0} for _ in range(21)]])
            app.state.gesture_classifier = StubClassifier("A", 0.91)
            r = c.post(
                "/auth/signup",
                json={"email": f"u{i}@gmail.com", "password": "SecureP@ss1", "name": "U"},
            )
            token = r.json()["data"]["token"]
            start = time.perf_counter()
            res = c.post("/detect", json={"frame": frame}, headers=_auth_headers(token))
            elapsed = (time.perf_counter() - start) * 1000
            assert res.status_code == 200
            assert res.json()["gesture"] in ("A", None)
            return elapsed

    with ThreadPoolExecutor(max_workers=10) as ex:
        times = list(ex.map(worker, range(10)))

    avg = sum(times) / len(times)
    assert avg < 1500
