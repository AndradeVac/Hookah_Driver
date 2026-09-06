from decimal import Decimal

from pydantic import BaseModel


class ProductSalesSummary(BaseModel):
    product_name: str
    quantity: int
    revenue: Decimal


class HourSalesSummary(BaseModel):
    hour: int
    orders: int
    revenue: Decimal


class BreakdownSummary(BaseModel):
    label: str
    count: int


class DashboardAnalyticsResponse(BaseModel):
    revenue: Decimal
    order_count: int
    average_ticket: Decimal
    top_product: ProductSalesSummary | None
    products: list[ProductSalesSummary]
    sales_by_hour: list[HourSalesSummary]
    orders_by_status: list[BreakdownSummary]
    orders_by_payment: list[BreakdownSummary]
