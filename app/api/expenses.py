"""
Expenses router — groups, expenses, balances, settlement.

REFACTORED to Participant / nametag architecture:
  - list_groups / create_group  → use standard User JWT (group creator)
  - get_group / create_expense / get_balances / settle_group → use Guest JWT (Participant)
"""

import asyncio
import secrets as _secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.api.deps import get_current_user, get_current_participant
from app.api.realtime import manager
from app.models.user import User
from app.models.group import Group
from app.models.participant import Participant
from app.models.expense import Expense
from app.models.expense_share import ExpenseShare
from app.schemas.group import GroupCreate, GroupResponse, ParticipantOut
from app.schemas.expense import (
    ExpenseCreate,
    ContributionIn,
    ExpenseResponse,
    ExpenseContributionsUpdate,
    ExpenseListItem,
    ExpenseShareDetail,
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
# SSE — Server-Sent Events (token via query param, no custom header needed)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups/{group_id}/events",
    summary="SSE stream — broadcasts 'refresh' when group data changes",
)
async def group_events(
    group_id: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("type") == "guest" and payload.get("group_id") != group_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token not valid for this group")

    async def stream():
        q = manager.subscribe(group_id)
        try:
            yield "data: connected\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"data: {event}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"  # keeps Railway/nginx from closing idle connection
        finally:
            manager.unsubscribe(group_id, q)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
            participants=[ParticipantOut(id=p.id, name=p.name, mp_alias=p.mp_alias) for p in participants],
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
        host_participant_id=group.host_participant_id,
        participants=[
            ParticipantOut(id=p.id, name=p.name, mp_alias=p.mp_alias, pending_contribution=p.pending_contribution)
            for p in participants
        ],
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

    # Auto-add creator as first participant using their email username
    creator_name = current_user.email.split("@")[0]
    existing_names_lower = {n.strip().lower() for n in payload.participant_names if n.strip()}
    if creator_name.lower() not in existing_names_lower:
        creator_p = Participant(
            name=creator_name,
            group_id=group.id,
            mp_alias=current_user.mp_alias,
        )
        db.add(creator_p)
        participants.append(creator_p)
    else:
        # Creator is in the explicit list — find or create
        creator_p = None

    for raw_name in payload.participant_names:
        name = raw_name.strip()
        if name:
            p = Participant(name=name, group_id=group.id)
            db.add(p)
            participants.append(p)
            if creator_p is None and name.lower() == creator_name.lower():
                creator_p = p

    db.flush()  # get IDs before setting host_participant_id
    group.host_participant_id = creator_p.id if creator_p else (participants[0].id if participants else None)
    db.commit()
    db.refresh(group)
    for p in participants:
        db.refresh(p)

    return GroupResponse(
        group_id=group.id,
        name=group.name,
        invite_token=group.invite_token,
        host_participant_id=group.host_participant_id,
        participants=[
            ParticipantOut(id=p.id, name=p.name, mp_alias=p.mp_alias, pending_contribution=p.pending_contribution)
            for p in participants
        ],
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 1b — Listar gastos del grupo (guest JWT)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups/{group_id}/expenses",
    response_model=list[ExpenseListItem],
    summary="List unsettled expenses for a group (guest JWT)",
)
async def list_expenses(
    group_id: str,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    expenses = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .order_by(Expense.date.desc())
        .all()
    )
    payer_map: dict[str, str] = {}
    for exp in expenses:
        if exp.payer_id not in payer_map:
            p = db.query(Participant).filter(Participant.id == exp.payer_id).first()
            payer_map[exp.payer_id] = p.name if p else "Desconocido"
    return [
        ExpenseListItem(
            expense_id=exp.id,
            description=exp.description,
            amount=exp.amount,
            date=exp.date,
            payer_name=payer_map.get(exp.payer_id, "Desconocido"),
            shares=[
                ExpenseShareDetail(
                    participant_id=share.participant_id,
                    amount_owed=share.amount_owed,
                    contribution=share.contribution,
                )
                for share in exp.shares
            ],
        )
        for exp in expenses
    ]


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 1c — Guardar aporte previo (guest JWT, solo propio)
# ══════════════════════════════════════════════════════════════════════════
from pydantic import BaseModel as _BaseModel

class _ContributionPayload(_BaseModel):
    amount: float = 0.0


@router.post(
    "/groups/{group_id}/my-contribution",
    summary="Set pending contribution for current participant (guest JWT)",
)
async def set_my_contribution(
    group_id: str,
    payload: _ContributionPayload,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    participant.pending_contribution = max(0.0, payload.amount)
    db.commit()
    await manager.broadcast(group_id, "refresh")
    return {"participant_id": participant.id, "pending_contribution": participant.pending_contribution}


@router.patch(
    "/groups/{group_id}/expenses/{expense_id}/contributions",
    response_model=ExpenseResponse,
    summary="Correct contributions on an existing expense (host only)",
)
async def update_expense_contributions(
    group_id: str,
    expense_id: str,
    payload: ExpenseContributionsUpdate,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    group = _get_group_or_404(group_id, db)
    if group.host_participant_id and participant.id != group.host_participant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el anfitrión puede corregir aportes")

    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.group_id == group_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")

    shares_by_participant = {share.participant_id: share for share in expense.shares}
    for contribution in payload.contributions:
        share = shares_by_participant.get(contribution.participant_id)
        if not share:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El integrante no pertenece a este gasto")
        if contribution.amount > share.amount_owed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un aporte no puede superar la parte que le corresponde a ese integrante",
            )
        share.contribution = contribution.amount

    db.commit()
    await manager.broadcast(group_id, "refresh")
    return ExpenseResponse(
        expense_id=expense.id,
        amount=expense.amount,
        split_per_person=round(expense.amount / len(expense.shares), 2) if expense.shares else 0,
        shares=[ShareOut(participant_id=share.participant_id, amount_owed=share.amount_owed) for share in expense.shares],
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 2 — Registrar gasto (JWT de participante/guest — solo anfitrión)
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
    group = _get_group_or_404(group_id, db)

    # Only the host can register expenses
    if group.host_participant_id and participant.id != group.host_participant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el anfitrión puede registrar gastos",
        )

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

    # Build contribution map: explicit payload first, then pending_contribution fallback
    contrib_map: dict[str, float] = {c.participant_id: c.amount for c in payload.contributions}
    for p in all_participants:
        if p.id not in contrib_map and p.pending_contribution > 0:
            contrib_map[p.id] = p.pending_contribution

    contrib_total = sum(contrib_map.values())
    if contrib_total > payload.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contribuciones superan el monto total del gasto",
        )

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
        contribution = contrib_map.get(p.id, 0.0)
        if contribution > split_per_person:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La contribución de {p.name} supera su parte ({split_per_person})",
            )
        share = ExpenseShare(
            expense_id=expense.id,
            participant_id=p.id,
            amount_owed=split_per_person,
            contribution=contribution,
        )
        db.add(share)
        shares_out.append(ShareOut(participant_id=p.id, amount_owed=split_per_person))

    db.commit()
    db.refresh(expense)

    # Reset pending contributions after expense is created
    for p in all_participants:
        p.pending_contribution = 0.0
    db.commit()

    await manager.broadcast(group_id, "refresh")
    return ExpenseResponse(
        expense_id=expense.id,
        amount=expense.amount,
        split_per_person=split_per_person,
        shares=shares_out,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 2b — Eliminar gasto individual (guest JWT — solo anfitrión)
# ══════════════════════════════════════════════════════════════════════════
@router.delete(
    "/groups/{group_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a single expense (guest JWT, host only)",
)
async def delete_expense(
    group_id: str,
    expense_id: str,
    db: Session = Depends(get_db),
    participant: Participant = Depends(get_current_participant),
):
    _assert_in_group(participant, group_id)
    group = _get_group_or_404(group_id, db)
    if group.host_participant_id and participant.id != group.host_participant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el anfitrión puede eliminar gastos")
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.group_id == group_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")
    db.delete(expense)
    db.commit()
    await manager.broadcast(group_id, "refresh")


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
        p.id: ParticipantOut(id=p.id, name=p.name, mp_alias=p.mp_alias, pending_contribution=p.pending_contribution)
        for p in all_participants
    }
    net: dict[str, float] = {p.id: 0.0 for p in all_participants}

    expenses = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .all()
    )

    today = date.today()
    inflation_applied = False
    inflation_unavailable = False
    inflation_reference_date = today

    for expense in expenses:
        info = await adjust_for_inflation(expense.amount, expense.date, today)
        adjusted_amount = info["adjusted"]
        inflation_applied = inflation_applied or info["inflation_applied"]
        inflation_unavailable = inflation_unavailable or not info["inflation_applied"]
        if info["inflation_applied"]:
            inflation_reference_date = info["reference_date"]

        if expense.payer_id in net:
            net[expense.payer_id] += adjusted_amount

        original_total = expense.amount
        for share in expense.shares:
            if share.participant_id in net:
                effective_owed = share.amount_owed - share.contribution
                proportion = (effective_owed / original_total) if original_total else 0
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
                reference_date=inflation_reference_date,
            ))
        creditors[ci] = (creditor_id, credit - transfer)
        debtors[di] = (debtor_id, debt - transfer)
        if creditors[ci][1] < 0.01:
            ci += 1
        if debtors[di][1] < 0.01:
            di += 1

    if inflation_applied:
        inflation_note = "Los importes incluyen el ajuste según el IPC nacional publicado por INDEC."
        if inflation_unavailable:
            inflation_note += " Los gastos sin un IPC aplicable se mantienen sin cambios."
    elif expenses and inflation_unavailable:
        inflation_note = "Sin ajuste por inflación: INDEC no tiene un IPC aplicable para esas fechas o no se pudo consultar."
    else:
        inflation_note = "No hay gastos pendientes para ajustar."

    return BalanceResponse(
        group_id=group_id,
        balances=transactions,
        total_transactions=len(transactions),
        all_settled=len(expenses) == 0,
        inflation_note=inflation_note,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 5 — Eliminar grupo (JWT de usuario — solo el creador)
# ══════════════════════════════════════════════════════════════════════════
@router.delete(
    "/groups/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a group and all its data (user JWT, creator only)",
)
async def delete_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    if group.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenés permiso para eliminar este grupo")
    db.delete(group)
    db.commit()


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
    await manager.broadcast(group_id, "refresh")
    return SettleResponse(message="Grupo saldado correctamente", expenses_settled=count)
