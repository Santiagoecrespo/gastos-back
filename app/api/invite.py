"""Invite-link router — public info + protected join endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.group import Group
from app.models.user import User
from app.models.user_group import UserGroup
from app.schemas.group import InviteInfoResponse, JoinGroupResponse

router = APIRouter(tags=["invite"])


# ══════════════════════════════════════════════════════════════════════════
# GET /join/{invite_token} — public, returns group name + token
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/join/{invite_token}",
    response_model=InviteInfoResponse,
    summary="Get group info from an invite token (public)",
)
def get_invite_info(invite_token: str, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.invite_token == invite_token).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no válida o expirada",
        )
    return InviteInfoResponse(
        group_id=group.id,
        group_name=group.name,
        invite_token=group.invite_token,
    )


# ══════════════════════════════════════════════════════════════════════════
# POST /join/{invite_token} — requires JWT, joins the group (idempotent)
# ══════════════════════════════════════════════════════════════════════════
@router.post(
    "/join/{invite_token}",
    response_model=JoinGroupResponse,
    summary="Join a group via invite token (requires auth)",
)
def join_group(
    invite_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.invite_token == invite_token).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no válida o expirada",
        )

    already_member = (
        db.query(UserGroup)
        .filter(
            UserGroup.group_id == group.id,
            UserGroup.user_id == current_user.id,
        )
        .first()
    )

    if not already_member:
        db.add(UserGroup(group_id=group.id, user_id=current_user.id))
        db.commit()

    return JoinGroupResponse(
        group_id=group.id,
        group_name=group.name,
        message="Te uniste al grupo",
    )
