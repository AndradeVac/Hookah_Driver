from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import engine
from app.core.exceptions import NotFoundError
from app.models.brand import Brand
from app.models.category import Category
from app.models.customer import Customer
from app.models.flavor import Flavor
from app.models.product import Product
from app.repositories.product import ProductRepository
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order import OrderService


@pytest.mark.integration
def test_disabled_catalog_entities_cannot_be_ordered_and_can_be_reactivated():
    schema = f"test_catalog_availability_{uuid4().hex}"
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            for model in (Brand, Category, Customer, Flavor, Product):
                model.__table__.create(connection)
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                brand = Brand(name="Availability test", active=True)
                category = Category(name="Rosh", active=True)
                customer = Customer(name="Test", active=True)
                flavor = Flavor(name="Mint", brand=brand, active=True)
                product = Product(name="Rosh", category=category, flavor=flavor, price=Decimal("40.00"), active=True)
                db.add_all([product, customer])
                db.commit()
                repository = ProductRepository(db)
                assert repository.get_by_id(product.id) is product
                for entity in (product, category, flavor, brand):
                    entity.active = False
                    db.commit()
                    assert repository.get_by_id(product.id) is None
                    assert repository.get_by_id_any_status(product.id) is product
                    assert product in repository.get_all()
                    with pytest.raises(NotFoundError, match="Produto não encontrado"):
                        OrderService(db).create(OrderCreate(
                            customer_id=customer.id, payment_method="CASH",
                            items=[OrderItemCreate(product_id=product.id, quantity=1)],
                        ))
                    entity.active = True
                    db.commit()
                    assert repository.get_by_id(product.id) is product
                product.price = Decimal("45.00")
                product.image_url = "/images/new.webp"
                db.commit()
                latest = db.scalar(select(Product).where(Product.id == product.id))
                assert latest.price == Decimal("45.00")
                assert latest.image_url == "/images/new.webp"
        finally:
            transaction.rollback()
