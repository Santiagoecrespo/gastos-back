"""Pydantic schemas for Group endpoints (Participant / nametag architecture)."""

from pydantic import BaseModel, Field


# ── Participant (“nametag”) ────────────────────────────────────────────

class ParticipantOut(BaseModel):
    """Minimal participant representation (replaces UserBrief)."""
    id: str
    name: str


# ── Request schemas ──────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    """Payload for creating a new group."""
    name: str = Field(min_length=1, max_length=150, examples=["Asado del domingo"])
    participant_names: list[str] = Field(
        default_factory=list,
        description="Optional initial participant names (comma-separated from UI)",
    )


# ── Response schemas ──────────────────────────────────────────────────────

class GroupResponse(BaseModel):
    """Returned after creating or listing a group."""
    group_id: str
    name: str
    invite_token: str
    participants: list[ParticipantOut]


class InvitePageResponse(BaseModel):
    """Returned by GET /api/groups/invite/{invite_token} (public)."""
    group_id: str
    group_name: str
    invite_token: str
    participants: list[ParticipantOut]


class JoinResponse(BaseModel):
    """Returned by POST /api/groups/invite/{invite_token}/join."""
    participant_id: str
    participant_name: str
    group_id: str
    group_name: str
    token: str  # Group-scoped JWT


# Kept for backward compat with auth.py (UserBrief is no longer used in expenses)
class UserBrief(BaseModel):
    id: str
    email: str
    model_config = {"from_attributes": True}
