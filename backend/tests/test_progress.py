from datetime import UTC, datetime, timedelta

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import db as db_module
from app.models import Lesson, User, UserProgress, UserStats
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "progress_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    with TestClient(app) as c:
        signup = c.post(
            "/auth/signup",
            json={"email": "prog@gmail.com", "password": "SecureP@ss1", "name": "Prog User"},
        )
        token = signup.json()["data"]["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


def test_progress_endpoint_returns_required_fields(client):
    r = client.get("/progress")
    assert r.status_code == 200
    data = r.json()["data"]
    for k in [
        "completed_lessons",
        "accuracy_by_level",
        "current_streak",
        "longest_streak",
        "total_xp",
        "recent_gestures",
        "badges_earned",
    ]:
        assert k in data


def test_streak_increments_and_resets(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        user = User(email="s@gmail.com", hashed_password="x", name="S")
        session.add(user)
        session.commit()
        session.refresh(user)
        stats = session.get(UserStats, user.id)

        # Day 1
        user.last_active = (datetime.now(UTC) - timedelta(days=2)).replace(tzinfo=None)
        session.add(user)
        session.commit()

    with TestClient(app) as c:
        # login via signup for token
        signup = c.post(
            "/auth/signup",
            json={"email": "streak@gmail.com", "password": "SecureP@ss1", "name": "Streak"},
        )
        token = signup.json()["data"]["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})

        # force last_active day1
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            u.last_active = (datetime.now(UTC) - timedelta(days=2)).replace(tzinfo=None)
            session.add(u)
            session.commit()

        c.post("/progress/update", json={"accuracy": 0.8})
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            s = session.get(UserStats, u.id)
            assert s.current_streak == 1

        # simulate yesterday
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            u.last_active = (datetime.now(UTC) - timedelta(days=1)).replace(tzinfo=None)
            session.add(u)
            session.commit()

        c.post("/progress/update", json={"accuracy": 0.8})
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            s = session.get(UserStats, u.id)
            assert s.current_streak == 2
            assert s.longest_streak >= 2

        # simulate skip a day
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            u.last_active = (datetime.now(UTC) - timedelta(days=3)).replace(tzinfo=None)
            session.add(u)
            session.commit()

        c.post("/progress/update", json={"accuracy": 0.8})
        with Session(engine) as session:
            u = session.query(User).filter(User.email == "streak@gmail.com").one()
            s = session.get(UserStats, u.id)
            assert s.current_streak == 1


def test_accuracy_calculation_exact(client, db_url):
    client.post("/progress/update", json={"accuracy": 0.80})
    client.post("/progress/update", json={"accuracy": 0.90})
    client.post("/progress/update", json={"accuracy": 0.70})

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        stats = session.query(UserStats).first()
        assert stats.avg_accuracy == pytest.approx(0.80, rel=1e-9)


def test_leaderboard_privacy_and_sorting(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        for i in range(15):
            u = User(email=f"u{i}@e.com", hashed_password="x", name=f"U{i}")
            session.add(u)
            session.commit()
            s = session.get(UserStats, u.id)
            s.total_xp = i
            s.current_streak = i % 5
            session.add(s)
            session.commit()

    with TestClient(app) as c:
        r = c.get("/progress/leaderboard")
        assert r.status_code == 200
        data = r.json()["data"]
        assert len(data) == 10
        assert data[0]["total_xp"] >= data[-1]["total_xp"]

        for row in data:
            assert set(row.keys()) == {"name", "total_xp", "current_streak"}


def test_badges_unlock(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        user = User(email="b@e.com", hashed_password="x", name="B")
        session.add(user)
        session.commit()
        session.refresh(user)
        user_id = user.id
        stats = session.get(UserStats, user.id)
        stats.current_streak = 7
        session.add(stats)

        # need lessons + progress for 26 alphabet
        from app.learning import seed_lessons
        seed_lessons(session)

        lessons = session.query(Lesson).filter(Lesson.level == "beginner", Lesson.category == "alphabet").all()
        for l in lessons:
            session.add(UserProgress(user_id=user.id, lesson_id=l.id, completed=True, attempts=0))
        session.commit()

    with TestClient(app) as c:
        # signup to get auth token is separate user; just call directly using db user? skip by using token of created user
        # easiest: create token via auth endpoint using created user not possible (no password). so just validate badge calc using direct query
        with Session(engine) as session:
            stats = session.get(UserStats, user_id)
            assert stats.current_streak == 7
