from __future__ import annotations

import uuid
from decimal import Decimal

import httpx

from app.core.config import settings


class PaymentService:
    def create_order(self, *, order_id: str, title: str, amount: Decimal) -> dict:
        if not settings.mercado_pago_access_token:
            raise RuntimeError(
                "MERCADO_PAGO_ACCESS_TOKEN não configurado. Defina o token antes de habilitar pagamentos reais."
            )

        amount_str = f"{amount:.2f}"
        payload = {
            "type": "online",
            "total_amount": amount_str,
            "external_reference": order_id,
            "processing_mode": "manual",
            "items": [{
                "title": title,
                "quantity": 1,
                "unit_price": amount_str,
            }],
            "config": {
                "online": {
                    "success_url": f"{settings.frontend_url.rstrip('/')}/checkout/success",
                    "failure_url": f"{settings.frontend_url.rstrip('/')}/checkout/failure",
                    "pending_url": f"{settings.frontend_url.rstrip('/')}/checkout/pending",
                    "auto_return": "approved",
                },
            },
        }

        response = httpx.post(
            f"{settings.mercado_pago_api_base_url.rstrip('/')}/v1/orders",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.mercado_pago_access_token}",
                "Content-Type": "application/json",
                "X-Idempotency-Key": str(uuid.uuid4()),
            },
            timeout=20,
        )
        response.raise_for_status() if hasattr(response, "raise_for_status") else None
        data = response.json()
        return {
            "order_id": data.get("id"),
            "checkout_url": data.get("checkout_url"),
            "status": data.get("status"),
        }

    def verify_webhook_signature(self, *, data_id: str, request_id: str | None, x_signature: str | None) -> bool:
        if not settings.mercado_pago_webhook_secret:
            return False
        if not x_signature:
            return False

        parts = dict(
            item.split("=", 1)
            for item in x_signature.split(",")
            if "=" in item
        )
        ts = parts.get("ts")
        received_hash = parts.get("v1")
        if not ts or not received_hash:
            return False

        import hashlib
        import hmac

        manifest = f"id:{data_id};request-id:{request_id or ''};ts:{ts};"
        digest = hmac.new(
            settings.mercado_pago_webhook_secret.encode("utf-8"),
            manifest.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(digest, received_hash)


