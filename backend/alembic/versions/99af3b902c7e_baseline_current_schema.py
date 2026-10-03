"""baseline current schema

Creates the schema as it existed before migrations were introduced, so a fresh
database can be built with ``alembic upgrade head``. Databases that already had
these tables (created before Alembic) are left untouched.

Revision ID: 99af3b902c7e
Revises:
Create Date: 2026-09-06 02:00:48.185221

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '99af3b902c7e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Requires PostgreSQL 13+ (gen_random_uuid is built in).
BASELINE_DDL = """
CREATE TYPE order_status AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'FINISHED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('PIX', 'CARD', 'CASH');

CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar(120) NOT NULL,
    email varchar(180) NOT NULL,
    password_hash text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar(80) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT brands_pkey PRIMARY KEY (id),
    CONSTRAINT brands_name_key UNIQUE (name)
);

CREATE TABLE categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar(80) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
);

CREATE TABLE customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar(120) NOT NULL,
    phone varchar(30),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE flavors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    name varchar(120) NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT flavors_pkey PRIMARY KEY (id),
    CONSTRAINT uq_flavor_brand UNIQUE (brand_id, name),
    CONSTRAINT fk_flavors_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT
);
CREATE INDEX idx_flavors_brand_id ON flavors (brand_id);

CREATE TABLE products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    flavor_id uuid,
    name varchar(160) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT chk_products_price CHECK (price >= 0),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_flavor FOREIGN KEY (flavor_id) REFERENCES flavors(id) ON DELETE RESTRICT
);
CREATE INDEX idx_products_active ON products (active);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_flavor_id ON products (flavor_id);

CREATE SEQUENCE orders_order_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number bigint DEFAULT nextval('orders_order_number_seq'::regclass) NOT NULL,
    customer_id uuid NOT NULL,
    status order_status DEFAULT 'RECEIVED'::order_status NOT NULL,
    payment_method payment_method NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_order_number_key UNIQUE (order_number),
    CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_orders_total CHECK (total >= 0),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);
ALTER SEQUENCE orders_order_number_seq OWNED BY orders.order_number;
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name varchar(160) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_total_price CHECK (total_price >= 0),
    CONSTRAINT chk_order_items_unit_price CHECK (unit_price >= 0),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE TABLE order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    status order_status NOT NULL,
    changed_by_user_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
    CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history (order_id);
"""


def upgrade() -> None:
    """Create the original schema unless the database already has it."""
    if sa.inspect(op.get_bind()).has_table("users"):
        return
    for statement in BASELINE_DDL.split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade() -> None:
    """The baseline is the starting point; there is nothing to downgrade to."""
