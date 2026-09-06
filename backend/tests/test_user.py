from uuid import uuid4

import pytest

from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.services.user import UserService


class FakeDatabase:
    def commit(self):
        pass


class FakeUserRepository:
    def __init__(self, user=None):
        self.user = user

    def create(self, user):
        self.user = user
        return user

    def get_by_id(self, user_id):
        if self.user is not None and self.user.id == user_id:
            return self.user
        return None


def build_service(monkeypatch, user=None):
    repository = FakeUserRepository(user)
    monkeypatch.setattr(
        "app.services.user.UserRepository",
        lambda db: repository,
    )
    return UserService(FakeDatabase()), repository


def test_create_user_hashes_password_and_normalizes_email(monkeypatch):
    service, repository = build_service(monkeypatch)

    user = service.create(
        UserCreate(
            name="Admin",
            email="ADMIN@example.com",
            password="senha-segura",
            role=UserRole.ADMIN,
        )
    )

    assert repository.user is user
    assert user.email == "admin@example.com"
    assert user.password_hash != "senha-segura"
    assert service.verify_password("senha-segura", user.password_hash)
    assert not service.verify_password("senha-incorreta", user.password_hash)
    assert user.role is UserRole.ADMIN


def test_get_user_rejects_missing_id(monkeypatch):
    service, _ = build_service(monkeypatch)

    with pytest.raises(ValueError, match="Usuário não encontrado"):
        service.get_by_id(uuid4())
