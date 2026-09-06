from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
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
):
    service = ProductService(db)

    return service.create(data)


@router.get(
    "",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    return service.get_all()


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.get_by_id(product_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.update(
            product_id,
            data,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    service = ProductService(db)

    try:
        return service.delete(product_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )