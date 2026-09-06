from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.product import ProductService


class FakeDatabase:
    def commit(self):
        pass


class FakeCategoryRepository:
    def __init__(self, category):
        self.category = category

    def get_by_id(self, category_id):
        if self.category is not None and self.category.id == category_id:
            return self.category
        return None


class FakeFlavorRepository:
    def __init__(self, flavor):
        self.flavor = flavor

    def get_by_id(self, flavor_id):
        if self.flavor is not None and self.flavor.id == flavor_id:
            return self.flavor
        return None


class FakeProductRepository:
    def __init__(self, product=None):
        self.product = product

    def create(self, product):
        self.product = product
        return product

    def get_by_id(self, product_id):
        if self.product is not None and self.product.id == product_id:
            return self.product
        return None

    def update(self, product):
        return product

    def delete(self, product):
        product.active = False
        return product


def build_service(monkeypatch, category, flavor, product=None):
    product_repository = FakeProductRepository(product)
    monkeypatch.setattr(
        "app.services.product.ProductRepository",
        lambda db: product_repository,
    )
    monkeypatch.setattr(
        "app.services.product.CategoryRepository",
        lambda db: FakeCategoryRepository(category),
    )
    monkeypatch.setattr(
        "app.services.product.FlavorRepository",
        lambda db: FakeFlavorRepository(flavor),
    )
    return ProductService(FakeDatabase()), product_repository


def test_product_schema_allows_missing_flavor():
    product = ProductCreate(
        category_id=uuid4(),
        name="Carvao",
        price="25.00",
    )

    assert product.flavor_id is None


def test_product_response_allows_null_flavor():
    now = datetime.now(timezone.utc)
    response = ProductResponse(
        id=uuid4(),
        category_id=uuid4(),
        flavor_id=None,
        name="Carvao",
        description=None,
        price="25.00",
        active=True,
        created_at=now,
        updated_at=now,
    )

    assert response.flavor_id is None


def test_create_product_validates_active_relationships(monkeypatch):
    category = type("Category", (), {"id": uuid4(), "active": True})()
    flavor = type("Flavor", (), {"id": uuid4(), "active": True})()
    service, _ = build_service(monkeypatch, category, flavor)

    product = service.create(
        ProductCreate(
            category_id=category.id,
            flavor_id=flavor.id,
            name="Melancia",
            price=Decimal("19.90"),
        )
    )

    assert product.category_id == category.id
    assert product.flavor_id == flavor.id


def test_create_product_rejects_invalid_category(monkeypatch):
    category = type("Category", (), {"id": uuid4(), "active": True})()
    service, _ = build_service(monkeypatch, category, None)

    with pytest.raises(ValueError, match="Categoria não encontrada ou inativa"):
        service.create(
            ProductCreate(
                category_id=uuid4(),
                name="Produto",
                price="10.00",
            )
        )


def test_create_product_rejects_inactive_flavor(monkeypatch):
    category = type("Category", (), {"id": uuid4(), "active": True})()
    flavor = type("Flavor", (), {"id": uuid4(), "active": False})()
    service, _ = build_service(monkeypatch, category, flavor)

    with pytest.raises(ValueError, match="Sabor não encontrado ou inativo"):
        service.create(
            ProductCreate(
                category_id=category.id,
                flavor_id=flavor.id,
                name="Produto",
                price="10.00",
            )
        )


def test_update_product_can_remove_flavor(monkeypatch):
    category = type("Category", (), {"id": uuid4(), "active": True})()
    flavor = type("Flavor", (), {"id": uuid4(), "active": True})()
    product = Product(
        id=uuid4(),
        category_id=category.id,
        flavor_id=flavor.id,
        name="Produto",
        price=Decimal("10.00"),
    )
    service, _ = build_service(monkeypatch, category, flavor, product)

    updated = service.update(product.id, ProductUpdate(flavor_id=None))

    assert updated.flavor_id is None


def test_delete_product_is_soft_delete(monkeypatch):
    category = type("Category", (), {"id": uuid4(), "active": True})()
    product = Product(
        id=uuid4(),
        category_id=category.id,
        flavor_id=None,
        name="Produto",
        price=Decimal("10.00"),
        active=True,
    )
    service, _ = build_service(monkeypatch, category, None, product)

    deleted = service.delete(product.id)

    assert deleted.active is False
