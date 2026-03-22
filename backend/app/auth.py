import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.email_utils import send_reset_email
from app.models import User
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    validate_password_strength,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer(auto_error=False)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL") or "http://localhost:5173"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    frontend_url = _frontend_url().strip()
    inferred_prod = frontend_url.startswith("https://")

    secure_env = os.getenv("COOKIE_SECURE")
    if secure_env is not None:
        secure = secure_env.strip().lower() in {"1", "true", "yes"}
    else:
        secure = inferred_prod

    samesite_env = os.getenv("COOKIE_SAMESITE")
    if samesite_env is not None and samesite_env.strip():
        samesite = samesite_env.strip().lower()
    else:
        samesite = "none" if inferred_prod else "lax"

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def _error_response(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": True, "message": message})


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _get_user_by_email(db: Session, email: str) -> User | None:
    norm = _normalize_email(email)
    if not norm:
        return None
    # Case-insensitive match (works for legacy rows that may not be lowercased)
    return db.scalar(select(User).where(func.lower(User.email) == norm))


def _get_user_by_reset_token(db: Session, token: str) -> User | None:
    return db.scalar(select(User).where(User.reset_token == token))


@router.post("/signup")
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    email_norm = _normalize_email(str(payload.email))
    existing = _get_user_by_email(db, email_norm)
    if existing:
        return _error_response(status.HTTP_400_BAD_REQUEST, "Email already exists")

    if not validate_password_strength(payload.password):
        return _error_response(status.HTTP_400_BAD_REQUEST, "Weak password")

    user = User(
        email=email_norm,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)
    _set_refresh_cookie(response, refresh_token)

    return {"success": True, "data": {"token": access_token}}


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, _normalize_email(str(payload.email)))
    if not user or not verify_password(payload.password, user.hashed_password):
        return _error_response(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)
    _set_refresh_cookie(response, refresh_token)

    return {"success": True, "data": {"token": access_token}}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, payload.email)
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = (datetime.now(UTC) + timedelta(hours=1)).replace(tzinfo=None)
        db.add(user)
        db.commit()

        reset_link = f"{_frontend_url()}/reset-password?token={token}"
        send_reset_email(to_email=payload.email, reset_link=reset_link)

    msg = "If email exists, reset link sent"
    return {"success": True, "data": {"message": msg}, "message": msg}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = _get_user_by_reset_token(db, payload.token)
    if not user:
        return _error_response(status.HTTP_400_BAD_REQUEST, "Invalid reset token")

    if not user.reset_token_expires:
        return _error_response(status.HTTP_400_BAD_REQUEST, "Reset token expired")

    if datetime.now(UTC).replace(tzinfo=None) > user.reset_token_expires:
        return _error_response(status.HTTP_400_BAD_REQUEST, "Reset token expired")

    if not validate_password_strength(payload.new_password):
        return _error_response(status.HTTP_400_BAD_REQUEST, "Weak password")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.add(user)
    db.commit()

    return {"success": True, "data": {"message": "Password reset successful"}}


@router.post("/refresh-token")
def refresh_token(response: Response, refresh_token: str | None = Cookie(default=None)):
    if not refresh_token:
        return _error_response(status.HTTP_401_UNAUTHORIZED, "Unauthorized")

    try:
        payload = decode_token(refresh_token)
    except Exception:
        return _error_response(status.HTTP_401_UNAUTHORIZED, "Unauthorized")

    if payload.get("type") != "refresh":
        return _error_response(status.HTTP_401_UNAUTHORIZED, "Unauthorized")

    user_id = int(payload.get("sub"))
    access_token = create_access_token(user_id=user_id)
    new_refresh_token = create_refresh_token(user_id=user_id)
    _set_refresh_cookie(response, new_refresh_token)

    return {"success": True, "data": {"token": access_token}}


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    token = creds.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user_id = int(payload.get("sub"))
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


@router.get("/profile")
def profile(user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
        },
    }


@router.put("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.email:
        new_email = _normalize_email(str(payload.email))
        if new_email != user.email:
            existing = _get_user_by_email(db, new_email)
            if existing and existing.id != user.id:
                return _error_response(status.HTTP_400_BAD_REQUEST, "Email already exists")
            user.email = new_email

    if payload.name is not None:
        user.name = payload.name

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
        },
    }


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.hashed_password):
        return _error_response(status.HTTP_400_BAD_REQUEST, "Invalid current password")

    if not validate_password_strength(payload.new_password):
        return _error_response(status.HTTP_400_BAD_REQUEST, "Weak password")

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()

    return {"success": True, "data": {"message": "Password updated"}}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="refresh_token", path="/")
    return {"success": True, "data": {"message": "Logged out"}}
