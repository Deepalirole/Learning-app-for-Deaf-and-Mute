from datetime import UTC, datetime, timedelta

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import db as db_module
from app.models import User
from main import app


def _alembic_config(db_url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", db_url)
    return cfg


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "auth_test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    return url


@pytest.fixture()
def client(db_url):
    db_module.configure_database(db_url)
    command.upgrade(_alembic_config(db_url), "head")
    return TestClient(app)


def _db_session(db_url: str) -> Session:
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    return Session(engine)


def test_valid_signup(client):
    res = client.post(
        "/auth/signup",
        json={"email": "test@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "token" in body["data"]


def test_duplicate_email_rejection(client):
    payload = {"email": "dup@gmail.com", "password": "SecureP@ss1", "name": "Test User"}
    r1 = client.post("/auth/signup", json=payload)
    assert r1.status_code == 200
    r2 = client.post("/auth/signup", json=payload)
    assert r2.status_code == 400
    assert r2.json() == {"error": True, "message": "Email already exists"}


@pytest.mark.parametrize("bad_email", ["notanemail", "test@", "@gmail.com", "test@.com"])
def test_invalid_email_format(client, bad_email):
    res = client.post(
        "/auth/signup",
        json={"email": bad_email, "password": "SecureP@ss1", "name": "Test User"},
    )
    assert res.status_code == 422


@pytest.mark.parametrize(
    "case",
    [
        {"email": "weak1@gmail.com", "password": "password"},
        {"email": "weak2@gmail.com", "password": "Password1"},
        {"email": "weak3@gmail.com", "password": "Pass@word"},
        {"email": "weak4@gmail.com", "password": "Short1@"},
    ],
)
def test_weak_passwords_rejected(client, case):
    res = client.post(
        "/auth/signup",
        json={"email": case["email"], "password": case["password"], "name": "Test User"},
    )
    assert res.status_code == 400


def test_strong_password_accepted(client):
    res = client.post(
        "/auth/signup",
        json={"email": "strong@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    assert res.status_code == 200


def test_valid_login_sets_cookie(client):
    client.post(
        "/auth/signup",
        json={"email": "login@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    res = client.post("/auth/login", json={"email": "login@gmail.com", "password": "SecureP@ss1"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "token" in body["data"]

    set_cookie = res.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie


def test_wrong_password_login(client):
    client.post(
        "/auth/signup",
        json={"email": "wrongpass@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    res = client.post(
        "/auth/login",
        json={"email": "wrongpass@gmail.com", "password": "WrongP@ss1"},
    )
    assert res.status_code == 401
    assert res.json() == {"error": True, "message": "Invalid credentials"}


def test_forgot_password_existing_email_sets_token(client, db_url):
    client.post(
        "/auth/signup",
        json={"email": "fp@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    res = client.post("/auth/forgot-password", json={"email": "fp@gmail.com"})
    assert res.status_code == 200
    body = res.json()
    assert body.get("message") == "If email exists, reset link sent"
    assert body.get("success") is True
    assert body.get("data", {}).get("message") == "If email exists, reset link sent"

    with _db_session(db_url) as session:
        user = session.query(User).filter(User.email == "fp@gmail.com").one()
        assert user.reset_token is not None
        assert user.reset_token_expires is not None


def test_forgot_password_non_existing_email_same_message(client):
    res = client.post("/auth/forgot-password", json={"email": "unknown@fake.com"})
    assert res.status_code == 200
    body = res.json()
    assert body.get("message") == "If email exists, reset link sent"
    assert body.get("success") is True
    assert body.get("data", {}).get("message") == "If email exists, reset link sent"


def test_password_reset_with_valid_token(client, db_url):
    client.post(
        "/auth/signup",
        json={"email": "reset@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    client.post("/auth/forgot-password", json={"email": "reset@gmail.com"})

    with _db_session(db_url) as session:
        user = session.query(User).filter(User.email == "reset@gmail.com").one()
        token = user.reset_token
        assert token is not None

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "NewP@ssw0rd"})
    assert res.status_code == 200

    with _db_session(db_url) as session:
        user = session.query(User).filter(User.email == "reset@gmail.com").one()
        assert user.reset_token is None
        assert user.reset_token_expires is None

    ok = client.post("/auth/login", json={"email": "reset@gmail.com", "password": "NewP@ssw0rd"})
    assert ok.status_code == 200

    bad = client.post("/auth/login", json={"email": "reset@gmail.com", "password": "SecureP@ss1"})
    assert bad.status_code == 401


def test_password_reset_with_expired_token(client, db_url):
    client.post(
        "/auth/signup",
        json={"email": "expired@gmail.com", "password": "SecureP@ss1", "name": "Test User"},
    )
    client.post("/auth/forgot-password", json={"email": "expired@gmail.com"})

    with _db_session(db_url) as session:
        user = session.query(User).filter(User.email == "expired@gmail.com").one()
        user.reset_token_expires = (datetime.now(UTC) - timedelta(hours=2)).replace(tzinfo=None)
        token = user.reset_token
        session.add(user)
        session.commit()

    res = client.post("/auth/reset-password", json={"token": token, "new_password": "NewP@ssw0rd"})
    assert res.status_code == 400
    assert res.json() == {"error": True, "message": "Reset token expired"}


def test_protected_route_without_token(client):
    res = client.get("/auth/profile")
    assert res.status_code == 401


def _signup_and_auth(client: TestClient, email: str = "me@gmail.com") -> str:
    r = client.post(
        "/auth/signup",
        json={"email": email, "password": "SecureP@ss1", "name": "Test User"},
    )
    assert r.status_code == 200
    token = r.json()["data"]["token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return token


def test_profile_with_token_returns_user(client):
    _signup_and_auth(client, "profile@gmail.com")
    r = client.get("/auth/profile")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["email"] == "profile@gmail.com"
    assert "id" in body["data"]


def test_update_profile_updates_name_and_email(client):
    _signup_and_auth(client, "old@gmail.com")

    r = client.put("/auth/profile", json={"name": "New Name", "email": "new@gmail.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["data"]["name"] == "New Name"
    assert body["data"]["email"] == "new@gmail.com"

    # Profile should reflect updates
    r2 = client.get("/auth/profile")
    assert r2.status_code == 200
    assert r2.json()["data"]["email"] == "new@gmail.com"


def test_change_password_rejects_invalid_current_password(client):
    _signup_and_auth(client, "cp1@gmail.com")
    r = client.post(
        "/auth/change-password",
        json={"current_password": "WrongP@ss1", "new_password": "NewP@ssw0rd"},
    )
    assert r.status_code == 400
    assert r.json() == {"error": True, "message": "Invalid current password"}


def test_change_password_allows_login_with_new_password(client):
    # Create user and switch password
    _signup_and_auth(client, "cp2@gmail.com")
    r = client.post(
        "/auth/change-password",
        json={"current_password": "SecureP@ss1", "new_password": "NewP@ssw0rd"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True

    # Old password should fail
    bad = client.post("/auth/login", json={"email": "cp2@gmail.com", "password": "SecureP@ss1"})
    assert bad.status_code == 401

    # New password should work
    ok = client.post("/auth/login", json={"email": "cp2@gmail.com", "password": "NewP@ssw0rd"})
    assert ok.status_code == 200


def test_refresh_token_unauthorized_without_cookie(client):
    r = client.post("/auth/refresh-token")
    assert r.status_code == 401
    assert r.json() == {"error": True, "message": "Unauthorized"}


def test_refresh_token_returns_new_access_token_and_sets_cookie(client):
    # Signup sets refresh_token cookie on the client
    signup = client.post(
        "/auth/signup",
        json={"email": "refresh@gmail.com", "password": "SecureP@ss1", "name": "Refresh"},
    )
    assert signup.status_code == 200

    r = client.post("/auth/refresh-token")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert "token" in body["data"]

    set_cookie = r.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie


def test_logout_clears_refresh_cookie(client):
    client.post(
        "/auth/signup",
        json={"email": "logout@gmail.com", "password": "SecureP@ss1", "name": "Logout"},
    )
    r = client.post("/auth/logout")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True

    set_cookie = r.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie
