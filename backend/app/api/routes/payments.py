import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.order import PaymentStatus
from app.services.order import OrderService
from app.services.payment import PaymentGatewayError, PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

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
    data_id = request.query_params.get("data.id") or request.query_params.get("id") or ""
    if not PaymentService.verify_webhook_signature(
        data_id=data_id,
        request_id=x_request_id,
        x_signature=x_signature,
    ):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")

    try:
        body = await request.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Payload inválido.")

    topic = body.get("type") or request.query_params.get("type") or request.query_params.get("topic")
    resource_id = data_id or str((body.get("data") or {}).get("id") or "")
    if not topic or not resource_id:
        return {"status": "ignored"}

    service = PaymentService()
    try:
        if topic == "payment":
            resource = service.get_payment(resource_id)
        elif topic in ("order", "orders", "merchant_order"):
            resource = service.get_merchant_order(resource_id)
        else:
            return {"status": "ignored"}
    except PaymentGatewayError:
        # Non-2xx makes Mercado Pago retry the notification later.
        raise HTTPException(status_code=502, detail="Falha ao consultar o Mercado Pago.")

    payment_status = _PAYMENT_STATUS_MAP.get((resource.get("status") or "").lower())
    try:
        order_id = UUID(str(resource.get("external_reference")))
    except ValueError:
        logger.warning("Webhook %s/%s without a valid external_reference", topic, resource_id)
        return {"status": "ignored"}

    if payment_status is not None:
        OrderService(db).apply_payment_status(order_id, payment_status)
    return {"status": "received"}
