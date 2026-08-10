"""Authentication router: simple email-and-password access."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import USER_TOKEN_EXPIRE_DAYS, create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import ProfileUpdate, UserCreate, UserResponse
from app.services.email_service import EmailDeliveryError, send_login_notification

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register a new user")
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """Create the host account with a validly formatted email and password."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con este email")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        mp_alias=payload.mp_alias,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", summary="Obtain an access token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate with email/password and send a non-blocking login notice."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        send_login_notification(user.email)
    except EmailDeliveryError:
        # A mail outage must not prevent the host from creating a group now.
        pass

    return {
        "access_token": create_access_token(
            data={"sub": user.id}, expires_delta=timedelta(days=USER_TOKEN_EXPIRE_DAYS)
        ),
        "token_type": "bearer",
    }


@router.patch("/profile", response_model=UserResponse, summary="Update authenticated user's profile")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.mp_alias = payload.mp_alias
    db.commit()
    db.refresh(current_user)
    return current_user
