import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.customer import Customer


class OrderStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    PREPARING = "PREPARING"
    READY = "READY"
    FINISHED = "FINISHED"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    PIX = "PIX"
    CARD = "CARD"
    CASH = "CASH"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="chk_orders_subtotal"),
        CheckConstraint("total >= 0", name="chk_orders_total"),
        Index("idx_orders_created_at", "created_at"),
        Index("idx_orders_customer_id", "customer_id"),
        Index("idx_orders_status", "status"),
        UniqueConstraint("order_number", name="orders_order_number_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    order_number: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        server_default=text("nextval('orders_order_number_seq'::regclass)"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", name="fk_orders_customer", ondelete="RESTRICT"),
        nullable=False,
    )

    status: Mapped[OrderStatus] = mapped_column(
        Enum(
            OrderStatus,
            name="order_status",
            native_enum=True,
        ),
        nullable=False,
        default=OrderStatus.RECEIVED,
        server_default=text("'RECEIVED'::order_status"),
    )

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            name="payment_method",
            native_enum=True,
        ),
        nullable=False,
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="orders",
    )

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
    )

    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory",
        back_populates="order",
    )
    