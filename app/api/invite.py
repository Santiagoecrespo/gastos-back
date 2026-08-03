"""
Invite-link router (Nametag / Zero-Friction architecture).

Two public endpoints — no JWT required:
  GET  /api/groups/invite/{invite_token}       -> group info + participant list
  POST /api/groups/invite/{invite_token}/join  -> magic login, returns guest JWT
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.models.group import Group
from app.models.participant import Participant
from app.schemas.group import InvitePageResponse, JoinResponse, ParticipantOut

router = APIRouter(prefix="/api", tags=["invite"])


class JoinRequest(BaseModel):
    participant_name: str
    mp_alias: Optional[str] = None


@router.get(
    "/groups/invite/{invite_token}",
    response_model=InvitePageResponse,
    summary="Get group info + participant list (public — no auth)",
)
def get_invite_page(invite_token: str, db: Session = Depends(get_db)):
    """Public endpoint. Returns the group name and existing participants so the
    frontend can render the pick-your-name screen."""
    group = db.query(Group).filter(Group.invite_token == invite_token).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no valida",
        )

    participants = (
        db.query(Participant).filter(Participant.group_id == group.id).all()
    )
    return InvitePageResponse(
        group_id=group.id,
        group_name=group.name,
        invite_token=group.invite_token,
        participants=[ParticipantOut(id=p.id, name=p.name, mp_alias=p.mp_alias) for p in participants],
    )


@router.post(
    "/groups/invite/{invite_token}/join",
    response_model=JoinResponse,
    summary="Magic login: join by name and receive a group-scoped JWT",
)
def join_group(
    invite_token: str,
    body: JoinRequest,
    db: Session = Depends(get_db),
):
    """If the participant name already exists in this group, reuses it.
    If it is new, creates a Participant row.
    Returns a Group-scoped JWT payload: { sub: participant_id, group_id, type: guest }
    """
    group = db.query(Group).filter(Group.invite_token == invite_token).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitacion no valida",
        )

    name = body.participant_name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre no puede estar vacio",
        )

    participant = (
        db.query(Participant)
        .filter(Participant.group_id == group.id, Participant.name == name)
        .first()
    )
    if not participant:
        participant = Participant(name=name, group_id=group.id, mp_alias=body.mp_alias)
        db.add(participant)
        db.commit()
        db.refresh(participant)
    elif body.mp_alias and not participant.mp_alias:
        participant.mp_alias = body.mp_alias
        db.commit()
        db.refresh(participant)

    token = create_access_token(data={
        "sub": participant.id,
        "group_id": group.id,
        "type": "guest",
    })

    return JoinResponse(
        participant_id=participant.id,
        participant_name=participant.name,
        group_id=group.id,
        group_name=group.name,
        token=token,
    )
