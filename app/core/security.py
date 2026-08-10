"""
Security utilities: password hashing (bcrypt) and JWT token management.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me-in-production")
ALGORITHM = "HS256"
USER_TOKEN_EXPIRE_DAYS = 7
# Invite links themselves do not expire. Keep the guest session long-lived too,
# because groups are often settled days or weeks after the original event.
GUEST_TOKEN_EXPIRE_DAYS = 180


# ---------------------------------------------------------------------------
# Password hashing  (using bcrypt directly — passlib is unmaintained)
# ---------------------------------------------------------------------------
def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of *plain_password*."""
    return bcrypt.hashpw(
        plain_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return ``True`` if *plain_password* matches *hashed_password*."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT containing *data* with an expiration claim.

    Parameters
    ----------
    data:
        Payload dictionary.  By convention, use ``{"sub": user_id}``.
    expires_delta:
        Custom lifetime.  Falls back to ``ACCESS_TOKEN_EXPIRE_MINUTES``.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=USER_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and verify a JWT.  Returns the payload dict, or ``None`` on failure."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
