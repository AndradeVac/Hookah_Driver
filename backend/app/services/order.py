from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.order_status_history import OrderStatusHistory
from app.models.audit_log import AuditLog
from app.models.user import User
from app.repositories.customer import CustomerRepository
from app.repositories.order import OrderRepository
from app.repositories.product import ProductRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate


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
        if customer is None or not getattr(customer, "active", True):
            raise NotFoundError("Cliente não encontrado.")

        subtotal = Decimal("0.00")
        order = Order(
            customer_id=customer.id,
            payment_method=data.payment_method,
            status=initial_status,
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
        )


        for item_data in data.items:
            product = self.product_repository.get_by_id(item_data.product_id)
            if product is None or not getattr(product, "active", True):
                raise NotFoundError(
                    f"Produto não encontrado: {item_data.product_id}."
                )

            unit_price = product.price
            total_price = (unit_price * item_data.quantity).quantize(
                Decimal("0.01")
            )
            subtotal += total_price
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item_data.quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                    notes=item_data.notes,
                )
            )

        order.subtotal = subtotal
        order.total = subtotal
        order.status_history.append(
            OrderStatusHistory(status=initial_status)
        )

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

    def get_all(self) -> list[Order]:
        return self.repository.get_all()

    def update_status(
        self,
        order_id: UUID,
        data: OrderStatusUpdate,
        actor: User | None = None,
    ) -> Order:
        order = self.get_by_id(order_id)
        allowed = self.allowed_transitions[order.status]

        if data.status not in allowed:
            raise BusinessRuleError(
                f"Não é possível alterar {order.status.value} para {data.status.value}."
            )
        if data.status is OrderStatus.CANCELLED and not data.reason:
            raise BusinessRuleError("Informe o motivo do cancelamento.")

        order.status = data.status
        order.status_history.append(
            OrderStatusHistory(status=data.status, reason=data.reason)
        )
        if actor is not None:
            self.db.add(AuditLog(actor_user_id=actor.id, action="ORDER_STATUS_CHANGED", entity_type="ORDER", entity_id=order.id, details=f"status={data.status.value}"))
        try:
            self.repository.update(order)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return order
