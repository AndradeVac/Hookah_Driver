from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.customer import CustomerService


router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
):
    return CustomerService(db).create(data)


@router.get("", response_model=list[CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    return CustomerService(db).get_all()


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    return CustomerService(db).get_by_id(customer_id)


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
):
    return CustomerService(db).update(customer_id, data)


@router.delete("/{customer_id}", response_model=CustomerResponse)
def delete_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
):
    return CustomerService(db).delete(customer_id)
