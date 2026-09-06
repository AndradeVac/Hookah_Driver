from uuid import UUID

from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories.category import CategoryRepository
from app.repositories.flavor import FlavorRepository
from app.repositories.product import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:

    def __init__(self, db: Session):
        self.repository = ProductRepository(db)
        self.category_repository = CategoryRepository(db)
        self.flavor_repository = FlavorRepository(db)
        self.db = db

    def _validate_relationships(
        self,
        category_id: UUID,
        flavor_id: UUID | None,
    ) -> None:
        category = self.category_repository.get_by_id(category_id)
        if category is None or not category.active:
            raise ValueError("Categoria não encontrada ou inativa.")

        if flavor_id is not None:
            flavor = self.flavor_repository.get_by_id(flavor_id)
            if flavor is None or not flavor.active:
                raise ValueError("Sabor não encontrado ou inativo.")

    def create(self, data: ProductCreate) -> Product:
        self._validate_relationships(data.category_id, data.flavor_id)

        product = Product(
            category_id=data.category_id,
            flavor_id=data.flavor_id,
            name=data.name,
            description=data.description,
            price=data.price,
        )

        self.repository.create(product)
        self.db.commit()

        return product

    def get_by_id(self, product_id: UUID) -> Product:
        product = self.repository.get_by_id(product_id)

        if product is None:
            raise ValueError("Produto não encontrado.")

        return product

    def get_all(self) -> list[Product]:
        return self.repository.get_all()

    def update(
        self,
        product_id: UUID,
        data: ProductUpdate,
    ) -> Product:

        product = self.repository.get_by_id(product_id)

        if product is None:
            raise ValueError("Produto não encontrado.")

        if data.category_id is not None:
            self._validate_relationships(data.category_id, product.flavor_id)
            product.category_id = data.category_id

        if "flavor_id" in data.model_fields_set:
            self._validate_relationships(product.category_id, data.flavor_id)
            product.flavor_id = data.flavor_id

        if data.name is not None:
            product.name = data.name

        if data.description is not None:
            product.description = data.description

        if data.price is not None:
            product.price = data.price

        if data.active is not None:
            product.active = data.active

        self.repository.update(product)
        self.db.commit()

        return product

    def delete(self, product_id: UUID) -> Product:
        product = self.repository.get_by_id(product_id)

        if product is None:
            raise ValueError("Produto não encontrado.")

        self.repository.delete(product)
        self.db.commit()

        return product