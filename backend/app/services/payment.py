from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from decimal import Decimal

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 20


class PaymentGatewayError(RuntimeError):
    """Raised when Mercado Pago is not configured or rejects a request."""


class PaymentService:
    """Thin client for the Mercado Pago REST API."""

    def _request(self, method: str, path: str, *, json: dict | None = None) -> dict:
        if not settings.mercado_pago_access_token:
            raise PaymentGatewayError("MERCADO_PAGO_ACCESS_TOKEN não configurado.")

        headers = {"Authorization": f"Bearer {settings.mercado_pago_access_token}"}
        if method == "POST":
            headers["X-Idempotency-Key"] = str(uuid.uuid4())

        url = f"{settings.mercado_pago_api_base_url.rstrip('/')}{path}"
        try:
            response = httpx.request(method, url, json=json, headers=headers, timeout=_TIMEOUT_SECONDS)
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            logger.error(
                "Mercado Pago %s %s failed with %s: %s",
                method, path, error.response.status_code, error.response.text[:500],
            )
            raise PaymentGatewayError("Mercado Pago recusou a requisição.") from error
        except httpx.HTTPError as error:
            logger.error("Mercado Pago %s %s unreachable: %s", method, path, error)
            raise PaymentGatewayError("Mercado Pago indisponível.") from error
        return response.json()

    def create_checkout(self, *, order_id: str, title: str, amount: Decimal, return_path: str) -> dict:
        """Create a Checkout Pro preference (card payments)."""
        return_url = f"{settings.public_frontend_url}{return_path}"
        data = self._request("POST", "/checkout/preferences", json={
            "items": [{
                "title": title,
                "quantity": 1,
                "unit_price": float(amount),
                "currency_id": "BRL",
            }],
            "external_reference": order_id,
            "back_urls": {"success": return_url, "failure": return_url, "pending": return_url},
            "auto_return": "approved",
            **self._notification(),
        })
        return {
            "preference_id": data.get("id"),
            "checkout_url": data.get("init_point") or data.get("sandbox_init_point"),
        }

    def create_pix_payment(self, *, order_id: str, description: str, amount: Decimal, payer_email: str) -> dict:
        data = self._request("POST", "/v1/payments", json={
            "transaction_amount": float(amount),
            "description": description,
            "payment_method_id": "pix",
            "external_reference": order_id,
            "payer": {"email": payer_email},
            **self._notification(),
        })
        transaction_data = (data.get("point_of_interaction") or {}).get("transaction_data") or {}
        return {
            "payment_id": str(data["id"]) if data.get("id") is not None else None,
            "status": data.get("status"),
            "qr_code": transaction_data.get("qr_code"),
            "qr_code_base64": transaction_data.get("qr_code_base64"),
        }

    def get_payment(self, payment_id: str) -> dict:
        data = self._request("GET", f"/v1/payments/{payment_id}")
        return {"status": data.get("status"), "external_reference": data.get("external_reference")}

    def get_merchant_order(self, order_id: str) -> dict:
        data = self._request("GET", f"/v1/orders/{order_id}")
        return {"status": data.get("status"), "external_reference": data.get("external_reference")}

    @staticmethod
    def verify_webhook_signature(*, data_id: str, request_id: str | None, x_signature: str | None) -> bool:
        """Validate the `x-signature` header as documented by Mercado Pago."""
        if not settings.mercado_pago_webhook_secret or not x_signature:
            return False

        parts = dict(
            item.strip().split("=", 1)
            for item in x_signature.split(",")
            if "=" in item
        )
        ts = parts.get("ts")
        received_hash = parts.get("v1")
        if not ts or not received_hash:
            return False

        manifest = f"id:{data_id};request-id:{request_id or ''};ts:{ts};"
        digest = hmac.new(
            settings.mercado_pago_webhook_secret.encode("utf-8"),
            manifest.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(digest, received_hash)

    @staticmethod
    def _notification() -> dict:
        # Mercado Pago only accepts public HTTPS callbacks; locally the account-level
        # webhook configuration (or a tunnel) is used instead.
        base_url = settings.app_base_url.rstrip("/")
        if not base_url.startswith("https://"):
            return {}
        return {"notification_url": f"{base_url}/payments/mercado-pago/webhook"}
