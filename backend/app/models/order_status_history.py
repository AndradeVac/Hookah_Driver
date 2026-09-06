import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.order import OrderStatus
from app.models.user import User
from app.models.order import Order


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id"),
        nullable=False,
    )

    status: Mapped[OrderStatus] = mapped_column(
        Enum(
            OrderStatus,
            name="order_status",
            native_enum=True,
        ),
        nullable=False,
    )

    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="status_history",
    )

    changed_by_user: Mapped["User | None"] = relationship(
        "User",
        back_populates="status_changes",
    )