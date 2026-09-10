from __future__ import annotations

from decimal import Decimal

import httpx

from app.core.config import settings


class PaymentService:
    def create_preference(self, *, order_id: str, title: str, amount: Decimal) -> dict:
        if not settings.mercado_pago_access_token:
            raise RuntimeError(
                "MERCADO_PAGO_ACCESS_TOKEN não configurado. Defina o token antes de habilitar pagamentos reais."
            )

        payload = {
            "items": [{
                "title": title,
                "quantity": 1,
                "unit_price": float(amount),
                "currency_id": "BRL",
            }],
            "external_reference": order_id,
            "notification_url": f"{settings.app_base_url.rstrip('/')}/api/payments/mercado-pago/webhook",
            "back_urls": {
                "success": f"{settings.frontend_url.rstrip('/')}/checkout/success",
                "pending": f"{settings.frontend_url.rstrip('/')}/checkout/pending",
                "failure": f"{settings.frontend_url.rstrip('/')}/checkout/failure",
            },
            "auto_return": "approved",
        }

        response = httpx.post(
            f"{settings.mercado_pago_api_base_url.rstrip('/')}/checkout/preferences",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.mercado_pago_access_token}",
                "Content-Type": "application/json",
            },
            timeout=20,
        )
        response.raise_for_status() if hasattr(response, "raise_for_status") else None
        data = response.json()
        return {
            "preference_id": data.get("id"),
            "checkout_url": data.get("init_point") or data.get("sandbox_init_point"),
        }

    def verify_webhook_signature(self, *, payload: bytes, signature: str | None) -> bool:
        if not settings.mercado_pago_webhook_secret:
            return False
        if not signature:
            return False

        expected = signature.replace("sha256=", "", 1).strip()
        import hashlib
        import hmac

        digest = hmac.new(
            settings.mercado_pago_webhook_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(digest, expected)
