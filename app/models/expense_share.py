"""ExpenseShare ORM model — how much each user owes for a given expense."""

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
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    amount_owed: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    expense: Mapped["Expense"] = relationship("Expense", back_populates="shares")
    user: Mapped["User"] = relationship("User", back_populates="expense_shares")

    def __repr__(self) -> str:
        return f"<ExpenseShare user={self.user_id} owes={self.amount_owed}>"
