"""Pydantic schemas for Group endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


# ── Request schemas ───────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    """Payload for creating a new group."""

    name: str = Field(min_length=1, max_length=150, examples=["Asado del domingo"])
    member_ids: list[str] = Field(
        default_factory=list,
        description="User IDs to add as members (creator is added automatically)",
    )
    member_emails: list[str] = Field(
        default_factory=list,
        description="User emails to add as members (resolved server-side)",
    )


# ── Response schemas ──────────────────────────────────────────────────────

class UserBrief(BaseModel):
    """Minimal user representation used inside group/balance responses."""

    id: str
    email: str

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    """Returned after creating a group."""

    group_id: str
    name: str
    members: list[UserBrief]
