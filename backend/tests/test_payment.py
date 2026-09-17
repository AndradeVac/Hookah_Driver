from decimal import Decimal

from app.services.payment import PaymentService


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def test_create_order_uses_mercado_pago_orders_api_and_returns_checkout_url(monkeypatch):
    captured = {}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        captured["timeout"] = timeout
        return DummyResponse({"id": "ORD_123", "status": "created", "checkout_url": "https://example.com/checkout"})

    monkeypatch.setattr("app.services.payment.httpx.post", fake_post)
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "TEST_TOKEN")
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_api_base_url", "https://api.mercadopago.com")
    monkeypatch.setattr("app.services.payment.settings.frontend_url", "https://app.hookahdriver.com")

    service = PaymentService()
    result = service.create_order(
        order_id="ord_123",
        title="Pedido Hookah Driver",
        amount=Decimal("49.90"),
    )

    assert result["order_id"] == "ORD_123"
    assert result["checkout_url"] == "https://example.com/checkout"
    assert result["status"] == "created"
    assert captured["url"] == "https://api.mercadopago.com/v1/orders"
    assert captured["headers"]["Authorization"] == "Bearer TEST_TOKEN"
    assert "X-Idempotency-Key" in captured["headers"]
    assert captured["json"]["type"] == "online"
    assert captured["json"]["processing_mode"] == "manual"
    assert captured["json"]["total_amount"] == "49.90"
    assert captured["json"]["external_reference"] == "ord_123"
    assert captured["json"]["config"]["online"]["success_url"].startswith("https://app.hookahdriver.com")


def test_create_pix_payment_returns_qr_code(monkeypatch):
    captured = {}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return DummyResponse({
            "id": 123456789,
            "status": "pending",
            "point_of_interaction": {
                "transaction_data": {
                    "qr_code": "00020126...copia-e-cola",
                    "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA",
                    "ticket_url": "https://mercadopago.com/pix/ticket",
                },
            },
        })

    monkeypatch.setattr("app.services.payment.httpx.post", fake_post)
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "TEST_TOKEN")
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_api_base_url", "https://api.mercadopago.com")

    service = PaymentService()
    result = service.create_pix_payment(
        order_id="ord_123",
        description="Pedido Hookah Driver",
        amount=Decimal("40.00"),
        payer_email="cliente11999998888@hookahdriver.com",
    )

    assert result["payment_id"] == 123456789
    assert result["status"] == "pending"
    assert result["qr_code"] == "00020126...copia-e-cola"
    assert result["qr_code_base64"] == "iVBORw0KGgoAAAANSUhEUgAA"
    assert captured["url"] == "https://api.mercadopago.com/v1/payments"
    assert captured["json"]["payment_method_id"] == "pix"
    assert captured["json"]["external_reference"] == "ord_123"
    assert captured["json"]["payer"]["email"] == "cliente11999998888@hookahdriver.com"


def test_create_pix_payment_rejects_missing_access_token(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "")

    service = PaymentService()
    try:
        service.create_pix_payment(order_id="ord_123", description="Pedido", amount=Decimal("10.00"), payer_email="a@b.com")
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "MERCADO_PAGO_ACCESS_TOKEN" in str(exc)


def test_create_order_rejects_missing_access_token(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "")

    service = PaymentService()
    try:
        service.create_order(order_id="ord_123", title="Pedido", amount=Decimal("10.00"))
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "MERCADO_PAGO_ACCESS_TOKEN" in str(exc)


def test_verify_webhook_signature_accepts_valid_hmac(monkeypatch):
    import hashlib
    import hmac

    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "my-secret")

    ts = "1704908010"
    manifest = "id:123456;request-id:req-abc;ts:1704908010;"
    digest = hmac.new("my-secret".encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256).hexdigest()

    service = PaymentService()
    assert service.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature=f"ts={ts},v1={digest}",
    ) is True


def test_verify_webhook_signature_rejects_tampered_signature(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "my-secret")

    service = PaymentService()
    assert service.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature="ts=1704908010,v1=deadbeef",
    ) is False


def test_verify_webhook_signature_rejects_without_secret_configured(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_webhook_secret", "")

    service = PaymentService()
    assert service.verify_webhook_signature(
        data_id="123456",
        request_id="req-abc",
        x_signature="ts=1704908010,v1=deadbeef",
    ) is False

