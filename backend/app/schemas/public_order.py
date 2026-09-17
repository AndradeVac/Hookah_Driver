from uuid import UUID

from pydantic import BaseModel, Field

from app.models.order import PaymentMethod


class PublicOrderItem(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=20)
    notes: str | None = Field(default=None, max_length=300)


class PublicOrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=150)
    customer_phone: str = Field(pattern=r"^\+?[0-9\s().-]{10,20}$")
    payment_method: PaymentMethod = PaymentMethod.PIX
    items: list[PublicOrderItem] = Field(min_length=1, max_length=30)


class PublicOrderResponse(BaseModel):
    order_id: UUID
    order_number: int
    status: str
    total: str
    public_token: UUID
    payment_status: str
    checkout_url: str | None = None
    preference_id: str | None = None
    pix_qr_code: str | None = None
    pix_qr_code_base64: str | None = None



class PublicOrderTracking(BaseModel):
    order_number: int
    status: str
    total: str
    created_at: str
    payment_status: str
    pix_qr_code: str | None = None
    pix_qr_code_base64: str | None = None
