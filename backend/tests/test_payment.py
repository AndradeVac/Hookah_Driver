import hashlib
import hmac
from decimal import Decimal

import httpx
import pytest

from app.services.payment import PaymentGatewayError, PaymentService


def fake_gateway(monkeypatch, payload, status_code=200):
    """Replace httpx.request and return a dict with the captured call."""
    captured = {}

    def fake_request(method, url, json=None, headers=None, timeout=None):
        captured.update(method=method, url=url, json=json, headers=headers, timeout=timeout)
        return httpx.Response(status_code, json=payload, request=httpx.Request(method, url))

    monkeypatch.setattr("app.services.payment.httpx.request", fake_request)
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "TEST_TOKEN")
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_api_base_url", "https://api.mercadopago.com")
    monkeypatch.setattr("app.services.payment.settings.app_base_url", "https://api.hookahdriver.com")
    return captured


def test_create_checkout_returns_checkout_url(monkeypatch):
    captured = fake_gateway(monkeypatch, {"id": "PREF_123", "init_point": "https://example.com/checkout"})
    monkeypatch.setattr("app.services.payment.settings.frontend_url", "https://app.hookahdriver.com")

    result = PaymentService().create_checkout(
        order_id="ord_123",
        title="Pedido Hookah Driver",
        amount=Decimal("49.90"),
        return_path="/cliente?token=abc",
    )

    assert result == {"preference_id": "PREF_123", "checkout_url": "https://example.com/checkout"}
    assert captured["method"] == "POST"
    assert captured["url"] == "https://api.mercadopago.com/checkout/preferences"
    assert captured["headers"]["Authorization"] == "Bearer TEST_TOKEN"
    assert "X-Idempotency-Key" in captured["headers"]
    assert captured["json"]["external_reference"] == "ord_123"
    assert captured["json"]["back_urls"]["success"] == "https://app.hookahdriver.com/cliente?token=abc"
    assert captured["json"]["notification_url"] == "https://api.hookahdriver.com/payments/mercado-pago/webhook"


def test_create_pix_payment_returns_qr_code(monkeypatch):
    captured = fake_gateway(monkeypatch, {
        "id": 123456789,
        "status": "pending",
        "point_of_interaction": {
            "transaction_data": {
                "qr_code": "00020126...copia-e-cola",
                "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA",
            },
        },
    })

    result = PaymentService().create_pix_payment(
        order_id="ord_123",
        description="Pedido Hookah Driver",
        amount=Decimal("40.00"),
        payer_email="cliente11999998888@hookahdriver.com",
    )

    assert result["payment_id"] == "123456789"
    assert result["status"] == "pending"
    assert result["qr_code"] == "00020126...copia-e-cola"
    assert result["qr_code_base64"] == "iVBORw0KGgoAAAANSUhEUgAA"
    assert captured["url"] == "https://api.mercadopago.com/v1/payments"
    assert captured["json"]["payment_method_id"] == "pix"
    assert captured["json"]["external_reference"] == "ord_123"
    assert captured["json"]["payer"]["email"] == "cliente11999998888@hookahdriver.com"


def test_notification_url_is_omitted_for_non_https_base_url(monkeypatch):
    captured = fake_gateway(monkeypatch, {"id": 1})
    monkeypatch.setattr("app.services.payment.settings.app_base_url", "http://localhost:8000")

    PaymentService().create_pix_payment(order_id="o", description="d", amount=Decimal("1.00"), payer_email="a@b.com")

    assert "notification_url" not in captured["json"]


def test_gateway_error_is_wrapped(monkeypatch):
    fake_gateway(monkeypatch, {"message": "unauthorized"}, status_code=401)

    with pytest.raises(PaymentGatewayError, match="recusou"):
        PaymentService().get_payment("123")


def test_missing_access_token_is_rejected(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "")

    with pytest.raises(PaymentGatewayError, match="MERCADO_PAGO_ACCESS_TOKEN"):
        PaymentService().create_pix_payment(
            order_id="ord_123", description="Pedido", amount=Decimal("10.00"), payer_email="a@b.com",
        )


def _signature(secret: str, data_id: str, request_id: str, ts: str = "1704908010") -> str:
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    return f"ts={ts},v1={hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()}"


def test_verify_webhook_signature_accepts_valid_hmac(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "my-secret")

    assert PaymentService.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature=_signature("my-secret", "123456", "req-abc"),
    ) is True


def test_verify_webhook_signature_rejects_tampered_signature(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "my-secret")

    assert PaymentService.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature="ts=1704908010,v1=deadbeef",
    ) is False


def test_verify_webhook_signature_rejects_without_secret_configured(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "")

    assert PaymentService.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature=_signature("my-secret", "123456", "req-abc"),
    ) is False
