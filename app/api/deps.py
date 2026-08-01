"""
Shared FastAPI dependencies for authentication / authorisation.

Two dependency types:
  - get_current_user   → validates a standard User JWT (type: "user" or no type field)
  - get_current_participant → validates a Group-scoped Guest JWT (type: "guest")
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.participant import Participant

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode a standard User JWT and return the User ORM instance."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # Reject guest tokens on user-only endpoints
    if payload.get("type") == "guest":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_participant(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Participant:
    """Decode a Group-scoped Guest JWT and return the Participant ORM instance.

    The token payload must contain:
      { "sub": participant_id, "group_id": group_id, "type": "guest" }
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials — guest token required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None or payload.get("type") != "guest":
        raise credentials_exception

    participant_id: str | None = payload.get("sub")
    group_id: str | None = payload.get("group_id")
    if not participant_id or not group_id:
        raise credentials_exception

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None or participant.group_id != group_id:
        raise credentials_exception

    return participant
