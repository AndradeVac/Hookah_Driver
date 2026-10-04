from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.database import engine


@pytest.mark.integration
@pytest.mark.parametrize(
    ("existing_number", "counter", "is_called", "expected"),
    [(152, 56, True, 153), (152, 500, True, 501), (152, 153, False, 153), (None, 1, False, 1)],
)
def test_order_number_migration_repairs_imported_counter_without_rewinding(
    existing_number, counter, is_called, expected,
):
    path = Path(__file__).parents[1] / "alembic" / "versions" / "c3d4e5f6a7b8_sync_order_number_sequence.py"
    spec = spec_from_file_location("order_number_migration", path)
    assert spec is not None and spec.loader is not None
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)

    # The entire test, including its schema and sequence, is rolled back.
    schema = f"test_order_counter_{uuid4().hex}"
    with engine.connect() as db:
        transaction = db.begin()
        try:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
            db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            db.execute(text("CREATE SEQUENCE orders_order_number_seq"))
            db.execute(text("""
                CREATE TABLE orders (
                    order_number bigint DEFAULT nextval('orders_order_number_seq') UNIQUE
                )
            """))
            if existing_number is not None:
                db.execute(text("INSERT INTO orders (order_number) VALUES (:number)"), {"number": existing_number})
            if counter < (existing_number or 0):
                db.execute(text("INSERT INTO orders (order_number) VALUES (:number)"), {"number": counter + 1})
            db.execute(text("SELECT setval('orders_order_number_seq', :counter, :called)"),
                       {"counter": counter, "called": is_called})
            count_before = db.execute(text("SELECT count(*) FROM orders")).scalar_one()

            if counter < (existing_number or 0):
                with pytest.raises(IntegrityError):
                    with db.begin_nested():
                        db.execute(text("INSERT INTO orders DEFAULT VALUES"))

            with Operations.context(MigrationContext.configure(db)):
                migration.upgrade()

            assert db.execute(text("SELECT count(*) FROM orders")).scalar_one() == count_before
            number = db.execute(text("INSERT INTO orders DEFAULT VALUES RETURNING order_number")).scalar_one()
            assert number == expected
        finally:
            transaction.rollback()
