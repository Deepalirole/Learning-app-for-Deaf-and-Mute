import os
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker


def _get_database_url() -> str:
    return os.getenv("DATABASE_URL") or "sqlite:///./sign_language_app.db"


def _normalize_database_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return u

    # Render (and some providers) use postgres:// which SQLAlchemy expects as postgresql://
    u_lower = u.lower()
    if u_lower.startswith("postgres://"):
        u = "postgresql://" + u[len("postgres://"):]

    # Ensure SQLAlchemy uses psycopg v3 driver when targeting Postgres.
    u_lower = u.lower()
    if u_lower.startswith("postgresql://") and not u_lower.startswith("postgresql+"):
        u = "postgresql+psycopg://" + u[len("postgresql://"):]

    return u


engine = None
SessionLocal = None


def _ensure_sqlite_schema(engine) -> None:
    inspector = inspect(engine)

    if not inspector.has_table("users"):
        return

    existing_cols = {c["name"] for c in inspector.get_columns("users")}
    expected_cols = {
        "name": "TEXT",
        "last_active": "DATETIME",
        "reset_token": "TEXT",
        "reset_token_expires": "DATETIME",
    }

    with engine.begin() as conn:
        for col, coltype in expected_cols.items():
            if col not in existing_cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {coltype}"))

        if "name" in expected_cols and "name" not in existing_cols and "username" in existing_cols:
            conn.execute(text("UPDATE users SET name = username WHERE name IS NULL"))


def configure_database(database_url: str | None = None) -> None:
    global engine
    global SessionLocal

    url = _normalize_database_url(database_url or _get_database_url())

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    engine = create_engine(url, connect_args=connect_args)

    if url.startswith("sqlite"):
        # Do not call Base.metadata.create_all() here: it creates tables without
        # alembic_version, so a later `alembic upgrade` fails with "table already exists".
        # Schema is applied via Alembic (see alembic/versions).
        _ensure_sqlite_schema(engine)

    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


configure_database()
