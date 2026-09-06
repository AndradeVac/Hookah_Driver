from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.schemas.analytics import (
    BreakdownSummary,
    DashboardAnalyticsResponse,
    HourSalesSummary,
    ProductSalesSummary,
)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def dashboard(self) -> DashboardAnalyticsResponse:
        valid_orders = Order.status != OrderStatus.CANCELLED
        revenue, order_count, average_ticket = self.db.execute(
            select(
                func.coalesce(func.sum(Order.total), 0),
                func.count(Order.id),
                func.coalesce(func.avg(Order.total), 0),
            ).where(valid_orders)
        ).one()

        product_rows = self.db.execute(
            select(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("quantity"),
                func.sum(OrderItem.total_price).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(valid_orders)
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(10)
        ).all()

        hourly_rows = self.db.execute(
            select(
                func.extract("hour", Order.created_at).label("hour"),
                func.count(Order.id).label("orders"),
                func.sum(Order.total).label("revenue"),
            )
            .where(valid_orders)
            .group_by(func.extract("hour", Order.created_at))
            .order_by(func.extract("hour", Order.created_at))
        ).all()

        status_rows = self.db.execute(
            select(Order.status, func.count(Order.id))
            .group_by(Order.status)
            .order_by(Order.status)
        ).all()

        payment_rows = self.db.execute(
            select(Order.payment_method, func.count(Order.id))
            .where(valid_orders)
            .group_by(Order.payment_method)
            .order_by(Order.payment_method)
        ).all()

        products = [
            ProductSalesSummary(
                product_name=row.product_name,
                quantity=int(row.quantity),
                revenue=Decimal(row.revenue),
            )
            for row in product_rows
        ]

        sales_by_hour = [
            HourSalesSummary(
                hour=int(row.hour),
                orders=int(row.orders),
                revenue=Decimal(row.revenue),
            )
            for row in hourly_rows
        ]

        return DashboardAnalyticsResponse(
            revenue=Decimal(revenue),
            order_count=int(order_count),
            average_ticket=Decimal(average_ticket),
            top_product=products[0] if products else None,
            products=products,
            sales_by_hour=sales_by_hour,
            orders_by_status=[BreakdownSummary(label=row[0].value, count=int(row[1])) for row in status_rows],
            orders_by_payment=[BreakdownSummary(label=row[0].value, count=int(row[1])) for row in payment_rows],
        )
