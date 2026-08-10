"""User ORM model."""

import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import String, DateTime, Boolean
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
    mp_alias: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # A user can only obtain an application token after proving ownership of
    # this address through the one-time code sent by email.
    email_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    # Only kept: groups created by this user (for dashboard listing)
    created_groups: Mapped[list["Group"]] = relationship(
        "Group",
        back_populates="creator",
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
