"""Endpoints used by the customer menu (no authentication)."""
import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.exceptions import NotFoundError
from app.core.rate_limit import public_lookup_rate_limit, public_order_rate_limit
from app.models.customer import Customer
from app.models.order import Order, OrderStatus, PaymentMethod
from app.repositories.customer import CustomerRepository
from app.repositories.order import OrderRepository
from app.schemas.audit import PublicHistoryItem, PublicHistoryOrder
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.public_order import PublicOrderCreate, PublicOrderResponse, PublicOrderTracking
from app.services.order import OrderService
from app.services.payment import PaymentGatewayError, PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["Public customer"])

_SOCKET_POLL_SECONDS = 3
_FINAL_STATUSES = {OrderStatus.FINISHED, OrderStatus.CANCELLED}


def _tracking(order: Order) -> PublicOrderTracking:
    return PublicOrderTracking(
        order_number=order.order_number,
        status=order.status.value,
        total=str(order.total),
        created_at=order.created_at.isoformat(),
        payment_status=order.payment_status.value,
        pix_qr_code=order.pix_qr_code,
        pix_qr_code_base64=order.pix_qr_code_base64,
    )


@router.websocket("/ws/orders/{public_token}")
async def public_order_socket(websocket: WebSocket, public_token: UUID):
    """Pushes status changes of one order until it is finished or cancelled."""
    await websocket.accept()
    last_snapshot = None
    try:
        while True:
            # A short-lived session per poll keeps idle sockets from holding DB connections.
            with SessionLocal() as db:
                order = OrderRepository(db).get_by_public_token(public_token)
                payload = None if order is None else {
                    "order_number": order.order_number,
                    "status": order.status.value,
                    "total": str(order.total),
                    "payment_status": order.payment_status.value,
                }
                finished = order is not None and order.status in _FINAL_STATUSES

            if payload is None:
                await websocket.send_json({"error": "Pedido não encontrado"})
                break
            if payload != last_snapshot:
                await websocket.send_json(payload)
                last_snapshot = payload
            if finished:
                break
            await asyncio.sleep(_SOCKET_POLL_SECONDS)
        await websocket.close()
    except (WebSocketDisconnect, RuntimeError):
        pass


@router.post(
    "/orders",
    response_model=PublicOrderResponse,
    status_code=201,
    dependencies=[Depends(public_order_rate_limit)],
)
def create_public_order(data: PublicOrderCreate, db: Session = Depends(get_db)):
    customers = CustomerRepository(db)
    customer = customers.get_by_phone(data.customer_phone)
    if customer is None:
        customer = customers.create(Customer(name=data.customer_name, phone=data.customer_phone))
    elif customer.name != data.customer_name:
        customer.name = data.customer_name

    online_payment = data.payment_method in (PaymentMethod.PIX, PaymentMethod.CARD)
    order = OrderService(db).create(
        OrderCreate(
            customer_id=customer.id,
            payment_method=data.payment_method,
            items=[
                OrderItemCreate(product_id=item.product_id, quantity=item.quantity, notes=item.notes)
                for item in data.items
            ],
        ),
        initial_status=OrderStatus.AWAITING_PAYMENT if online_payment else OrderStatus.RECEIVED,
    )

    response = PublicOrderResponse(
        order_id=order.id,
        order_number=order.order_number,
        status=order.status.value,
        total=str(order.total),
        public_token=order.public_token,
        payment_status=order.payment_status.value,
    )

    title = f"Pedido #{order.order_number} - Hookah Driver"
    try:
        if data.payment_method is PaymentMethod.PIX:
            pix = PaymentService().create_pix_payment(
                order_id=str(order.id),
                description=title,
                amount=order.total,
                payer_email=f"cliente{customer.phone}@hookahdriver.com",
            )
            order.mercado_pago_payment_id = pix["payment_id"]
            order.pix_qr_code = pix["qr_code"]
            order.pix_qr_code_base64 = pix["qr_code_base64"]
            db.commit()
            response.pix_qr_code = pix["qr_code"]
            response.pix_qr_code_base64 = pix["qr_code_base64"]
        elif data.payment_method is PaymentMethod.CARD:
            checkout = PaymentService().create_checkout(
                order_id=str(order.id),
                title=title,
                amount=order.total,
                return_path=f"/cliente?token={order.public_token}",
            )
            order.mercado_pago_order_id = checkout["preference_id"]
            db.commit()
            response.checkout_url = checkout["checkout_url"]
            response.preference_id = checkout["preference_id"]
            response.mercado_pago_public_key = settings.mercado_pago_public_key or None
    except PaymentGatewayError:
        # The order is kept (AWAITING_PAYMENT) so staff can see it and settle manually.
        db.rollback()
        logger.exception("Could not start %s payment for order %s", data.payment_method.value, order.id)
        response.payment_error = "Não foi possível gerar o pagamento agora. Avise a equipe do lounge."

    return response


@router.get(
    "/orders/{public_token}",
    response_model=PublicOrderTracking,
    dependencies=[Depends(public_lookup_rate_limit)],
)
def track_public_order(public_token: UUID, db: Session = Depends(get_db)):
    order = OrderRepository(db).get_by_public_token(public_token)
    if order is None:
        raise NotFoundError("Pedido não encontrado.")
    return _tracking(order)


@router.get(
    "/history",
    response_model=list[PublicHistoryOrder],
    dependencies=[Depends(public_lookup_rate_limit)],
)
def public_order_history(
    phone: str = Query(min_length=10, max_length=20),
    db: Session = Depends(get_db),
):
    customer = CustomerRepository(db).get_by_phone(phone)
    if customer is None:
        return []
    orders = OrderRepository(db).get_recent_by_customer(customer.id, limit=20)
    return [
        PublicHistoryOrder(
            order_number=order.order_number,
            status=order.status.value,
            total=str(order.total),
            created_at=order.created_at,
            items=[
                PublicHistoryItem(
                    product_id=item.product_id,
                    product_name=item.product_name,
                    quantity=item.quantity,
                    notes=item.notes,
                )
                for item in order.items
            ],
        )
        for order in orders
    ]
