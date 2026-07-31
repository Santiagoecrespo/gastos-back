"""Pydantic schemas for Group endpoints."""

from pydantic import BaseModel, Field


# ── Request schemas ───────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    """Payload for creating a new group."""

    name: str = Field(min_length=1, max_length=150, examples=["Asado del domingo"])


# ── Response schemas ──────────────────────────────────────────────────────

class UserBrief(BaseModel):
    """Minimal user representation used inside group/balance responses."""

    id: str
    email: str

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    """Returned after creating or listing groups."""

    group_id: str
    name: str
    members: list[UserBrief]
    invite_token: str


class InviteInfoResponse(BaseModel):
    """Returned by GET /join/{invite_token} (public)."""

    group_id: str
    group_name: str
    invite_token: str


class JoinGroupResponse(BaseModel):
    """Returned by POST /join/{invite_token}."""

    group_id: str
    group_name: str
    message: str
