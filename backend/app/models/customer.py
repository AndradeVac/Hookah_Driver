import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="customer",
    )