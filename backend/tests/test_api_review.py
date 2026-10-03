import asyncio

import httpx

from app.main import app


def request(path: str, method: str = "GET", **kwargs):
    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(run())


def test_openapi_exposes_expected_api_contract():
    schema = app.openapi()
    paths = schema["paths"]

    assert "/auth/login" in paths
    assert "/auth/me" in paths
    assert "/users" in paths
    assert "/orders" in paths
    assert "OAuth2PasswordBearer" in schema["components"]["securitySchemes"]
    assert "application/x-www-form-urlencoded" in paths["/auth/login"]["post"]["requestBody"]["content"]


def test_protected_endpoints_reject_missing_token():
    for path in ("/auth/me", "/users"):
        response = request(path)
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


def test_root_health_endpoint():
    response = request("/")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_staff_endpoints_reject_missing_token():
    for method, path in (
        ("GET", "/customers"),
        ("GET", "/customers/3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        ("GET", "/orders"),
        ("GET", "/orders/3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        ("GET", "/analytics/dashboard"),
        ("GET", "/audit"),
    ):
        response = request(path, method)
        assert response.status_code == 401, (method, path, response.status_code)


def test_removed_unsafe_endpoints_are_gone():
    assert request("/admin/orders/tracking").status_code == 404
    assert request("/admin/cleanup-brands", "POST").status_code == 404
    assert request("/payments/mercado-pago/checkout", "POST").status_code == 404


def test_login_is_rate_limited(monkeypatch):
    from app.core.exceptions import AuthenticationError

    def reject(self, email, password):
        raise AuthenticationError("E-mail ou senha inválidos.")

    monkeypatch.setattr("app.services.user.UserService.authenticate", reject)
    monkeypatch.setattr("app.api.routes.auth.get_db", lambda: None)
    statuses = [
        request("/auth/login", "POST", data={"username": "a@b.com", "password": "x"}).status_code
        for _ in range(11)
    ]

    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429


def test_public_order_phone_is_normalized():
    from app.schemas.public_order import PublicOrderCreate

    order = PublicOrderCreate(
        customer_name="  Maria   Silva ",
        customer_phone="+55 (11) 99999-8888",
        items=[{"product_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "quantity": 1}],
    )

    assert order.customer_name == "Maria Silva"
    assert order.customer_phone == "11999998888"


def test_public_order_is_paid_in_person_when_online_payments_are_off(monkeypatch):
    from types import SimpleNamespace
    from uuid import uuid4

    from app.core.database import get_db
    from app.models.order import OrderStatus, PaymentMethod, PaymentStatus

    created = {}

    class FakeCustomers:
        def __init__(self, db):
            pass

        def get_by_phone(self, phone):
            return SimpleNamespace(id=uuid4(), name="Maria", phone=phone)

    class FakeOrderService:
        def __init__(self, db):
            pass

        def create(self, data, initial_status):
            created.update(method=data.payment_method, status=initial_status)
            return SimpleNamespace(
                id=uuid4(), order_number=1, status=initial_status, total="40.00",
                public_token=uuid4(), payment_status=PaymentStatus.PENDING,
            )

    def gateway_must_not_be_called(*args, **kwargs):
        raise AssertionError("pagamento online desativado")

    monkeypatch.setattr("app.api.routes.public_orders.settings.online_payments_enabled", False)
    monkeypatch.setattr("app.api.routes.public_orders.CustomerRepository", FakeCustomers)
    monkeypatch.setattr("app.api.routes.public_orders.OrderService", FakeOrderService)
    monkeypatch.setattr("app.api.routes.public_orders.PaymentService", gateway_must_not_be_called)
    app.dependency_overrides[get_db] = lambda: None
    try:
        config = request("/public/config")
        response = request("/public/orders", "POST", json={
            "customer_name": "Maria",
            "customer_phone": "11999998888",
            "payment_method": "PIX",
            "items": [{"product_id": str(uuid4()), "quantity": 1}],
        })
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert config.json() == {"online_payments_enabled": False}
    assert response.status_code == 201, response.text
    assert created == {"method": PaymentMethod.CASH, "status": OrderStatus.RECEIVED}
    assert response.json()["pix_qr_code"] is None
