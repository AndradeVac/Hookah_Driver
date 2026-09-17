import hashlib
import hmac
import json

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models.order import PaymentStatus


class FakeOrder:
    def __init__(self, order_id):
        self.id = order_id
        self.payment_status = PaymentStatus.PENDING


class FakeQuery:
    def __init__(self, order):
        self._order = order

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._order


class FakeDb:
    def __init__(self, order):
        self._order = order
        self.committed = False

    def query(self, model):
        return FakeQuery(self._order)

    def commit(self):
        self.committed = True


def _signature_header(secret: str, data_id: str, request_id: str, ts: str = "1704908010"):
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    digest = hmac.new(secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={digest}"


def test_webhook_updates_order_payment_status_to_paid(monkeypatch):
    order_id = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    fake_order = FakeOrder(order_id)
    fake_db = FakeDb(fake_order)

    monkeypatch.setattr("app.api.routes.payments.settings.mercado_pago_webhook_secret", "wh-secret")
    monkeypatch.setattr(
        "app.services.payment.PaymentService.get_payment_status",
        lambda self, payment_id: {"status": "approved", "external_reference": order_id},
    )

    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        client = TestClient(app)
        payload = json.dumps({"type": "payment", "data": {"id": "999"}}).encode("utf-8")
        signature = _signature_header("wh-secret", "999", "req-1")
        response = client.post(
            "/payments/mercado-pago/webhook?data.id=999",
            content=payload,
            headers={"x-signature": signature, "x-request-id": "req-1", "content-type": "application/json"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200, response.text
    assert fake_order.payment_status == PaymentStatus.PAID
    assert fake_db.committed is True


def test_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr("app.api.routes.payments.settings.mercado_pago_webhook_secret", "wh-secret")

    client = TestClient(app)
    response = client.post(
        "/payments/mercado-pago/webhook?data.id=999",
        content=b"{}",
        headers={"x-signature": "ts=123,v1=deadbeef", "x-request-id": "req-1"},
    )

    assert response.status_code == 401
