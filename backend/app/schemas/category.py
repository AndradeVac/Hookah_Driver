from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    image_url: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    image_url: str | None = None
    active: bool | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    image_url: str | None = None
    active: bool
    created_at: datetime
    updated_at: datetime