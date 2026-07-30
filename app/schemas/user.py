"""Pydantic schemas for the User resource."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    password: str = Field(min_length=8, description="Plain-text password (will be hashed server-side)")


class UserResponse(BaseModel):
    """Schema returned to the client after user creation / retrieval."""

    id: str
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}
