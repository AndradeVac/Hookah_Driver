from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order

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

    def get_recent_by_customer(self, customer_id: UUID, limit: int) -> list[Order]:
        statement = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def update(self, order: Order) -> Order:
        self.db.flush()
        self.db.refresh(order)
        return order
