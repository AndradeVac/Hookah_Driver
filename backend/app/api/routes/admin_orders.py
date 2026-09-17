from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])

@router.get("/tracking")
async def get_tracking_orders(db: Session = Depends(get_db)):
    """Get all orders for tracking (not FINISHED)"""
    orders = db.query(Order).filter(Order.status != OrderStatus.FINISHED).order_by(Order.created_at.desc()).all()
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status.value,
            "total": str(o.total),
            "customer_name": o.customer_name,
            "payment_status": o.payment_status.value,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]

@router.put("/{order_id}/status")
async def update_order_status(order_id: str, status: dict, db: Session = Depends(get_db)):
    """Update order status"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    try:
        order.status = OrderStatus(status.get("status"))
        db.commit()
        return {"status": "ok", "order_id": order_id}
    except ValueError:
        raise HTTPException(status_code=400, detail="Status inválido")

@router.websocket("/ws/orders")
async def websocket_orders(websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket para acompanhamento em tempo real"""
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
