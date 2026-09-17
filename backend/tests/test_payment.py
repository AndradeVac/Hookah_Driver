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


def test_create_order_rejects_missing_access_token(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "")

    service = PaymentService()
    try:
        service.create_order(order_id="ord_123", title="Pedido", amount=Decimal("10.00"))
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "MERCADO_PAGO_ACCESS_TOKEN" in str(exc)
