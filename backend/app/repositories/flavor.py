from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.flavor import Flavor


class FlavorRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(self, flavor: Flavor) -> Flavor:
        self.db.add(flavor)
        self.db.flush()
        self.db.refresh(flavor)

        return flavor

    def get_by_id(self, flavor_id: UUID) -> Flavor | None:
        statement = select(Flavor).where(
            Flavor.id == flavor_id
        )

        return self.db.scalar(statement)

    def get_all(self) -> list[Flavor]:
        statement = select(Flavor).order_by(Flavor.name)

        return list(self.db.scalars(statement).all())

    def update(self, flavor: Flavor) -> Flavor:
        self.db.flush()
        self.db.refresh(flavor)

        return flavor

    def delete(self, flavor: Flavor) -> Flavor:
        flavor.active = False
        self.db.flush()
        self.db.refresh(flavor)

        return flavor