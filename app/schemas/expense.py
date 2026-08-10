"""Pydantic schemas for Expense and Balance endpoints (Participant architecture)."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.group import ParticipantOut


# ── Expense request / response ────────────────────────────────────

class ContributionIn(BaseModel):
    participant_id: str
    amount: float = Field(ge=0)


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    description: str = Field(min_length=1)
    date: date
    payer_id: str
    contributions: list[ContributionIn] = []


class ShareOut(BaseModel):
    participant_id: str  # was user_id
    amount_owed: float


class ExpenseResponse(BaseModel):
    expense_id: str
    amount: float
    split_per_person: float
    shares: list[ShareOut]


# ── Balance response ──────────────────────────────────────────────────────

class BalanceTransaction(BaseModel):
    from_participant: ParticipantOut  # was from_user: UserBrief
    to_participant: ParticipantOut    # was to_user: UserBrief
    amount_adjusted: float
    reference_date: date


class BalanceResponse(BaseModel):
    group_id: str
    balances: list[BalanceTransaction]
    total_transactions: int
    all_settled: bool
    inflation_note: str


# ── Settle response ───────────────────────────────────────────────────────

class SettleResponse(BaseModel):
    message: str
    expenses_settled: int


class ExpenseListItem(BaseModel):
    expense_id: str
    description: str
    amount: float
    date: date
    payer_name: str
