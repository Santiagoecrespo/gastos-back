"""Group ORM model."""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    invite_token: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        default=lambda: secrets.token_urlsafe(16),
        index=True,
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="created_groups")
    members: Mapped[list["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="group",
        cascade="all, delete-orphan",
    )
    expenses: Mapped[list["Expense"]] = relationship(
        "Expense",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Group {self.name}>"
