from decimal import Decimal
from uuid import uuid4

import pytest

from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate, OrderStatusUpdate
from app.services.order import OrderService


class FakeDatabase:
    def commit(self):
        pass


class FakeCustomerRepository:
    def __init__(self, customer):
        self.customer = customer

    def get_by_id(self, customer_id):
        if self.customer is not None and self.customer.id == customer_id:
            return self.customer
        return None


class FakeProductRepository:
    def __init__(self, products):
        self.products = products

    def get_by_id(self, product_id):
        return self.products.get(product_id)


class FakeOrderRepository:
    def __init__(self, order=None):
        self.order = order

    def create(self, order):
        self.order = order
        return order

    def get_by_id(self, order_id):
        if self.order is not None and self.order.id == order_id:
            return self.order
        return None

    def update(self, order):
        self.order = order
        return order


def build_service(monkeypatch, customer, products):
    order_repository = FakeOrderRepository()
    monkeypatch.setattr(
        "app.services.order.OrderRepository",
        lambda db: order_repository,
    )
    monkeypatch.setattr(
        "app.services.order.CustomerRepository",
        lambda db: FakeCustomerRepository(customer),
    )
    monkeypatch.setattr(
        "app.services.order.ProductRepository",
        lambda db: FakeProductRepository(products),
    )
    return OrderService(FakeDatabase()), order_repository


def test_create_order_calculates_totals_and_history(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    first_product = type(
        "Product",
        (),
        {"id": uuid4(), "name": "Carvao", "price": Decimal("10.00")},
    )()
    second_product = type(
        "Product",
        (),
        {"id": uuid4(), "name": "Essencia", "price": Decimal("15.50")},
    )()
    service, repository = build_service(
        monkeypatch,
        customer,
        {first_product.id: first_product, second_product.id: second_product},
    )

    order = service.create(
        OrderCreate(
            customer_id=customer.id,
            payment_method="PIX",
            items=[
                OrderItemCreate(product_id=first_product.id, quantity=2),
                OrderItemCreate(product_id=second_product.id, quantity=1),
            ],
        )
    )

    assert repository.order is order
    assert order.status is OrderStatus.RECEIVED
    assert order.subtotal == Decimal("35.50")
    assert order.total == Decimal("35.50")
    assert len(order.items) == 2
    assert len(order.status_history) == 1
    assert order.status_history[0].status is OrderStatus.RECEIVED


def test_create_order_rejects_missing_customer(monkeypatch):
    service, _ = build_service(monkeypatch, None, {})

    with pytest.raises(ValueError, match="Cliente não encontrado"):
        service.create(
            OrderCreate(
                customer_id=uuid4(),
                payment_method="CASH",
                items=[OrderItemCreate(product_id=uuid4(), quantity=1)],
            )
        )


def test_create_order_rejects_missing_product(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    service, _ = build_service(monkeypatch, customer, {})

    with pytest.raises(ValueError, match="Produto não encontrado"):
        service.create(
            OrderCreate(
                customer_id=customer.id,
                payment_method="CARD",
                items=[OrderItemCreate(product_id=uuid4(), quantity=1)],
            )
        )


def test_update_order_status_records_history(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    service, repository = build_service(monkeypatch, customer, {})
    order = Order(
        id=uuid4(),
        customer_id=customer.id,
        payment_method="PIX",
        status=OrderStatus.RECEIVED,
        subtotal=Decimal("0.00"),
        total=Decimal("0.00"),
    )
    repository.order = order

    updated = service.update_status(
        order.id,
        OrderStatusUpdate(status=OrderStatus.PREPARING),
    )

    assert updated.status is OrderStatus.PREPARING
    assert len(updated.status_history) == 1
    assert updated.status_history[0].status is OrderStatus.PREPARING


def test_update_order_status_rejects_finished_transition(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    service, repository = build_service(monkeypatch, customer, {})
    order = Order(
        id=uuid4(),
        customer_id=customer.id,
        payment_method="PIX",
        status=OrderStatus.FINISHED,
        subtotal=Decimal("0.00"),
        total=Decimal("0.00"),
    )
    repository.order = order

    with pytest.raises(ValueError, match="Não é possível alterar"):
        service.update_status(
            order.id,
            OrderStatusUpdate(status=OrderStatus.CANCELLED),
        )
