from decimal import Decimal
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.main import app
from app.models.category import Category
from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product


@pytest.mark.integration
@pytest.mark.asyncio
async def test_orders_api_end_to_end():
    suffix = uuid4().hex[:8]
    order_ids = []

    with SessionLocal() as db:
        category = db.scalar(
            select(Category).where(Category.active.is_(True)).order_by(Category.name)
        )
        assert category is not None

        customer = Customer(name=f"Integration Customer {suffix}")
        inactive_customer = Customer(
            name=f"Integration Inactive Customer {suffix}",
            active=False,
        )
        first_product = Product(
            category_id=category.id,
            name=f"Integration Product A {suffix}",
            price=Decimal("10.00"),
        )
        second_product = Product(
            category_id=category.id,
            name=f"Integration Product B {suffix}",
            price=Decimal("7.50"),
        )
        inactive_product = Product(
            category_id=category.id,
            name=f"Integration Inactive Product {suffix}",
            price=Decimal("5.00"),
            active=False,
        )
        db.add_all(
            [customer, inactive_customer, first_product, second_product, inactive_product]
        )
        db.commit()
        db.refresh(customer)
        db.refresh(inactive_customer)
        db.refresh(first_product)
        db.refresh(second_product)
        db.refresh(inactive_product)

        customer_id = str(customer.id)
        inactive_customer_id = str(inactive_customer.id)
        first_product_id = str(first_product.id)
        second_product_id = str(second_product.id)
        inactive_product_id = str(inactive_product.id)
        temporary_ids = {
            "customer": customer.id,
            "inactive_customer": inactive_customer.id,
            "first_product": first_product.id,
            "second_product": second_product.id,
            "inactive_product": inactive_product.id,
            "category": category.id,
        }

    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            created = await client.post(
                "/orders",
                json={
                    "customer_id": customer_id,
                    "payment_method": "PIX",
                    "items": [
                        {"product_id": first_product_id, "quantity": 2},
                        {"product_id": second_product_id, "quantity": 3},
                    ],
                },
            )
            assert created.status_code == 201, created.text
            order = created.json()
            order_ids.append(order["id"])
            assert order["subtotal"] == "42.50"
            assert order["total"] == "42.50"
            assert [item["unit_price"] for item in order["items"]] == [
                "10.00",
                "7.50",
            ]
            assert order["status"] == "RECEIVED"
            assert len(order["status_history"]) == 1

            for next_status in ("PREPARING", "READY", "FINISHED"):
                response = await client.patch(
                    f"/orders/{order['id']}/status",
                    json={"status": next_status},
                )
                assert response.status_code == 200, response.text

            for invalid_status in ("PREPARING", "CANCELLED"):
                response = await client.patch(
                    f"/orders/{order['id']}/status",
                    json={"status": invalid_status},
                )
                assert response.status_code == 422, response.text

            cancelled_order = await client.post(
                "/orders",
                json={
                    "customer_id": customer_id,
                    "payment_method": "CASH",
                    "items": [{"product_id": first_product_id, "quantity": 1}],
                },
            )
            assert cancelled_order.status_code == 201, cancelled_order.text
            cancelled_id = cancelled_order.json()["id"]
            order_ids.append(cancelled_id)
            assert (
                await client.patch(
                    f"/orders/{cancelled_id}/status",
                    json={"status": "CANCELLED"},
                )
            ).status_code == 200
            invalid_after_cancel = await client.patch(
                f"/orders/{cancelled_id}/status",
                json={"status": "READY"},
            )
            assert invalid_after_cancel.status_code == 422

            invalid_requests = [
                ({
                    "customer_id": customer_id,
                    "payment_method": "PIX",
                    "items": [{"product_id": str(uuid4()), "quantity": 1}],
                }, 404),
                ({
                    "customer_id": customer_id,
                    "payment_method": "PIX",
                    "items": [{"product_id": inactive_product_id, "quantity": 1}],
                }, 404),
                ({
                    "customer_id": str(uuid4()),
                    "payment_method": "PIX",
                    "items": [{"product_id": first_product_id, "quantity": 1}],
                }, 404),
                ({
                    "customer_id": inactive_customer_id,
                    "payment_method": "PIX",
                    "items": [{"product_id": first_product_id, "quantity": 1}],
                }, 404),
                ({"customer_id": customer_id, "payment_method": "PIX", "items": []}, 422),
                ({
                    "customer_id": customer_id,
                    "payment_method": "PIX",
                    "items": [{"product_id": first_product_id, "quantity": 0}],
                }, 422),
            ]
            for payload, expected_status in invalid_requests:
                response = await client.post("/orders", json=payload)
                assert response.status_code == expected_status, response.text
    finally:
        with SessionLocal() as db:
            if order_ids:
                db.execute(delete(Order).where(Order.id.in_(order_ids)))
            db.execute(delete(Product).where(Product.id.in_(
                [temporary_ids["first_product"], temporary_ids["second_product"], temporary_ids["inactive_product"]]
            )))
            db.execute(delete(Customer).where(Customer.id.in_(
                [temporary_ids["customer"], temporary_ids["inactive_customer"]]
            )))
            db.commit()
