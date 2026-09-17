from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.order_status_history import OrderStatusHistory
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


_PAYMENT_STATUS_MAP = {
    "approved": PaymentStatus.PAID,
    "accredited": PaymentStatus.PAID,
    "processed": PaymentStatus.PAID,
    "rejected": PaymentStatus.FAILED,
    "cancelled": PaymentStatus.FAILED,
}


@router.post("/mercado-pago/webhook")
async def mercado_pago_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-signature"),
    x_request_id: str | None = Header(default=None, alias="x-request-id"),
    db: Session = Depends(get_db),
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
        data = json.loads(payload.decode("utf-8")) if payload else {}
    except Exception:
        raise HTTPException(status_code=400, detail="payload inválido")

    topic = data.get("type") or request.query_params.get("type") or request.query_params.get("topic")
    resource_id = data_id or (data.get("data") or {}).get("id")

    if topic and resource_id:
        service = PaymentService()
        try:
            if topic == "payment":
                resource = service.get_payment_status(resource_id)
            elif topic in ("order", "orders"):
                resource = service.get_order_status(resource_id)
            else:
                resource = None
        except Exception:
            resource = None

        if resource:
            external_reference = resource.get("external_reference")
            status_key = (resource.get("status") or "").lower()
            payment_status = _PAYMENT_STATUS_MAP.get(status_key, PaymentStatus.PENDING)
            if external_reference:
                try:
                    order = db.query(Order).filter(Order.id == UUID(external_reference)).first()
                except ValueError:
                    order = None
                if order is not None:
                    order.payment_status = payment_status
                    if payment_status is PaymentStatus.PAID and order.status is OrderStatus.AWAITING_PAYMENT:
                        order.status = OrderStatus.RECEIVED
                        order.paid_at = datetime.now(timezone.utc)
                        order.status_history.append(OrderStatusHistory(status=OrderStatus.RECEIVED, reason="Pagamento confirmado pelo Mercado Pago"))
                    elif payment_status is PaymentStatus.FAILED and order.status is OrderStatus.AWAITING_PAYMENT:
                        order.status = OrderStatus.CANCELLED
                        order.status_history.append(OrderStatusHistory(status=OrderStatus.CANCELLED, reason="Pagamento recusado pelo Mercado Pago"))
                    db.commit()

    return {
        "status": "received",
    }

