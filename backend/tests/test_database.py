import os
import sqlite3

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Base, User, UserProgress, UserStats


def _alembic_config() -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    return cfg


def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture()
def db_url(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    return url


@pytest.fixture()
def engine(db_url):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    from sqlalchemy import event

    event.listen(engine, "connect", _enable_sqlite_foreign_keys)
    return engine


def test_tables_exist_after_migration(db_url):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(cfg, "head")

    db_path = db_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        tables = {r[0] for r in rows}
    finally:
        conn.close()

    assert "users" in tables
    assert "lessons" in tables
    assert "user_progress" in tables
    assert "gesture_history" in tables
    assert "user_stats" in tables


def test_foreign_key_constraints_work(db_url, engine):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")

    with Session(engine) as session:
        progress = UserProgress(user_id=999999, lesson_id=1, completed=False, attempts=0)
        session.add(progress)
        with pytest.raises(IntegrityError):
            session.commit()


def test_email_uniqueness_constraint(db_url, engine):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")

    with Session(engine) as session:
        u1 = User(email="dup@example.com", hashed_password="x", name="A")
        u2 = User(email="dup@example.com", hashed_password="y", name="B")
        session.add_all([u1, u2])
        with pytest.raises(IntegrityError):
            session.commit()


def test_user_model_fields_match_schema(db_url, engine):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")

    user = User(email="fields@example.com", hashed_password="x", name="Fields")

    assert hasattr(user, "id")
    assert hasattr(user, "email")
    assert hasattr(user, "hashed_password")
    assert hasattr(user, "name")
    assert hasattr(user, "created_at")
    assert hasattr(user, "last_active")
    assert hasattr(user, "reset_token")
    assert hasattr(user, "reset_token_expires")


def test_migration_rollback_works(db_url):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)

    command.upgrade(cfg, "head")
    command.downgrade(cfg, "-1")


def test_userstats_auto_initializes_on_user_creation(db_url, engine):
    cfg = _alembic_config()
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")

    with Session(engine) as session:
        user = User(email="stats@example.com", hashed_password="x", name="Stats")
        session.add(user)
        session.commit()

        stats = session.get(UserStats, user.id)
        assert stats is not None
        assert stats.total_lessons == 0
        assert stats.current_streak == 0
        assert stats.total_xp == 0
        assert stats.avg_accuracy == 0.0
