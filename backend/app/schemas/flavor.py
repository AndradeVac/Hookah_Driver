from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FlavorCreate(BaseModel):
    brand_id: UUID
    name: str
    description: str | None = None


class FlavorUpdate(BaseModel):
    brand_id: UUID | None = None
    name: str | None = None
    description: str | None = None
    active: bool | None = None


class FlavorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand_id: UUID
    name: str
    description: str | None
    active: bool