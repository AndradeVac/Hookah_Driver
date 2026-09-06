from uuid import uuid4

import pytest

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.category import CategoryService


class FakeDatabase:
    def commit(self):
        pass


class FakeCategoryRepository:
    def __init__(self, category=None):
        self.category = category

    def create(self, category):
        self.category = category
        return category

    def get_by_id(self, category_id):
        if self.category is not None and self.category.id == category_id:
            return self.category
        return None

    def update(self, category):
        return category

    def delete(self, category):
        category.active = False
        return category

    def get_all(self):
        return [self.category] if self.category is not None else []


def build_service(monkeypatch, category=None):
    repository = FakeCategoryRepository(category)
    monkeypatch.setattr(
        "app.services.category.CategoryRepository",
        lambda db: repository,
    )
    return CategoryService(FakeDatabase()), repository


def test_create_category(monkeypatch):
    service, _ = build_service(monkeypatch)

    category = service.create(CategoryCreate(name="Categoria"))

    assert category.name == "Categoria"


def test_get_category_rejects_missing_id(monkeypatch):
    service, _ = build_service(monkeypatch)

    with pytest.raises(ValueError, match="Categoria não encontrada"):
        service.get_by_id(uuid4())


def test_update_category(monkeypatch):
    category = Category(id=uuid4(), name="Antiga", active=True)
    service, _ = build_service(monkeypatch, category)

    updated = service.update(category.id, CategoryUpdate(name="Nova"))

    assert updated.name == "Nova"


def test_delete_category_is_soft_delete(monkeypatch):
    category = Category(id=uuid4(), name="Categoria", active=True)
    service, _ = build_service(monkeypatch, category)

    deleted = service.delete(category.id)

    assert deleted.active is False
