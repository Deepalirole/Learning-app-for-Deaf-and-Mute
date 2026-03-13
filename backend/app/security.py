import os
import re
from datetime import UTC, datetime, timedelta

import jwt
import bcrypt


def validate_password_strength(password: str) -> bool:
    if len(password) < 8:
        return False
    if re.search(r"[A-Z]", password) is None:
        return False
    if re.search(r"[0-9]", password) is None:
        return False
    if re.search(r"[^A-Za-z0-9]", password) is None:
        return False
    return True


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw, salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def _secret_key() -> str:
    return os.getenv("SECRET_KEY") or "dev-secret-key"


def create_access_token(*, user_id: int, expires_minutes: int = 15) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, _secret_key(), algorithm="HS256")


def create_refresh_token(*, user_id: int, expires_days: int = 7) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=expires_days)).timestamp()),
    }
    return jwt.encode(payload, _secret_key(), algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, _secret_key(), algorithms=["HS256"])
