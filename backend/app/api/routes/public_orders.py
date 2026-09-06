from uuid import UUID

import asyncio

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from app.repositories.customer import CustomerRepository
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.public_order import PublicOrderCreate, PublicOrderResponse, PublicOrderTracking
from app.services.order import OrderService


router = APIRouter(prefix="/public", tags=["Public customer"])


@router.websocket("/ws/orders/{public_token}")
async def public_order_socket(websocket: WebSocket, public_token: UUID, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        last_status = None
        while True:
            db.expire_all()
            order = db.query(Order).filter_by(public_token=public_token).first()
            if order is None:
                await websocket.send_json({"error": "Pedido não encontrado"})
                break
            if order.status.value != last_status:
                await websocket.send_json({"order_number": order.order_number, "status": order.status.value, "total": str(order.total)})
                last_status = order.status.value
            if order.status.value in {"FINISHED", "CANCELLED"}:
                break
            await asyncio.sleep(3)
    except (WebSocketDisconnect, RuntimeError):
        pass


@router.post("/orders", response_model=PublicOrderResponse, status_code=201)
def create_public_order(data: PublicOrderCreate, db: Session = Depends(get_db)):
    customers = CustomerRepository(db)
    customer = customers.get_by_phone(data.customer_phone)
    if customer is None:
        customer = customers.create(Customer(name=data.customer_name, phone=data.customer_phone))
        db.flush()
    elif customer.name != data.customer_name:
        customer.name = data.customer_name

    order = OrderService(db).create(OrderCreate(
        customer_id=customer.id,
        payment_method=data.payment_method,
        items=[OrderItemCreate(product_id=item.product_id, quantity=item.quantity, notes=item.notes) for item in data.items],
    ))
    return PublicOrderResponse(order_id=order.id, order_number=order.order_number, status=order.status.value, total=str(order.total), public_token=order.public_token)


@router.get("/orders/{public_token}", response_model=PublicOrderTracking)
def track_public_order(public_token: UUID, db: Session = Depends(get_db)):
    order = db.query(Order).filter_by(public_token=public_token).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return PublicOrderTracking(order_number=order.order_number, status=order.status.value, total=str(order.total), created_at=order.created_at.isoformat())