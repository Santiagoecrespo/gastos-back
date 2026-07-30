"""User ORM model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    created_groups: Mapped[list["Group"]] = relationship(
        "Group",
        back_populates="creator",
    )
    memberships: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    paid_expenses: Mapped[list["Expense"]] = relationship(
        "Expense",
        back_populates="payer",
    )
    expense_shares: Mapped[list["ExpenseShare"]] = relationship(
        "ExpenseShare",
        back_populates="user",
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"

