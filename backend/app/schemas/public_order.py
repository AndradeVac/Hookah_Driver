import re
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.order import PaymentMethod


def normalize_phone(value: str) -> str:
    """Keep digits only, so "(11) 99999-9999" and "11999999999" are the same customer."""
    digits = re.sub(r"\D", "", value)
    if digits.startswith("55") and len(digits) in (12, 13):
        digits = digits[2:]
    if len(digits) not in (10, 11):
        raise ValueError("Informe um telefone válido com DDD.")
    return digits


class PublicOrderItem(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=20)
    notes: str | None = Field(default=None, max_length=300)


class PublicOrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=10, max_length=20)
    payment_method: PaymentMethod = PaymentMethod.PIX
    items: list[PublicOrderItem] = Field(min_length=1, max_length=30)

    @field_validator("customer_name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Informe seu nome.")
        return value

    @field_validator("customer_phone")
    @classmethod
    def _normalize_phone(cls, value: str) -> str:
        return normalize_phone(value)


class PublicOrderResponse(BaseModel):
    order_id: UUID
    order_number: int
    status: str
    total: str
    public_token: UUID
    payment_status: str
    checkout_url: str | None = None
    preference_id: str | None = None
    mercado_pago_public_key: str | None = None
    pix_qr_code: str | None = None
    pix_qr_code_base64: str | None = None
    payment_error: str | None = None


class PublicOrderTracking(BaseModel):
    order_number: int
    status: str
    total: str
    created_at: str
    payment_status: str
    pix_qr_code: str | None = None
    pix_qr_code_base64: str | None = None
