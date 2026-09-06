from uuid import uuid4

import pytest

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.customer import CustomerService


class FakeDatabase:
    def commit(self):
        pass


class FakeCustomerRepository:
    def __init__(self, customer=None):
        self.customer = customer

    def create(self, customer):
        self.customer = customer
        return customer

    def get_by_id(self, customer_id):
        if self.customer is not None and self.customer.id == customer_id:
            return self.customer
        return None

    def update(self, customer):
        return customer

    def get_all(self):
        return [self.customer] if self.customer is not None else []


def build_service(monkeypatch, customer=None):
    repository = FakeCustomerRepository(customer)
    monkeypatch.setattr(
        "app.services.customer.CustomerRepository",
        lambda db: repository,
    )
    return CustomerService(FakeDatabase()), repository


def test_create_customer(monkeypatch):
    service, _ = build_service(monkeypatch)

    customer = service.create(CustomerCreate(name="Cliente", phone="5511999999999"))

    assert customer.name == "Cliente"
    assert customer.phone == "5511999999999"


def test_get_customer_rejects_missing_id(monkeypatch):
    service, _ = build_service(monkeypatch)

    with pytest.raises(ValueError, match="Cliente não encontrado"):
        service.get_by_id(uuid4())


def test_update_customer_can_remove_phone(monkeypatch):
    customer = Customer(id=uuid4(), name="Cliente", phone="5511999999999")
    service, _ = build_service(monkeypatch, customer)

    updated = service.update(customer.id, CustomerUpdate(phone=None))

    assert updated.phone is None
