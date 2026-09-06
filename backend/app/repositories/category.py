from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category


class CategoryRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, category: Category) -> Category:
        self.db.add(category)
        self.db.flush()
        self.db.refresh(category)

        return category

    def get_by_id(self, category_id: UUID) -> Category | None:
        statement = select(Category).where(
            Category.id == category_id
        )

        return self.db.scalar(statement)

    def get_all(self) -> list[Category]:
        statement = select(Category).order_by(Category.name)

        return list(self.db.scalars(statement).all())

    def update(self, category: Category) -> Category:
        self.db.flush()
        self.db.refresh(category)

        return category

    def delete(self, category: Category) -> Category:
        category.active = False
        self.db.flush()
        self.db.refresh(category)

        return category