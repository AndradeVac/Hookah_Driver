from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.category import Category
from app.repositories.category import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:

    def __init__(self, db: Session):
        self.repository = CategoryRepository(db)
        self.db = db

    def create(self, data: CategoryCreate) -> Category:
        existing_category = self.repository.get_by_name(data.name)
        if existing_category is not None and not existing_category.active:
            existing_category.active = True
            self.repository.update(existing_category)
            self.db.commit()
            return existing_category

        category = Category(
            name=data.name,
        )

        self.repository.create(category)
        self.db.commit()

        return category

    def get_by_id(self, category_id: UUID) -> Category:
        category = self.repository.get_by_id(category_id)

        if category is None:
            raise NotFoundError("Categoria não encontrada.")

        return category

    def get_all(self) -> list[Category]:
        return self.repository.get_all()

    def update(
        self,
        category_id: UUID,
        data: CategoryUpdate,
    ) -> Category:

        category = self.repository.get_by_id_any_status(category_id)

        if category is None:
            raise NotFoundError("Categoria não encontrada.")

        if data.name is not None:
            category.name = data.name

        if data.active is not None:
            category.active = data.active

        self.repository.update(category)
        self.db.commit()

        return category

    def delete(self, category_id: UUID) -> Category:
        category = self.repository.get_by_id(category_id)

        if category is None:
            raise NotFoundError("Categoria não encontrada.")

        self.repository.delete(category)
        self.db.commit()

        return category