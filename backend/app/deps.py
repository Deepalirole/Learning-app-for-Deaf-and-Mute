from collections.abc import Generator

from app import db as db_module


def get_db() -> Generator:
    if db_module.SessionLocal is None:
        raise RuntimeError("Database not configured")

    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()
