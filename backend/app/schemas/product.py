from uuid import UUID
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProductCreate(BaseModel):
    category_id: UUID
    flavor_id: UUID | None = None
    name: str
    description: str | None = None
    image_url: str | None = None
    price: Decimal


class ProductUpdate(BaseModel):
    category_id: UUID | None = None
    flavor_id: UUID | None = None
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    price: Decimal | None = None
    active: bool | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    flavor_id: UUID | None = None
    name: str
    description: str | None
    image_url: str | None = None
    price: Decimal
    active: bool
    created_at: datetime
    updated_at: datetime