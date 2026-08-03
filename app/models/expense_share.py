"""ExpenseShare ORM model — how much each Participant owes for a given expense."""

import uuid

from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ExpenseShare(Base):
    __tablename__ = "expense_shares"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    expense_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Renamed from user_id; now references Participant instead of User
    participant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount_owed: Mapped[float] = mapped_column(Float, nullable=False)
    contribution: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")

    # Relationships
    expense: Mapped["Expense"] = relationship("Expense", back_populates="shares")
    participant: Mapped["Participant"] = relationship("Participant", back_populates="expense_shares")

    def __repr__(self) -> str:
        return f"<ExpenseShare participant={self.participant_id} owes={self.amount_owed}>"
