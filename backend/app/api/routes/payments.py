from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.config import settings
from app.services.payment import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/mercado-pago/checkout")
def create_payment_checkout(
    order_id: str,
    title: str,
    amount: Decimal,
):
    return PaymentService().create_order(
        order_id=order_id,
        title=title,
        amount=amount,
    )


@router.post("/mercado-pago/webhook")
async def mercado_pago_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-signature"),
    x_request_id: str | None = Header(default=None, alias="x-request-id"),
):
    payload = await request.body()
    data_id = request.query_params.get("data.id") or request.query_params.get("id") or ""
    if not PaymentService().verify_webhook_signature(
        data_id=data_id,
        request_id=x_request_id,
        x_signature=x_signature,
    ):
        raise HTTPException(status_code=401, detail="assinatura inválida")

    try:
        import json

        data = json.loads(payload.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="payload inválido")

    return {
        "status": "received",
        "data": data,
    }
