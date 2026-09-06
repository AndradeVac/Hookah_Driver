from uuid import uuid4

import pytest

from app.models.flavor import Flavor
from app.schemas.flavor import FlavorCreate, FlavorUpdate
from app.services.flavor import FlavorService


class FakeDatabase:
    def commit(self):
        pass


class FakeBrandRepository:
    def __init__(self, brand):
        self.brand = brand

    def get_by_id(self, brand_id):
        if self.brand is not None and self.brand.id == brand_id:
            return self.brand
        return None


class FakeFlavorRepository:
    def __init__(self, flavor=None):
        self.flavor = flavor

    def create(self, flavor):
        self.flavor = flavor
        return flavor

    def get_by_id(self, flavor_id):
        if self.flavor is not None and self.flavor.id == flavor_id:
            return self.flavor
        return None

    def update(self, flavor):
        return flavor

    def delete(self, flavor):
        flavor.active = False
        return flavor


def build_service(monkeypatch, brand, flavor=None):
    flavor_repository = FakeFlavorRepository(flavor)
    monkeypatch.setattr(
        "app.services.flavor.FlavorRepository",
        lambda db: flavor_repository,
    )
    monkeypatch.setattr(
        "app.services.flavor.BrandRepository",
        lambda db: FakeBrandRepository(brand),
    )
    return FlavorService(FakeDatabase()), flavor_repository


def test_create_flavor_validates_active_brand(monkeypatch):
    brand = type("Brand", (), {"id": uuid4(), "active": True})()
    service, _ = build_service(monkeypatch, brand)

    flavor = service.create(
        FlavorCreate(
            brand_id=brand.id,
            name="Menta",
        )
    )

    assert flavor.brand_id == brand.id
    assert flavor.name == "Menta"


def test_create_flavor_rejects_missing_brand(monkeypatch):
    brand = type("Brand", (), {"id": uuid4(), "active": True})()
    service, _ = build_service(monkeypatch, brand)

    with pytest.raises(ValueError, match="Marca não encontrada ou inativa"):
        service.create(
            FlavorCreate(
                brand_id=uuid4(),
                name="Menta",
            )
        )


def test_create_flavor_rejects_inactive_brand(monkeypatch):
    brand = type("Brand", (), {"id": uuid4(), "active": False})()
    service, _ = build_service(monkeypatch, brand)

    with pytest.raises(ValueError, match="Marca não encontrada ou inativa"):
        service.create(
            FlavorCreate(
                brand_id=brand.id,
                name="Menta",
            )
        )


def test_update_flavor_rejects_invalid_brand(monkeypatch):
    brand = type("Brand", (), {"id": uuid4(), "active": True})()
    flavor = Flavor(
        id=uuid4(),
        brand_id=brand.id,
        name="Menta",
        active=True,
    )
    service, _ = build_service(monkeypatch, brand, flavor)

    with pytest.raises(ValueError, match="Marca não encontrada ou inativa"):
        service.update(flavor.id, FlavorUpdate(brand_id=uuid4()))


def test_delete_flavor_is_soft_delete(monkeypatch):
    brand = type("Brand", (), {"id": uuid4(), "active": True})()
    flavor = Flavor(
        id=uuid4(),
        brand_id=brand.id,
        name="Menta",
        active=True,
    )
    service, _ = build_service(monkeypatch, brand, flavor)

    deleted = service.delete(flavor.id)

    assert deleted.active is False
