from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
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
):
    service = FlavorService(db)

    return service.create(data)


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

    return service.get_by_id(flavor_id)


@router.patch(
    "/{flavor_id}",
    response_model=FlavorResponse,
)
def update_flavor(
    flavor_id: UUID,
    data: FlavorUpdate,
    db: Session = Depends(get_db),
):
    service = FlavorService(db)

    return service.update(
        flavor_id,
        data,
    )


@router.delete(
    "/{flavor_id}",
    response_model=FlavorResponse,
)
def delete_flavor(
    flavor_id: UUID,
    db: Session = Depends(get_db),
):
    service = FlavorService(db)

    return service.delete(flavor_id)