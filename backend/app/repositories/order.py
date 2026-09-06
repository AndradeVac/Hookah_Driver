from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, order: Order) -> Order:
        self.db.add(order)
        self.db.flush()
        self.db.refresh(order)
        return order

    def get_by_id(self, order_id: UUID) -> Order | None:
        statement = (
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history),
            )
            .where(Order.id == order_id)
        )
        return self.db.scalar(statement)

    def get_all(self) -> list[Order]:
        statement = (
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.status_history),
            )
            .order_by(Order.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def update(self, order: Order) -> Order:
        self.db.flush()
        self.db.refresh(order)
        return order
