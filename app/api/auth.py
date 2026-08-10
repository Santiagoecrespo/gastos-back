"""Authentication router: passwordless email access plus legacy password endpoints."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
    USER_TOKEN_EXPIRE_DAYS,
)
from app.api.deps import get_current_user
from app.models.user import User
from app.models.email_login_code import EmailLoginCode
from app.schemas.user import (
    EmailCodeRequest,
    EmailCodeVerify,
    ProfileUpdate,
    UserCreate,
    UserResponse,
)
from app.services.email_service import EmailDeliveryError, send_login_code

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_MINUTES = 10


def _code_hash(email: str, code: str) -> str:
    return hashlib.sha256(f"{email.lower()}:{code}".encode("utf-8")).hexdigest()


def _as_utc(value: datetime) -> datetime:
    """SQLite returns naive timestamps; PostgreSQL returns aware ones."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


@router.post("/request-code", status_code=status.HTTP_202_ACCEPTED, summary="Email a six-digit access code")
def request_email_code(payload: EmailCodeRequest, db: Session = Depends(get_db)):
    """Send a short-lived code. Mailbox delivery, not just syntax, validates the user."""
    email = str(payload.email).lower()
    code = f"{secrets.randbelow(1_000_000):06d}"

    db.query(EmailLoginCode).filter(EmailLoginCode.email == email).delete()
    login_code = EmailLoginCode(
        email=email,
        code_hash=_code_hash(email, code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
        mp_alias=payload.mp_alias.strip() if payload.mp_alias else None,
    )
    db.add(login_code)
    try:
        # A failed send must not leave a usable code in the database.
        send_login_code(email, code)
        db.commit()
    except EmailDeliveryError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return {"message": "Te enviamos un codigo de 6 digitos", "expires_in_minutes": CODE_TTL_MINUTES}


@router.post("/verify-code", summary="Verify an email access code and start a session")
def verify_email_code(payload: EmailCodeVerify, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    login_code = db.query(EmailLoginCode).filter(EmailLoginCode.email == email).first()
    invalid_code = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Codigo invalido o vencido")
    if not login_code or _as_utc(login_code.expires_at) < datetime.now(timezone.utc):
        if login_code:
            db.delete(login_code)
            db.commit()
        raise invalid_code
    if not hmac.compare_digest(login_code.code_hash, _code_hash(email, payload.code)):
        raise invalid_code

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Password is intentionally random and never exposed: authentication is email-only.
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            mp_alias=login_code.mp_alias,
            email_verified=True,
        )
        db.add(user)
    else:
        user.email_verified = True
        if login_code.mp_alias and not user.mp_alias:
            user.mp_alias = login_code.mp_alias

    db.delete(login_code)
    db.commit()
    db.refresh(user)
    return {
        "access_token": create_access_token(
            data={"sub": user.id}, expires_delta=__import__("datetime").timedelta(days=USER_TOKEN_EXPIRE_DAYS)
        ),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email},
    }


# --------------------------------------------------------------------------
# POST /auth/signup
# --------------------------------------------------------------------------
@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account.

    - Validates that the email is not already taken.
    - Hashes the plain-text password with bcrypt before persisting.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        mp_alias=payload.mp_alias,
        # Kept only for backwards compatibility. New clients use /request-code.
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --------------------------------------------------------------------------
# POST /auth/login
# --------------------------------------------------------------------------
@router.post(
    "/login",
    summary="Obtain an access token",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate with email + password and receive a JWT access token.

    Uses the standard OAuth2 password flow form fields:
    ``username`` (we treat it as email) and ``password``.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verifica tu email con el codigo de acceso antes de iniciar sesion",
        )

    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=__import__("datetime").timedelta(days=USER_TOKEN_EXPIRE_DAYS),
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --------------------------------------------------------------------------
# PATCH /auth/profile
# --------------------------------------------------------------------------
@router.patch(
    "/profile",
    response_model=UserResponse,
    summary="Update authenticated user's profile",
)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.mp_alias = payload.mp_alias
    db.commit()
    db.refresh(current_user)
    return current_user
