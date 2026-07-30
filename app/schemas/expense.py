"""Pydantic schemas for Expense and Balance endpoints."""

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.group import UserBrief


# ── Expense request / response ────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    """Payload for registering a new expense."""

    amount: float = Field(gt=0, description="Must be greater than 0")
    description: str = Field(min_length=1, examples=["Asado"])
    date: date
    payer_id: str


class ShareOut(BaseModel):
    """Single share in an expense split."""

    user_id: str
    amount_owed: float


class ExpenseResponse(BaseModel):
    """Returned after creating an expense."""

    expense_id: str
    amount: float
    split_per_person: float
    shares: list[ShareOut]


# ── Balance response ──────────────────────────────────────────────────────

class BalanceTransaction(BaseModel):
    """A single optimised transfer suggested by the minimum-cash-flow algorithm."""

    from_user: UserBrief
    to_user: UserBrief
    amount_adjusted: float
    reference_date: date


class BalanceResponse(BaseModel):
    """Full balance breakdown for a group."""

    group_id: str
    balances: list[BalanceTransaction]
    total_transactions: int
    all_settled: bool


# ── Settle response ───────────────────────────────────────────────────────

class SettleResponse(BaseModel):
    """Returned after settling all pending expenses in a group."""

    message: str
    expenses_settled: int
