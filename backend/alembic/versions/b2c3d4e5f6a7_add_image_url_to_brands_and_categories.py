"""add image_url to brands and categories

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-19 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable image_url columns to brands and categories."""
    op.add_column('brands', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('categories', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove image_url columns."""
    op.drop_column('categories', 'image_url')
    op.drop_column('brands', 'image_url')
