from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    phone: str | None = None


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str | None
    created_at: datetime
    updated_at: datetime
