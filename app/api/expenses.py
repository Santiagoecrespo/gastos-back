"""
Expenses router — groups, expenses, balances, settlement.

REFACTORED to Participant / nametag architecture:
  - list_groups / create_group  → use standard User JWT (group creator)
  - get_group / create_expense / get_balances / settle_group → use Guest JWT (Participant)
"""

import secrets as _secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_participant
from app.models.user import User
from app.models.group import Group
from app.models.participant import Participant
from app.models.expense import Expense
from app.models.expense_share import ExpenseShare
from app.schemas.group import GroupCreate, GroupResponse, ParticipantOut
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseResponse,
    ShareOut,
    BalanceResponse,
    BalanceTransaction,
    SettleResponse,
)
from app.services.inflation_service import adjust_for_inflation

router = APIRouter(tags=["expenses"])


# ── Helpers ───────────────────────────────────────────────────────────────

def _get_group_or_404(group_id: str, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    return group


def _get_participants(group_id: str, db: Session) -> list[Participant]:
    return db.query(Participant).filter(Participant.group_id == group_id).all()


def _assert_in_group(participant: Participant, group_id: str) -> None:
    if participant.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenes acceso a este grupo")


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 0a — Listar grupos del usuario (JWT de usuario)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups",
    response_model=list[GroupResponse],
    summary="List groups created by the authenticated user",
)
async def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all groups where the user is the creator (for the dashboard)."""
    groups = db.query(Group).filter(Group.created_by == current_user.id).all()
    result = []
    for group in groups:
        participants = _get_participants(group.id, db)
        result.append(GroupResponse(
            group_id=group.id,
            name=group.name,
            invite_token=group.invite_token,
            participants=[ParticipantOut(id=p.id, name=p.name) for p in participants],
        ))
    return result


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 0b — Obtener grupo por ID (JWT de participante/guest)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups/{group_id}",
    response_model=GroupResponse,
    summary="Get group detail (guest JWT required)",
)
async def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    """Returns group with participants list. Requires a group-scoped guest JWT."""
    _assert_in_group(participant, group_id)
    group = _get_group_or_404(group_id, db)
    participants = _get_participants(group_id, db)
    return GroupResponse(
        group_id=group.id,
        name=group.name,
        invite_token=group.invite_token,
        participants=[ParticipantOut(id=p.id, name=p.name) for p in participants],
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 1 — Crear grupo (JWT de usuario)
# ══════════════════════════════════════════════════════════════════════════
@router.post(
    "/groups",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new group (user JWT required)",
)
async def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a group and optionally pre-populates Participants from names list.
    The invite_token is auto-generated and returned for sharing.
    """
    group = Group(
        name=payload.name,
        created_by=current_user.id,
        invite_token=_secrets.token_urlsafe(12),
    )
    db.add(group)
    db.flush()

    participants: list[Participant] = []
    for raw_name in payload.participant_names:
        name = raw_name.strip()
        if name:
            p = Participant(name=name, group_id=group.id)
            db.add(p)
            participants.append(p)

    db.commit()
    db.refresh(group)
    for p in participants:
        db.refresh(p)

    return GroupResponse(
        group_id=group.id,
        name=group.name,
        invite_token=group.invite_token,
        participants=[ParticipantOut(id=p.id, name=p.name) for p in participants],
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 2 — Registrar gasto (JWT de participante/guest)
# ══════════════════════════════════════════════════════════════════════════
@router.post(
    "/groups/{group_id}/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register an expense split equally among participants (guest JWT)",
)
async def create_expense(
    group_id: str,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    _get_group_or_404(group_id, db)

    payer = db.query(Participant).filter(
        Participant.id == payload.payer_id,
        Participant.group_id == group_id,
    ).first()
    if not payer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pagador no es participante de este grupo",
        )

    all_participants = _get_participants(group_id, db)

    expense = Expense(
        group_id=group_id,
        payer_id=payer.id,
        amount=payload.amount,
        description=payload.description,
        date=payload.date,
    )
    db.add(expense)
    db.flush()

    split_per_person = round(payload.amount / len(all_participants), 2)
    shares_out: list[ShareOut] = []
    for p in all_participants:
        share = ExpenseShare(
            expense_id=expense.id,
            participant_id=p.id,
            amount_owed=split_per_person,
        )
        db.add(share)
        shares_out.append(ShareOut(participant_id=p.id, amount_owed=split_per_person))

    db.commit()
    db.refresh(expense)

    return ExpenseResponse(
        expense_id=expense.id,
        amount=expense.amount,
        split_per_person=split_per_person,
        shares=shares_out,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 3 — Balance del grupo ajustado por inflacion (guest JWT)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups/{group_id}/balances",
    response_model=BalanceResponse,
    summary="Get inflation-adjusted balances using minimum-cash-flow (guest JWT)",
)
async def get_balances(
    group_id: str,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    _get_group_or_404(group_id, db)

    all_participants = _get_participants(group_id, db)
    participant_map: dict[str, ParticipantOut] = {
        p.id: ParticipantOut(id=p.id, name=p.name) for p in all_participants
    }
    net: dict[str, float] = {p.id: 0.0 for p in all_participants}

    expenses = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .all()
    )

    today = date.today()

    for expense in expenses:
        info = await adjust_for_inflation(expense.amount, expense.date, today)
        adjusted_amount = info["adjusted"]

        if expense.payer_id in net:
            net[expense.payer_id] += adjusted_amount

        original_total = expense.amount
        for share in expense.shares:
            if share.participant_id in net:
                proportion = share.amount_owed / original_total if original_total else 0
                net[share.participant_id] -= adjusted_amount * proportion

    creditors: list[tuple[str, float]] = []
    debtors: list[tuple[str, float]] = []
    for pid, balance in net.items():
        if balance > 0.01:
            creditors.append((pid, balance))
        elif balance < -0.01:
            debtors.append((pid, -balance))

    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    transactions: list[BalanceTransaction] = []
    ci = di = 0
    while ci < len(creditors) and di < len(debtors):
        creditor_id, credit = creditors[ci]
        debtor_id, debt = debtors[di]
        transfer = min(credit, debt)
        if transfer >= 0.01:
            transactions.append(BalanceTransaction(
                from_participant=participant_map[debtor_id],
                to_participant=participant_map[creditor_id],
                amount_adjusted=round(transfer, 2),
                reference_date=today,
            ))
        creditors[ci] = (creditor_id, credit - transfer)
        debtors[di] = (debtor_id, debt - transfer)
        if creditors[ci][1] < 0.01:
            ci += 1
        if debtors[di][1] < 0.01:
            di += 1

    return BalanceResponse(
        group_id=group_id,
        balances=transactions,
        total_transactions=len(transactions),
        all_settled=len(expenses) == 0,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 4 — Saldar grupo (guest JWT)
# ══════════════════════════════════════════════════════════════════════════
@router.patch(
    "/groups/{group_id}/settle",
    response_model=SettleResponse,
    summary="Mark all pending expenses as settled (guest JWT)",
)
async def settle_group(
    group_id: str,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    _get_group_or_404(group_id, db)

    count = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .update({Expense.is_settled: True})
    )
    db.commit()
    return SettleResponse(message="Grupo saldado correctamente", expenses_settled=count)
