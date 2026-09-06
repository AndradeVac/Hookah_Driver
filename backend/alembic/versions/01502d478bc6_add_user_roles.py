"""add user roles

Revision ID: 01502d478bc6
Revises: ffa9ff435e95
Create Date: 2026-09-06 02:41:15.231206

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '01502d478bc6'
down_revision: Union[str, Sequence[str], None] = 'ffa9ff435e95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    user_role = sa.Enum("ADMIN", "OPERATOR", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column(
            "role",
            user_role,
            server_default=sa.text("'OPERATOR'::user_role"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "role")
    sa.Enum("ADMIN", "OPERATOR", name="user_role").drop(
        op.get_bind(),
        checkfirst=True,
    )
