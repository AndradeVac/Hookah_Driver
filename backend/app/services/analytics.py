from datetime import datetime, timezone
from decimal import Decimal
from io import BytesIO

from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
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

    @staticmethod
    def period_bounds(period: str) -> tuple[datetime | None, datetime | None]:
        if period == "all":
            return None, None

        now = datetime.now(timezone.utc)
        if period == "quarter":
            quarter_month = ((now.month - 1) // 3) * 3 + 1
            start = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        next_month = start.month + (3 if period == "quarter" else 1)
        year = start.year + (next_month - 1) // 12
        month = (next_month - 1) % 12 + 1
        end = start.replace(year=year, month=month)
        return start, end

    def _filters(self, period: str):
        start, end = self.period_bounds(period)
        conditions = [Order.status != OrderStatus.CANCELLED]
        if start is not None:
            conditions.append(Order.created_at >= start)
        if end is not None:
            conditions.append(Order.created_at < end)
        return conditions, start, end

    def dashboard(self, period: str = "month") -> DashboardAnalyticsResponse:
        if period not in {"month", "quarter", "all"}:
            raise ValueError("Período inválido. Use month, quarter ou all.")

        conditions, start, end = self._filters(period)
        revenue, order_count, average_ticket = self.db.execute(
            select(
                func.coalesce(func.sum(Order.total), 0),
                func.count(Order.id),
                func.coalesce(func.avg(Order.total), 0),
            ).where(*conditions)
        ).one()

        product_rows = self.db.execute(
            select(
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("quantity"),
                func.sum(OrderItem.total_price).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(*conditions)
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
            .where(*conditions)
            .group_by(func.extract("hour", Order.created_at))
            .order_by(func.extract("hour", Order.created_at))
        ).all()

        status_rows = self.db.execute(
            select(Order.status, func.count(Order.id))
            .where(*conditions)
            .group_by(Order.status)
            .order_by(Order.status)
        ).all()

        payment_rows = self.db.execute(
            select(Order.payment_method, func.count(Order.id))
            .where(*conditions)
            .group_by(Order.payment_method)
            .order_by(Order.payment_method)
        ).all()

        products = [ProductSalesSummary(product_name=row.product_name, quantity=int(row.quantity), revenue=Decimal(row.revenue)) for row in product_rows]
        sales_by_hour = [HourSalesSummary(hour=int(row.hour), orders=int(row.orders), revenue=Decimal(row.revenue)) for row in hourly_rows]

        return DashboardAnalyticsResponse(
            period=period,
            period_start=start.isoformat() if start else "",
            period_end=end.isoformat() if end else "",
            revenue=Decimal(revenue),
            order_count=int(order_count),
            average_ticket=Decimal(average_ticket),
            top_product=products[0] if products else None,
            products=products,
            sales_by_hour=sales_by_hour,
            orders_by_status=[BreakdownSummary(label=row[0].value, count=int(row[1])) for row in status_rows],
            orders_by_payment=[BreakdownSummary(label=row[0].value, count=int(row[1])) for row in payment_rows],
        )

    def export_xlsx(self, period: str) -> bytes:
        dashboard = self.dashboard(period)
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Resumo"
        sheet.append(["Período", dashboard.period])
        sheet.append(["Faturamento", float(dashboard.revenue)])
        sheet.append(["Pedidos", dashboard.order_count])
        sheet.append(["Ticket médio", float(dashboard.average_ticket)])
        sheet.append([])
        sheet.append(["Produto", "Quantidade", "Receita"])
        for product in dashboard.products:
            sheet.append([product.product_name, product.quantity, float(product.revenue)])
        output = BytesIO()
        workbook.save(output)
        return output.getvalue()

    def export_pdf(self, period: str) -> bytes:
        dashboard = self.dashboard(period)
        output = BytesIO()
        document = canvas.Canvas(output, pagesize=A4)
        document.setTitle("Hookah Driver - Dashboard")
        document.setFont("Helvetica-Bold", 18)
        document.drawString(48, 790, "Hookah Driver - Dashboard")
        document.setFont("Helvetica", 10)
        document.drawString(48, 770, f"Período: {dashboard.period}")
        document.drawString(48, 750, f"Faturamento: R$ {dashboard.revenue:.2f}")
        document.drawString(48, 732, f"Pedidos: {dashboard.order_count}")
        document.drawString(48, 714, f"Ticket médio: R$ {dashboard.average_ticket:.2f}")
        document.setFont("Helvetica-Bold", 12)
        document.drawString(48, 680, "Produtos mais vendidos")
        document.setFont("Helvetica", 10)
        y_position = 660
        for index, product in enumerate(dashboard.products[:10], start=1):
            document.drawString(58, y_position, f"{index}. {product.product_name} - {product.quantity} un. - R$ {product.revenue:.2f}")
            y_position -= 18
        document.save()
        return output.getvalue()
