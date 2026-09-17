"""add_cascade_deletes_for_brands

Revision ID: 0ab19d015642
Revises: 5d93f147461d
Create Date: 2026-09-17 17:47:47.976683

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ab19d015642'
down_revision: Union[str, Sequence[str], None] = '5d93f147461d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - modify foreign key constraints to cascade on delete."""
    # Drop existing foreign key from flavors to brands
    op.drop_constraint('fk_flavors_brand', 'flavors', type_='foreignkey')

    # Recreate with ON DELETE CASCADE
    op.create_foreign_key(
        'fk_flavors_brand',
        'flavors',
        'brands',
        ['brand_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the cascade foreign key
    op.drop_constraint('fk_flavors_brand', 'flavors', type_='foreignkey')

    # Recreate without cascade
    op.create_foreign_key(
        'fk_flavors_brand',
        'flavors',
        'brands',
        ['brand_id'],
        ['id'],
        ondelete='RESTRICT'
    )
