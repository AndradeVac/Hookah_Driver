from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.brand import Brand


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
            Product.category.has(Category.active.is_(True)),
            or_(
                Product.flavor_id.is_(None),
                Product.flavor.has(
                    Flavor.active.is_(True) & Flavor.brand.has(Brand.active.is_(True)),
                ),
            ),
        )

        return self.db.scalar(statement)

    def get_by_id_any_status(self, product_id: UUID) -> Product | None:
        statement = select(Product).where(Product.id == product_id)

        return self.db.scalar(statement)

    def get_all(self) -> list[Product]:
        statement = select(Product).order_by(Product.name)

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