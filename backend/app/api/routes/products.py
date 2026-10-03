from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.product import ProductService


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return ProductService(db).create(data)


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
):
    return ProductService(db).get_all()


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    return ProductService(db).get_by_id(product_id)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return ProductService(db).update(product_id, data)


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return ProductService(db).delete(product_id)
