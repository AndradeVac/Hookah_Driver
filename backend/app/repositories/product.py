from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.flush()
        self.db.refresh(product)

        return product

    def get_by_id(self, product_id: UUID) -> Product | None:
        statement = select(Product).where(
            Product.id == product_id,
            Product.active.is_(True),
        )

        return self.db.scalar(statement)

    def get_all(self) -> list[Product]:
        statement = (
            select(Product)
            .where(Product.active.is_(True))
            .order_by(Product.name)
        )

        return list(self.db.scalars(statement).all())

    def update(self, product: Product) -> Product:
        self.db.flush()
        self.db.refresh(product)

        return product

    def delete(self, product: Product) -> Product:
        product.active = False

        self.db.flush()
        self.db.refresh(product)

        return product