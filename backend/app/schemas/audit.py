from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    actor_name: str | None
    action: str
    entity_type: str
    entity_id: UUID | None
    details: str | None
    created_at: datetime


class PublicHistoryItem(BaseModel):
    product_id: UUID
    product_name: str
    quantity: int
    notes: str | None


class PublicHistoryOrder(BaseModel):
    order_number: int
    status: str
    total: str
    created_at: datetime
    items: list[PublicHistoryItem]
