"""Store optimized product photos persistently in PostgreSQL."""

import sqlalchemy as sa
from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("image_data", sa.LargeBinary(), nullable=True))
    op.create_check_constraint(
        "chk_products_image_size", "products",
        "image_data IS NULL OR octet_length(image_data) <= 262144",
    )


def downgrade() -> None:
    op.drop_constraint("chk_products_image_size", "products", type_="check")
    op.drop_column("products", "image_data")
