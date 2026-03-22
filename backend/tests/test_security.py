import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app import db as db_module
from app.security import create_access_token, create_refresh_token, decode_token, validate_password_strength
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "security_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    command.upgrade(_alembic_config(db_url), "head")
    db_module.configure_database(db_url)
    return TestClient(app)


def test_password_strength_rules():
    assert validate_password_strength("SecureP@ss1") is True
    assert validate_password_strength("password") is False
    assert validate_password_strength("Password1") is False
    assert validate_password_strength("Pass@word") is False


def test_access_and_refresh_token_types_differ():
    a = create_access_token(user_id=1)
    r = create_refresh_token(user_id=1)
    assert decode_token(a)["type"] == "access"
    assert decode_token(r)["type"] == "refresh"


def test_protected_route_rejects_refresh_token_as_bearer(client):
    signup = client.post(
        "/auth/signup",
        json={"email": "sec@gmail.com", "password": "SecureP@ss1", "name": "Sec"},
    )
    assert signup.status_code == 200

    refresh = create_refresh_token(user_id=1)
    r = client.get("/auth/profile", headers={"Authorization": f"Bearer {refresh}"})
    assert r.status_code == 401


def test_refresh_cookie_is_httponly_on_login(client):
    client.post(
        "/auth/signup",
        json={"email": "cookie@gmail.com", "password": "SecureP@ss1", "name": "Cookie"},
    )
    r = client.post("/auth/login", json={"email": "cookie@gmail.com", "password": "SecureP@ss1"})
    assert r.status_code == 200
    set_cookie = r.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie
