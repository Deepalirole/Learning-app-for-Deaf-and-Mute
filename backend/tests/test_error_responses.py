import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app import db as db_module
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "errors_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)
    return TestClient(app)


def test_lesson_detail_not_found_returns_404_error_envelope(client):
    r = client.get("/learn/lesson/999999")
    assert r.status_code == 404
    assert r.json() == {"error": True, "message": "Lesson not found"}


def test_complete_lesson_not_found_returns_404_error_envelope(client):
    # Needs auth token
    s = client.post(
        "/auth/signup",
        json={"email": "err@gmail.com", "password": "SecureP@ss1", "name": "Err"},
    )
    token = s.json()["data"]["token"]
    r = client.post("/learn/complete/999999", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404
    assert r.json() == {"error": True, "message": "Lesson not found"}


def test_reset_password_invalid_token_returns_400_error_envelope(client):
    r = client.post("/auth/reset-password", json={"token": "bad", "new_password": "NewP@ssw0rd"})
    assert r.status_code == 400
    assert r.json() == {"error": True, "message": "Invalid reset token"}


def test_profile_requires_auth_returns_401(client):
    r = client.get("/auth/profile")
    assert r.status_code == 401
