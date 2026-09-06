from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.brand import Brand


class BrandRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, brand: Brand) -> Brand:
        self.db.add(brand)
        self.db.flush()
        self.db.refresh(brand)

        return brand

    def get_by_id(self, brand_id: UUID) -> Brand | None:
        statement = select(Brand).where(
            Brand.id == brand_id,
            Brand.active.is_(True),
        )

        return self.db.scalar(statement)

    def get_by_id_any_status(self, brand_id: UUID) -> Brand | None:
        statement = select(Brand).where(Brand.id == brand_id)

        return self.db.scalar(statement)

    def get_by_name(self, name: str) -> Brand | None:
        statement = select(Brand).where(Brand.name == name)

        return self.db.scalar(statement)

    def get_all(self) -> list[Brand]:
        statement = select(Brand).order_by(Brand.name)

        return list(self.db.scalars(statement).all())

    def update(self, brand: Brand) -> Brand:
        self.db.flush()
        self.db.refresh(brand)

        return brand

    def delete(self, brand: Brand) -> Brand:
        brand.active = False

        self.db.flush()
        self.db.refresh(brand)

        return brand