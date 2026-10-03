from decimal import Decimal
from uuid import uuid4

import pytest

from app.core.exceptions import BusinessRuleError
from app.models.order import Order, OrderStatus, PaymentStatus
from app.schemas.order import OrderCreate, OrderItemCreate, OrderStatusUpdate
from app.services.order import OrderService, item_display_name


class FakeDatabase:
    last = None

    def __init__(self):
        self.rollback_calls = 0
        FakeDatabase.last = self

    def commit(self):
        pass

    def rollback(self):
        self.rollback_calls += 1


class FakeCustomerRepository:
    def __init__(self, customer):
        self.customer = customer

    def get_by_id(self, customer_id):
        # Mirrors CustomerRepository.get_by_id: inactive customers are not returned.
        if self.customer is not None and self.customer.id == customer_id and getattr(self.customer, "active", True):
            return self.customer
        return None


class FakeProductRepository:
    def __init__(self, products):
        self.products = products

    def get_by_id(self, product_id):
        # Mirrors ProductRepository.get_by_id: inactive products are not returned.
        product = self.products.get(product_id)
        return product if product is not None and getattr(product, "active", True) else None


class FakeOrderRepository:
    def __init__(self, order=None):
        self.order = order

    def create(self, order):
        if getattr(self, "fail_create", False):
            raise RuntimeError("falha de persistencia")
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
        {"id": uuid4(), "flavor": None, "name": "Carvao", "price": Decimal("10.00")},
    )()
    second_product = type(
        "Product",
        (),
        {"id": uuid4(), "flavor": None, "name": "Essencia", "price": Decimal("15.50")},
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


def test_create_order_keeps_price_snapshot(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    product = type(
        "Product",
        (),
        {"id": uuid4(), "flavor": None, "name": "Produto", "price": Decimal("12.50")},
    )()
    service, _ = build_service(monkeypatch, customer, {product.id: product})

    order = service.create(
        OrderCreate(
            customer_id=customer.id,
            payment_method="PIX",
            items=[OrderItemCreate(product_id=product.id, quantity=2)],
        )
    )
    product.price = Decimal("99.99")

    assert order.items[0].unit_price == Decimal("12.50")
    assert order.items[0].total_price == Decimal("25.00")


def test_cannot_release_order_awaiting_unconfirmed_payment(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    product = type(
        "Product",
        (),
        {"id": uuid4(), "flavor": None, "name": "Produto", "price": Decimal("12.50")},
    )()
    service, repository = build_service(monkeypatch, customer, {product.id: product})
    order = service.create(
        OrderCreate(
            customer_id=customer.id,
            payment_method="CARD",
            items=[OrderItemCreate(product_id=product.id, quantity=1)],
        ),
        initial_status=OrderStatus.AWAITING_PAYMENT,
    )
    order.payment_status = PaymentStatus.PENDING

    with pytest.raises(
        BusinessRuleError,
        match="só pode ser liberado após a confirmação do pagamento",
    ):
        service.update_status(
            order.id,
            OrderStatusUpdate(status=OrderStatus.RECEIVED),
        )

    assert repository.order.status is OrderStatus.AWAITING_PAYMENT


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


def test_create_order_rejects_inactive_product(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    product = type(
        "Product",
        (),
        {"id": uuid4(), "flavor": None, "name": "Produto inativo", "price": Decimal("10.00"), "active": False},
    )()
    service, _ = build_service(monkeypatch, customer, {product.id: product})

    with pytest.raises(ValueError, match="Produto não encontrado"):
        service.create(
            OrderCreate(
                customer_id=customer.id,
                payment_method="CARD",
                items=[OrderItemCreate(product_id=product.id, quantity=1)],
            )
        )


def test_create_order_rejects_inactive_customer(monkeypatch):
    customer = type("Customer", (), {"id": uuid4(), "active": False})()
    service, _ = build_service(monkeypatch, customer, {})

    with pytest.raises(ValueError, match="Cliente não encontrado"):
        service.create(
            OrderCreate(
                customer_id=customer.id,
                payment_method="PIX",
                items=[OrderItemCreate(product_id=uuid4(), quantity=1)],
            )
        )


def test_order_create_rejects_empty_items():
    with pytest.raises(ValueError):
        OrderCreate(
            customer_id=uuid4(),
            payment_method="PIX",
            items=[],
        )


def test_order_item_rejects_zero_quantity():
    with pytest.raises(ValueError):
        OrderItemCreate(product_id=uuid4(), quantity=0)


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


def test_update_order_status_rejects_cancelled_transition(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    service, repository = build_service(monkeypatch, customer, {})
    order = Order(
        id=uuid4(),
        customer_id=customer.id,
        payment_method="PIX",
        status=OrderStatus.CANCELLED,
        subtotal=Decimal("0.00"),
        total=Decimal("0.00"),
    )
    repository.order = order

    with pytest.raises(ValueError, match="Não é possível alterar"):
        service.update_status(
            order.id,
            OrderStatusUpdate(status=OrderStatus.READY),
        )


def test_create_order_rolls_back_when_persistence_fails(monkeypatch):
    customer = type("Customer", (), {"id": uuid4()})()
    product = type(
        "Product",
        (),
        {"id": uuid4(), "flavor": None, "name": "Produto", "price": Decimal("10.00")},
    )()
    service, repository = build_service(monkeypatch, customer, {product.id: product})
    repository.fail_create = True

    with pytest.raises(RuntimeError, match="falha de persistencia"):
        service.create(
            OrderCreate(
                customer_id=customer.id,
                payment_method="PIX",
                items=[OrderItemCreate(product_id=product.id, quantity=1)],
            )
        )

    assert FakeDatabase.last.rollback_calls == 1


def _awaiting_payment_order():
    return Order(
        id=uuid4(),
        customer_id=uuid4(),
        payment_method="PIX",
        status=OrderStatus.AWAITING_PAYMENT,
        payment_status=PaymentStatus.PENDING,
        subtotal=Decimal("40.00"),
        total=Decimal("40.00"),
    )


def test_item_display_name_includes_brand_and_flavor():
    brand = type("Brand", (), {"name": "Ziggy"})()
    flavor = type("Flavor", (), {"name": "Banana", "brand": brand})()
    rosh = type("Product", (), {"name": "Rosh", "flavor": flavor})()
    plain = type("Product", (), {"name": "Coca", "flavor": None})()

    assert item_display_name(rosh) == "Rosh · Ziggy Banana"
    assert item_display_name(plain) == "Coca"


def test_apply_payment_status_releases_paid_order(monkeypatch):
    service, repository = build_service(monkeypatch, None, {})
    repository.order = _awaiting_payment_order()

    order = service.apply_payment_status(repository.order.id, PaymentStatus.PAID)

    assert order.payment_status is PaymentStatus.PAID
    assert order.status is OrderStatus.RECEIVED
    assert order.paid_at is not None
    assert order.status_history[-1].status is OrderStatus.RECEIVED


def test_apply_payment_status_cancels_failed_order(monkeypatch):
    service, repository = build_service(monkeypatch, None, {})
    repository.order = _awaiting_payment_order()

    order = service.apply_payment_status(repository.order.id, PaymentStatus.FAILED)

    assert order.payment_status is PaymentStatus.FAILED
    assert order.status is OrderStatus.CANCELLED


def test_apply_payment_status_never_downgrades_a_paid_order(monkeypatch):
    service, repository = build_service(monkeypatch, None, {})
    repository.order = _awaiting_payment_order()
    service.apply_payment_status(repository.order.id, PaymentStatus.PAID)

    order = service.apply_payment_status(repository.order.id, PaymentStatus.FAILED)

    assert order.payment_status is PaymentStatus.PAID
    assert order.status is OrderStatus.RECEIVED
    assert len(order.status_history) == 1


def test_apply_payment_status_ignores_unknown_order(monkeypatch):
    service, _ = build_service(monkeypatch, None, {})

    assert service.apply_payment_status(uuid4(), PaymentStatus.PAID) is None
