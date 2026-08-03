"""
Participant ORM model.

Replaces the old UserGroup + User-based membership model.
A Participant is a named member of a Group with no auth credentials of their own —
access is granted exclusively via the group's invite_token and a Group-scoped JWT.
"""

import uuid

from typing import Optional

from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Participant(Base):
    __tablename__ = "participants"

    # Enforce one name per group
    __table_args__ = (
        UniqueConstraint("group_id", "name", name="uq_group_participant_name"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    mp_alias: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    group_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    group: Mapped["Group"] = relationship("Group", back_populates="participants")
    paid_expenses: Mapped[list["Expense"]] = relationship(
        "Expense", back_populates="payer"
    )
    expense_shares: Mapped[list["ExpenseShare"]] = relationship(
        "ExpenseShare", back_populates="participant"
    )

    def __repr__(self) -> str:
        return f"<Participant {self.name!r} group={self.group_id}>"
