import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


def _get_database_url() -> str:
    return os.getenv("DATABASE_URL") or "sqlite:///./sign_language_app.db"


engine = None
SessionLocal = None


def configure_database(database_url: str | None = None) -> None:
    global engine
    global SessionLocal

    url = database_url or _get_database_url()

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    engine = create_engine(url, connect_args=connect_args)

    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


configure_database()
