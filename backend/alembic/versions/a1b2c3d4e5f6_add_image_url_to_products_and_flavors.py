"""add image_url to products and flavors

Revision ID: a1b2c3d4e5f6
Revises: 0ab19d015642
Create Date: 2026-09-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0ab19d015642'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable image_url columns to products and flavors."""
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('flavors', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove image_url columns."""
    op.drop_column('flavors', 'image_url')
    op.drop_column('products', 'image_url')
