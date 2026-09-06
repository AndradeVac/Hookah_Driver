from uuid import uuid4

import pytest

from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate
from app.services.brand import BrandService


class FakeDatabase:
    def commit(self):
        pass


class FakeBrandRepository:
    def __init__(self, brand=None):
        self.brand = brand

    def create(self, brand):
        self.brand = brand
        return brand

    def get_by_id(self, brand_id):
        if self.brand is not None and self.brand.id == brand_id:
            return self.brand
        return None

    def update(self, brand):
        return brand

    def delete(self, brand):
        brand.active = False
        return brand

    def get_all(self):
        return [self.brand] if self.brand is not None else []


def build_service(monkeypatch, brand=None):
    repository = FakeBrandRepository(brand)
    monkeypatch.setattr(
        "app.services.brand.BrandRepository",
        lambda db: repository,
    )
    return BrandService(FakeDatabase()), repository


def test_create_brand(monkeypatch):
    service, _ = build_service(monkeypatch)

    brand = service.create(BrandCreate(name="Marca"))

    assert brand.name == "Marca"
    assert brand.active is None or brand.active is True


def test_get_brand_rejects_missing_id(monkeypatch):
    service, _ = build_service(monkeypatch)

    with pytest.raises(ValueError, match="Marca não encontrada"):
        service.get_by_id(uuid4())


def test_update_brand(monkeypatch):
    brand = Brand(id=uuid4(), name="Antiga", active=True)
    service, _ = build_service(monkeypatch, brand)

    updated = service.update(brand.id, BrandUpdate(name="Nova"))

    assert updated.name == "Nova"


def test_delete_brand_is_soft_delete(monkeypatch):
    brand = Brand(id=uuid4(), name="Marca", active=True)
    service, _ = build_service(monkeypatch, brand)

    deleted = service.delete(brand.id)

    assert deleted.active is False
