from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.flavor import Flavor
from app.repositories.brand import BrandRepository
from app.repositories.flavor import FlavorRepository
from app.schemas.flavor import FlavorCreate, FlavorUpdate


class FlavorService:

    def __init__(self, db: Session):
        self.repository = FlavorRepository(db)
        self.brand_repository = BrandRepository(db)
        self.db = db

    def _validate_brand(self, brand_id: UUID) -> None:
        brand = self.brand_repository.get_by_id(brand_id)

        if brand is None or not brand.active:
            raise NotFoundError("Marca não encontrada ou inativa.")

    def create(self, data: FlavorCreate) -> Flavor:
        self._validate_brand(data.brand_id)

        existing_flavor = self.repository.get_by_brand_and_name(data.brand_id, data.name)
        if existing_flavor is not None and not existing_flavor.active:
            existing_flavor.active = True
            existing_flavor.description = data.description
            existing_flavor.image_url = data.image_url
            self.repository.update(existing_flavor)
            self.db.commit()
            return existing_flavor

        flavor = Flavor(
            brand_id=data.brand_id,
            name=data.name,
            description=data.description,
            image_url=data.image_url,
        )

        self.repository.create(flavor)
        self.db.commit()

        return flavor

    def get_by_id(self, flavor_id: UUID) -> Flavor:
        flavor = self.repository.get_by_id(flavor_id)

        if flavor is None:
            raise NotFoundError("Sabor não encontrado.")

        return flavor

    def get_all(self) -> list[Flavor]:
        return self.repository.get_all()

    def update(
        self,
        flavor_id: UUID,
        data: FlavorUpdate,
    ) -> Flavor:

        flavor = self.repository.get_by_id_any_status(flavor_id)

        if flavor is None:
            raise NotFoundError("Sabor não encontrado.")

        if data.brand_id is not None:
            self._validate_brand(data.brand_id)
            flavor.brand_id = data.brand_id

        if data.name is not None:
            flavor.name = data.name

        if data.description is not None:
            flavor.description = data.description

        if "image_url" in data.model_fields_set:
            flavor.image_url = data.image_url

        if data.active is not None:
            flavor.active = data.active

        self.repository.update(flavor)
        self.db.commit()

        return flavor

    def delete(self, flavor_id: UUID) -> Flavor:
        flavor = self.repository.get_by_id(flavor_id)

        if flavor is None:
            raise NotFoundError("Sabor não encontrado.")

        self.repository.delete(flavor)
        self.db.commit()

        return flavor