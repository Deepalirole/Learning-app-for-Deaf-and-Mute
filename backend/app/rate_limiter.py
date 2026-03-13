from slowapi import Limiter
from slowapi.util import get_remote_address

from app.security import decode_token


def _rate_limit_key(request) -> str:
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass

    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
