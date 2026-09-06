from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.flavor import (
    FlavorCreate,
    FlavorResponse,
    FlavorUpdate,
)
from app.services.flavor import FlavorService


router = APIRouter(
    prefix="/flavors",
    tags=["Flavors"],
)


@router.post(
    "",
    response_model=FlavorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_flavor(
    data: FlavorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = FlavorService(db)

    try:
        return service.create(data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.get(
    "",
    response_model=list[FlavorResponse],
)
def get_flavors(
    db: Session = Depends(get_db),
):
    service = FlavorService(db)

    return service.get_all()


@router.get(
    "/{flavor_id}",
    response_model=FlavorResponse,
)
def get_flavor(
    flavor_id: UUID,
    db: Session = Depends(get_db),
):
    service = FlavorService(db)

    try:
        return service.get_by_id(flavor_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.patch(
    "/{flavor_id}",
    response_model=FlavorResponse,
)
def update_flavor(
    flavor_id: UUID,
    data: FlavorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = FlavorService(db)

    try:
        return service.update(flavor_id, data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.delete(
    "/{flavor_id}",
    response_model=FlavorResponse,
)
def delete_flavor(
    flavor_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    service = FlavorService(db)

    try:
        return service.delete(flavor_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))