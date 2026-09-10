from decimal import Decimal

from app.services.payment import PaymentService


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def test_create_preference_uses_mercado_pago_and_returns_checkout_url(monkeypatch):
    captured = {}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        captured["timeout"] = timeout
        return DummyResponse({"id": "pref_123", "init_point": "https://example.com/checkout"})

    monkeypatch.setattr("app.services.payment.httpx.post", fake_post)
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "TEST_TOKEN")
    monkeypatch.setattr("app.services.payment.settings.app_base_url", "https://app.hookahdriver.com")

    service = PaymentService()
    result = service.create_preference(
        order_id="ord_123",
        title="Pedido Hookah Driver",
        amount=Decimal("49.90"),
    )

    assert result["preference_id"] == "pref_123"
    assert result["checkout_url"] == "https://example.com/checkout"
    assert captured["headers"]["Authorization"] == "Bearer TEST_TOKEN"
    assert captured["json"]["external_reference"] == "ord_123"
    assert captured["json"]["notification_url"].startswith("https://app.hookahdriver.com")


def test_create_preference_rejects_missing_access_token(monkeypatch):
    monkeypatch.setattr("app.services.payment.settings.mercado_pago_access_token", "")

    service = PaymentService()
    try:
        service.create_preference(order_id="ord_123", title="Pedido", amount=Decimal("10.00"))
        assert False, "expected RuntimeError"
    except RuntimeError as exc:
        assert "MERCADO_PAGO_ACCESS_TOKEN" in str(exc)
