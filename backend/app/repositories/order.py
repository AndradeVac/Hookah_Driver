from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, load_only, selectinload

from app.models.order import Order, OrderStatus

_ORDER_LOAD_OPTIONS = (
    selectinload(Order.items),
    selectinload(Order.status_history),
    selectinload(Order.customer),
)


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, order: Order) -> Order:
        self.db.add(order)
        self.db.flush()
        self.db.refresh(order)
        return order

    def get_by_id(self, order_id: UUID) -> Order | None:
        statement = select(Order).options(*_ORDER_LOAD_OPTIONS).where(Order.id == order_id)
        return self.db.scalar(statement)

    def get_by_public_token(self, public_token: UUID) -> Order | None:
        return self.db.scalar(select(Order).where(Order.public_token == public_token))

    def get_all(self, limit: int | None = None) -> list[Order]:
        statement = (
            select(Order)
            .options(*_ORDER_LOAD_OPTIONS)
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def get_public_board(self) -> list[Order]:
        statement = (
            select(Order)
            .options(load_only(Order.order_number, Order.status, Order.created_at))
            .where(Order.status.in_((OrderStatus.RECEIVED, OrderStatus.PREPARING, OrderStatus.READY)))
            .order_by(Order.created_at, Order.order_number)
        )
        return list(self.db.scalars(statement).all())

    def get_recent_by_customer(self, customer_id: UUID, limit: int) -> list[Order]:
        """Orders that actually reached the lounge (never-paid and cancelled ones are left out)."""
        statement = (
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.customer_id == customer_id,
                Order.status.not_in((OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED)),
            )
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def update(self, order: Order) -> Order:
        self.db.flush()
        self.db.refresh(order)
        return order

    def delete(self, order_id: UUID) -> bool:
        """Delete a specific order by ID."""
        from sqlalchemy import delete
        from app.models.order_item import OrderItem
        from app.models.order_status_history import OrderStatusHistory
        
        # First, delete related items and status history
        self.db.execute(delete(OrderItem).where(OrderItem.order_id == order_id))
        self.db.execute(delete(OrderStatusHistory).where(OrderStatusHistory.order_id == order_id))
        
        # Then delete the order
        result = self.db.execute(delete(Order).where(Order.id == order_id))
        return result.rowcount > 0

    def delete_all(self) -> int:
        """Delete all orders. Returns the count of deleted orders."""
        from sqlalchemy import delete
        from app.models.order_item import OrderItem
        from app.models.order_status_history import OrderStatusHistory
        
        # Delete items first (cascading manually)
        self.db.execute(delete(OrderItem))
        self.db.execute(delete(OrderStatusHistory))
        
        # Then delete orders
        result = self.db.execute(delete(Order))
        return result.rowcount
