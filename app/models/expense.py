"""Expense ORM model."""

import uuid

from sqlalchemy import String, Float, Date, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    group_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped["date"] = mapped_column(Date, nullable=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    group: Mapped["Group"] = relationship("Group", back_populates="expenses")
    payer: Mapped["User"] = relationship("User", back_populates="paid_expenses")
    shares: Mapped[list["ExpenseShare"]] = relationship(
        "ExpenseShare",
        back_populates="expense",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Expense ${self.amount} — {self.description[:30]}>"
