from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BrandCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )


class BrandUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    active: bool | None = None


class BrandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime