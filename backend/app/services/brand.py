from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.brand import Brand
from app.repositories.brand import BrandRepository
from app.schemas.brand import BrandCreate, BrandUpdate


class BrandService:

    def __init__(self, db: Session):
        self.repository = BrandRepository(db)
        self.db = db

    def create(self, data: BrandCreate) -> Brand:
        existing_brand = self.repository.get_by_name(data.name)
        if existing_brand is not None and not existing_brand.active:
            existing_brand.active = True
            self.repository.update(existing_brand)
            self.db.commit()
            return existing_brand

        brand = Brand(
            name=data.name,
        )

        self.repository.create(brand)
        self.db.commit()

        return brand

    def get_by_id(self, brand_id: UUID) -> Brand:
        brand = self.repository.get_by_id(brand_id)

        if brand is None:
            raise NotFoundError(
                "Marca não encontrada."
            )

        return brand

    def get_all(self) -> list[Brand]:
        return self.repository.get_all()

    def update(
        self,
        brand_id: UUID,
        data: BrandUpdate,
    ) -> Brand:

        brand = self.repository.get_by_id(brand_id)

        if brand is None:
            raise NotFoundError(
                "Marca não encontrada."
            )

        if data.name is not None:
            brand.name = data.name

        if data.active is not None:
            brand.active = data.active

        self.repository.update(brand)
        self.db.commit()

        return brand

    def delete(self, brand_id: UUID) -> Brand:
        brand = self.repository.get_by_id(brand_id)

        if brand is None:
            raise NotFoundError(
                "Marca não encontrada."
            )

        self.repository.delete(brand)
        self.db.commit()

        return brand