"""Synchronize order numbers after importing existing orders.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
"""

import sqlalchemy as sa
from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Block inserts while inspecting the counter; RESTART is transactional, unlike setval.
    op.execute("LOCK TABLE orders IN ACCESS EXCLUSIVE MODE")
    next_number = op.get_bind().execute(sa.text("""
        SELECT GREATEST(
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders),
            last_value + CASE WHEN is_called THEN 1 ELSE 0 END
        )
        FROM orders_order_number_seq
    """)).scalar_one()
    op.execute(f"ALTER SEQUENCE orders_order_number_seq RESTART WITH {int(next_number)}")


def downgrade() -> None:
    # Rewinding the counter would reintroduce duplicate order numbers.
    pass
