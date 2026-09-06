"""add public token to orders

Revision ID: 20260906_public_token
Revises: 20260906_reason
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260906_public_token"
down_revision = "20260906_reason"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("orders", sa.Column("public_token", postgresql.UUID(as_uuid=True), nullable=True, server_default=sa.text("gen_random_uuid()")))
    op.execute("UPDATE orders SET public_token = gen_random_uuid() WHERE public_token IS NULL")
    op.alter_column("orders", "public_token", nullable=False)
    op.create_unique_constraint("orders_public_token_key", "orders", ["public_token"])


def downgrade():
    op.drop_constraint("orders_public_token_key", "orders", type_="unique")
    op.drop_column("orders", "public_token")