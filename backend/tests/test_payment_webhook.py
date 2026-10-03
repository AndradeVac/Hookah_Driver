import hashlib
import hmac
import json
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models.order import PaymentStatus
from app.services.payment import PaymentGatewayError

ORDER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
SECRET = "wh-secret"


def _signature_header(data_id: str, request_id: str, ts: str = "1704908010"):
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    digest = hmac.new(SECRET.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={digest}"


@pytest.fixture
def applied(monkeypatch):
    """Captures calls to OrderService.apply_payment_status."""
    calls = []

    class FakeOrderService:
        def __init__(self, db):
            pass

        def apply_payment_status(self, order_id, payment_status):
            calls.append((order_id, payment_status))

    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", SECRET)
    monkeypatch.setattr("app.api.routes.payments.OrderService", FakeOrderService)
    app.dependency_overrides[get_db] = lambda: None
    yield calls
    app.dependency_overrides.pop(get_db, None)


def _post(data_id="999", request_id="req-1", signature=None):
    payload = json.dumps({"type": "payment", "data": {"id": data_id}}).encode("utf-8")
    return TestClient(app).post(
        f"/payments/mercado-pago/webhook?data.id={data_id}",
        content=payload,
        headers={
            "x-signature": signature or _signature_header(data_id, request_id),
            "x-request-id": request_id,
            "content-type": "application/json",
        },
    )


def test_webhook_marks_order_as_paid(monkeypatch, applied):
    monkeypatch.setattr(
        "app.services.payment.PaymentService.get_payment",
        lambda self, payment_id: {"status": "approved", "external_reference": ORDER_ID},
    )

    response = _post()

    assert response.status_code == 200, response.text
    assert applied == [(UUID(ORDER_ID), PaymentStatus.PAID)]


def test_webhook_ignores_pending_payments(monkeypatch, applied):
    monkeypatch.setattr(
        "app.services.payment.PaymentService.get_payment",
        lambda self, payment_id: {"status": "pending", "external_reference": ORDER_ID},
    )

    assert _post().status_code == 200
    assert applied == []


def test_webhook_asks_for_retry_when_gateway_fails(monkeypatch, applied):
    def fail(self, payment_id):
        raise PaymentGatewayError("Mercado Pago indisponível.")

    monkeypatch.setattr("app.services.payment.PaymentService.get_payment", fail)

    assert _post().status_code == 502
    assert applied == []


def test_webhook_rejects_invalid_signature(applied):
    response = _post(signature="ts=123,v1=deadbeef")

    assert response.status_code == 401
    assert applied == []
