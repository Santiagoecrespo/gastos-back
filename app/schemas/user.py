"""Pydantic schemas for the User resource."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    password: str = Field(min_length=8)
    mp_alias: Optional[str] = None


class EmailCodeRequest(BaseModel):
    """Starts passwordless sign-in. Receiving the code proves mailbox ownership."""

    email: EmailStr
    mp_alias: Optional[str] = Field(default=None, max_length=100)


class EmailCodeVerify(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class ProfileUpdate(BaseModel):
    mp_alias: Optional[str] = None


class UserResponse(BaseModel):
    """Schema returned to the client after user creation / retrieval."""
    id: str
    email: EmailStr
    mp_alias: Optional[str] = None
    email_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
