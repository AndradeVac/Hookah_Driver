from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FlavorCreate(BaseModel):
    brand_id: UUID
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    image_url: str | None = Field(default=None, max_length=300)


class FlavorUpdate(BaseModel):
    brand_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    image_url: str | None = Field(default=None, max_length=300)
    active: bool | None = None


class FlavorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand_id: UUID
    name: str
    description: str | None
    image_url: str | None = None
    active: bool
