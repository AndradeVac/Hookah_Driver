from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.brand import (
    BrandCreate,
    BrandResponse,
    BrandUpdate,
)
from app.services.brand import BrandService


router = APIRouter(
    prefix="/brands",
    tags=["Brands"],
)


@router.post(
    "",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = BrandService(db)

    return service.create(data)


@router.get(
    "",
    response_model=list[BrandResponse],
)
def get_brands(
    db: Session = Depends(get_db),
):
    service = BrandService(db)

    return service.get_all()


@router.get(
    "/{brand_id}",
    response_model=BrandResponse,
)
def get_brand(
    brand_id: UUID,
    db: Session = Depends(get_db),
):
    service = BrandService(db)

    return service.get_by_id(brand_id)


@router.patch(
    "/{brand_id}",
    response_model=BrandResponse,
)
def update_brand(
    brand_id: UUID,
    data: BrandUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = BrandService(db)

    return service.update(
        brand_id,
        data,
    )


@router.delete(
    "/{brand_id}",
    response_model=BrandResponse,
)
def delete_brand(
    brand_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = BrandService(db)

    return service.delete(brand_id)