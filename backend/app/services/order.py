from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.audit_log import AuditLog
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.product import Product
from app.models.user import User
from app.repositories.customer import CustomerRepository
from app.repositories.order import OrderRepository
from app.repositories.product import ProductRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate


def item_display_name(product: Product) -> str:
    """Name stored on the order item; flavored products carry brand and flavor."""
    flavor = product.flavor
    if flavor is None:
        return product.name
    return f"{product.name} · {flavor.brand.name} {flavor.name}"


class OrderService:
    allowed_transitions = {
        OrderStatus.AWAITING_PAYMENT: {OrderStatus.RECEIVED, OrderStatus.CANCELLED},
        OrderStatus.RECEIVED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
        OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
        OrderStatus.READY: {OrderStatus.FINISHED, OrderStatus.CANCELLED},
        OrderStatus.FINISHED: set(),
        OrderStatus.CANCELLED: set(),
    }

    def __init__(self, db: Session):
        self.repository = OrderRepository(db)
        self.customer_repository = CustomerRepository(db)
        self.product_repository = ProductRepository(db)
        self.db = db

    def create(self, data: OrderCreate, initial_status: OrderStatus = OrderStatus.RECEIVED) -> Order:
        customer = self.customer_repository.get_by_id(data.customer_id)
        if customer is None:
            raise NotFoundError("Cliente não encontrado.")

        order = Order(
            customer_id=customer.id,
            payment_method=data.payment_method,
            status=initial_status,
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
        )

        subtotal = Decimal("0.00")
        for item_data in data.items:
            product = self.product_repository.get_by_id(item_data.product_id)
            if product is None:
                raise NotFoundError(f"Produto não encontrado: {item_data.product_id}.")

            total_price = (product.price * item_data.quantity).quantize(Decimal("0.01"))
            subtotal += total_price
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=item_display_name(product),
                    quantity=item_data.quantity,
                    unit_price=product.price,
                    total_price=total_price,
                    notes=item_data.notes,
                )
            )

        order.subtotal = subtotal
        order.total = subtotal
        order.status_history.append(OrderStatusHistory(status=initial_status))

        try:
            self.repository.create(order)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return order

    def get_by_id(self, order_id: UUID) -> Order:
        order = self.repository.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Pedido não encontrado.")
        return order

    def get_all(self, limit: int | None = None) -> list[Order]:
        return self.repository.get_all(limit=limit)

    def update_status(
        self,
        order_id: UUID,
        data: OrderStatusUpdate,
        actor: User | None = None,
    ) -> Order:
        order = self.get_by_id(order_id)

        if data.status not in self.allowed_transitions[order.status]:
            raise BusinessRuleError(
                f"Não é possível alterar {order.status.value} para {data.status.value}."
            )
        if (
            order.status is OrderStatus.AWAITING_PAYMENT
            and data.status is OrderStatus.RECEIVED
            and order.payment_status is not PaymentStatus.PAID
        ):
            raise BusinessRuleError("O pedido só pode ser liberado após a confirmação do pagamento.")
        if data.status is OrderStatus.CANCELLED and not data.reason:
            raise BusinessRuleError("Informe o motivo do cancelamento.")

        order.status = data.status
        order.status_history.append(
            OrderStatusHistory(
                status=data.status,
                reason=data.reason,
                changed_by_user_id=actor.id if actor else None,
            )
        )
        if actor is not None:
            self.db.add(AuditLog(
                actor_user_id=actor.id,
                action="ORDER_STATUS_CHANGED",
                entity_type="ORDER",
                entity_id=order.id,
                details=f"status={data.status.value}",
            ))
        try:
            self.repository.update(order)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return order

    def apply_payment_status(self, order_id: UUID, payment_status: PaymentStatus) -> Order | None:
        """Apply a payment result reported by the gateway. Safe to call repeatedly."""
        order = self.repository.get_by_id(order_id)
        if order is None:
            return None
        if order.payment_status is PaymentStatus.PAID:
            # A confirmed payment is final; late or duplicate notifications are ignored.
            return order

        order.payment_status = payment_status
        if payment_status is PaymentStatus.PAID:
            order.paid_at = datetime.now(timezone.utc)
            if order.status is OrderStatus.AWAITING_PAYMENT:
                order.status = OrderStatus.RECEIVED
                order.status_history.append(OrderStatusHistory(
                    status=OrderStatus.RECEIVED,
                    reason="Pagamento confirmado pelo Mercado Pago",
                ))
        elif payment_status is PaymentStatus.FAILED and order.status is OrderStatus.AWAITING_PAYMENT:
            order.status = OrderStatus.CANCELLED
            order.status_history.append(OrderStatusHistory(
                status=OrderStatus.CANCELLED,
                reason="Pagamento recusado pelo Mercado Pago",
            ))

        self.db.commit()
        return order
