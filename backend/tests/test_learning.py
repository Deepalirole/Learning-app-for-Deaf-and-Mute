import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app import db as db_module
from app.models import UserStats
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "learning_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    db_module.configure_database(db_url)
    command.upgrade(_alembic_config(db_url), "head")

    with TestClient(app) as c:
        signup = c.post(
            "/auth/signup",
            json={"email": "learn@gmail.com", "password": "SecureP@ss1", "name": "Learn User"},
        )
        token = signup.json()["data"]["token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


def test_seed_data_completeness(client):
    r = client.get("/learn/levels")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    levels = [x["level"] for x in body["data"]]
    assert levels == ["beginner", "intermediate", "advanced"]


def test_alphabet_lessons_count(client):
    r = client.get("/learn/lessons/beginner?category=alphabet")
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 26
    titles = [x["title"] for x in data]
    assert titles[0] == "A"
    assert titles[-1] == "Z"
    for item in data:
        assert item["title"]
        assert item["gif_url"]
        assert item["description"]
        assert item["xp_reward"]


def test_word_lessons_count_and_titles(client):
    r = client.get("/learn/lessons/intermediate?category=words")
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 10
    titles = {x["title"] for x in data}
    expected = {
        "Hello",
        "Thank You",
        "Please",
        "Sorry",
        "Yes",
        "No",
        "Help",
        "Water",
        "Food",
        "Love",
    }
    assert expected.issubset(titles)


def test_quiz_returns_correct_count_and_valid_options(client):
    r = client.get("/learn/quiz/beginner")
    assert r.status_code == 200
    questions = r.json()["data"]
    assert len(questions) == 5

    for q in questions:
        assert len(q["options"]) == 4
        assert len(set(q["options"])) == 4
        assert q["correct_answer"] in q["options"]


def test_lesson_completion_updates_xp_and_does_not_double(client, db_url):
    r1 = client.post("/learn/complete/1")
    assert r1.status_code == 200

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    with Session(engine) as session:
        stats = session.query(UserStats).first()
        assert stats.total_xp == 10

    r2 = client.post("/learn/complete/1")
    assert r2.status_code == 200

    with Session(engine) as session:
        stats = session.query(UserStats).first()
        assert stats.total_xp == 10


def test_lesson_detail_returns_full_data(client):
    r = client.get("/learn/lesson/1")
    assert r.status_code == 200
    data = r.json()["data"]
    for key in [
        "id",
        "title",
        "level",
        "category",
        "sign_image_url",
        "sign_gif_url",
        "description",
        "xp_reward",
        "landmark_hint",
    ]:
        assert key in data
        assert data[key] is not None


def test_unauthorized_completion_attempt(client):
    # create new client without auth header
    with TestClient(app) as c2:
        r = c2.post("/learn/complete/1")
        assert r.status_code == 401


def test_non_existent_lesson(client):
    r = client.get("/learn/lesson/9999")
    assert r.status_code == 404
    assert r.json() == {"error": True, "message": "Lesson not found"}
