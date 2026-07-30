"""
Expenses router — group management, expense tracking, balances, and settlement.

All endpoints require authentication via ``Depends(get_current_user)``.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.user_group import UserGroup
from app.models.expense import Expense
from app.models.expense_share import ExpenseShare
from app.schemas.group import GroupCreate, GroupResponse, UserBrief
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
    """Return the Group or raise 404."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grupo no encontrado",
        )
    return group


def _assert_membership(group: Group, user_id: str, db: Session) -> None:
    """Raise 403 if the user is not a member of the group."""
    is_member = (
        db.query(UserGroup)
        .filter(UserGroup.group_id == group.id, UserGroup.user_id == user_id)
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No sos miembro de este grupo",
        )


def _get_group_member_ids(group_id: str, db: Session) -> list[str]:
    """Return a list of user IDs that belong to the group."""
    rows = db.query(UserGroup.user_id).filter(UserGroup.group_id == group_id).all()
    return [r[0] for r in rows]


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 1 — Crear grupo
# ══════════════════════════════════════════════════════════════════════════
@router.post(
    "/groups",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense group",
)
async def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a group and add members.

    The creator is automatically included as a member even if their ID
    is not in ``member_ids``.
    """
    # Deduplicate and ensure creator is included
    all_member_ids = set(payload.member_ids)
    all_member_ids.add(current_user.id)

    # Validate every member exists
    members: list[User] = []
    for uid in all_member_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Usuario {uid} no encontrado",
            )
        members.append(user)

    # Create group
    group = Group(name=payload.name, created_by=current_user.id)
    db.add(group)
    db.flush()  # get group.id before creating UserGroup rows

    # Create memberships
    for user in members:
        db.add(UserGroup(group_id=group.id, user_id=user.id))

    db.commit()
    db.refresh(group)

    return GroupResponse(
        group_id=group.id,
        name=group.name,
        members=[UserBrief(id=u.id, email=u.email) for u in members],
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 2 — Registrar gasto
# ══════════════════════════════════════════════════════════════════════════
@router.post(
    "/groups/{group_id}/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new expense and split equally",
)
async def create_expense(
    group_id: str,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register an expense, split it equally among all group members,
    and persist one ``ExpenseShare`` per member.
    """
    group = _get_group_or_404(group_id, db)
    _assert_membership(group, current_user.id, db)

    # Validate payer is a member
    member_ids = _get_group_member_ids(group_id, db)
    if payload.payer_id not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El pagador {payload.payer_id} no es miembro del grupo",
        )

    # Create expense
    expense = Expense(
        group_id=group.id,
        payer_id=payload.payer_id,
        amount=payload.amount,
        description=payload.description,
        date=payload.date,
    )
    db.add(expense)
    db.flush()

    # Split equally
    split_per_person = round(payload.amount / len(member_ids), 2)

    shares_out: list[ShareOut] = []
    for uid in member_ids:
        share = ExpenseShare(
            expense_id=expense.id,
            user_id=uid,
            amount_owed=split_per_person,
        )
        db.add(share)
        shares_out.append(ShareOut(user_id=uid, amount_owed=split_per_person))

    db.commit()
    db.refresh(expense)

    return ExpenseResponse(
        expense_id=expense.id,
        amount=expense.amount,
        split_per_person=split_per_person,
        shares=shares_out,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 3 — Balance del grupo (inflation-adjusted + minimum cash flow)
# ══════════════════════════════════════════════════════════════════════════
@router.get(
    "/groups/{group_id}/balances",
    response_model=BalanceResponse,
    summary="Get inflation-adjusted balances and optimised transfers",
)
async def get_balances(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _assert_membership(group, current_user.id, db)

    member_ids = _get_group_member_ids(group_id, db)

    # ── PASO 1: Balance neto ajustado por usuario ─────────────────────
    net: dict[str, float] = {uid: 0.0 for uid in member_ids}

    # Unsettled expenses for this group
    expenses = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .all()
    )

    today = date.today()

    for expense in expenses:
        info = await adjust_for_inflation(expense.amount, expense.date, today)
        adjusted_amount = info["adjusted"]

        # Credit the payer
        if expense.payer_id in net:
            net[expense.payer_id] += adjusted_amount

        # Debit each share holder (adjusted proportionally)
        original_total = expense.amount
        for share in expense.shares:
            if share.user_id in net:
                # Proportion of this share relative to original total
                proportion = share.amount_owed / original_total if original_total else 0
                net[share.user_id] -= adjusted_amount * proportion

    # ── PASO 2: Minimum Cash Flow (greedy) ────────────────────────────
    # Build creditor/debtor lists (ignore tiny rounding diffs)
    creditors: list[tuple[str, float]] = []
    debtors: list[tuple[str, float]] = []

    for uid, balance in net.items():
        if balance > 0.01:
            creditors.append((uid, balance))
        elif balance < -0.01:
            debtors.append((uid, -balance))  # store as positive

    # Sort both by amount descending
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    # Build a user lookup for the response
    user_map: dict[str, UserBrief] = {}
    for uid in member_ids:
        user = db.query(User).filter(User.id == uid).first()
        if user:
            user_map[uid] = UserBrief(id=user.id, email=user.email)

    transactions: list[BalanceTransaction] = []
    ci = 0  # creditor index
    di = 0  # debtor index

    while ci < len(creditors) and di < len(debtors):
        creditor_id, credit = creditors[ci]
        debtor_id, debt = debtors[di]

        transfer = min(credit, debt)

        if transfer >= 0.01:
            transactions.append(
                BalanceTransaction(
                    from_user=user_map[debtor_id],
                    to_user=user_map[creditor_id],
                    amount_adjusted=round(transfer, 2),
                    reference_date=today,
                )
            )

        creditors[ci] = (creditor_id, credit - transfer)
        debtors[di] = (debtor_id, debt - transfer)

        if creditors[ci][1] < 0.01:
            ci += 1
        if debtors[di][1] < 0.01:
            di += 1

    all_settled = len(expenses) == 0

    return BalanceResponse(
        group_id=group.id,
        balances=transactions,
        total_transactions=len(transactions),
        all_settled=all_settled,
    )


# ══════════════════════════════════════════════════════════════════════════
# ENDPOINT 4 — Marcar grupo como saldado
# ══════════════════════════════════════════════════════════════════════════
@router.patch(
    "/groups/{group_id}/settle",
    response_model=SettleResponse,
    summary="Mark all pending expenses as settled",
)
async def settle_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_group_or_404(group_id, db)
    _assert_membership(group, current_user.id, db)

    count = (
        db.query(Expense)
        .filter(Expense.group_id == group_id, Expense.is_settled == False)  # noqa: E712
        .update({Expense.is_settled: True})
    )
    db.commit()

    return SettleResponse(
        message="Grupo saldado correctamente",
        expenses_settled=count,
    )
