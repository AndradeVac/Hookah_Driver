"""add reason to order status history

Revision ID: 20260906_reason
Revises: 01502d478bc6
"""

from alembic import op
import sqlalchemy as sa

revision = "20260906_reason"
down_revision = "01502d478bc6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("order_status_history", sa.Column("reason", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("order_status_history", "reason")