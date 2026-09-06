from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.flush()
        self.db.refresh(customer)
        return customer

    def get_by_id(self, customer_id: UUID) -> Customer | None:
        statement = select(Customer).where(Customer.id == customer_id)
        return self.db.scalar(statement)

    def get_all(self) -> list[Customer]:
        statement = select(Customer).order_by(Customer.name)
        return list(self.db.scalars(statement).all())

    def update(self, customer: Customer) -> Customer:
        self.db.flush()
        self.db.refresh(customer)
        return customer
