from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.order import OrderService


staff_only = require_roles(UserRole.ADMIN, UserRole.OPERATOR)

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(staff_only),
):
    return OrderService(db).create(data)


@router.get("", response_model=list[OrderResponse])
def get_orders(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(staff_only),
):
    return OrderService(db).get_all(limit=limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(staff_only),
):
    return OrderService(db).get_by_id(order_id)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(staff_only),
):
    return OrderService(db).update_status(order_id, data, current_user)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(staff_only),
):
    OrderService(db).delete_order(order_id, current_user)
    return None


@router.delete("", status_code=status.HTTP_200_OK)
def delete_all_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(staff_only),
):
    return OrderService(db).delete_all_orders(current_user)
