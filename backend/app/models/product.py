import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=False,
    )

    flavor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("flavors.id"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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

    category: Mapped["Category"] = relationship(
        "Category",
        back_populates="products",
    )

    flavor: Mapped["Flavor | None"] = relationship(
        "Flavor",
        back_populates="products",
    )

    order_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="product",
    )