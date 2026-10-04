import asyncio
import base64
from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.core.security import get_current_user
from app.main import app
from app.models.brand import Brand
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.product import Product
from app.models.user import UserRole
from app.schemas.product import ProductCreate, ProductUpdate


def photo(color="red", size=(20, 20), format="WEBP"):
    output = BytesIO()
    Image.new("RGB", size, color=color).save(output, format=format)
    return base64.b64encode(output.getvalue()).decode("ascii")


def request(path, method="GET", **kwargs):
    async def run():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver",
        ) as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(run())


def test_image_accepts_webp_and_sanitizes_metadata():
    data = ProductCreate(category_id=uuid4(), name="Foto", price="10.00", image_base64=photo())
    content = base64.b64decode(data.image_base64)
    with Image.open(BytesIO(content)) as image:
        assert image.format == "WEBP"
        assert image.size == (20, 20)
        assert not image.getexif()
    assert len(content) <= 256 * 1024


@pytest.mark.parametrize("value", [
    "", "not base64", base64.b64encode(b"not an image").decode(),
    photo(format="PNG"), photo(size=(1201, 1)),
    base64.b64encode(b"x" * (256 * 1024 + 1)).decode(),
], ids=["empty", "invalid-base64", "not-image", "wrong-format", "too-wide", "too-large"])
def test_invalid_image_is_rejected(value):
    with pytest.raises(ValidationError):
        ProductUpdate(image_base64=value)


def test_animated_image_is_rejected():
    output = BytesIO()
    Image.new("RGB", (10, 10), "red").save(
        output, format="WEBP", save_all=True,
        append_images=[Image.new("RGB", (10, 10), "blue")], duration=100,
    )
    with pytest.raises(ValidationError, match="estática"):
        ProductUpdate(image_base64=base64.b64encode(output.getvalue()).decode())


def test_catalog_queries_do_not_load_binary_photos():
    assert "image_data" not in str(select(Product))


def test_photo_writes_require_admin():
    payload = {"category_id": str(uuid4()), "name": "Foto", "price": "10.00", "image_base64": photo()}
    assert request("/products", "POST", json=payload).status_code == 401
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=UserRole.OPERATOR)
    app.dependency_overrides[get_db] = lambda: None
    try:
        assert request("/products", "POST", json=payload).status_code == 403
        assert request(f"/products/{uuid4()}", "PATCH", json={"image_base64": photo()}).status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.integration
def test_product_photo_create_replace_preserve_remove_and_public_read():
    schema = f"test_photos_{uuid4().hex}"
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            for model in (Brand, Category, Flavor, Product):
                model.__table__.create(connection)
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                category = Category(name="Photo test")
                db.add(category)
                db.commit()
                app.dependency_overrides[get_db] = lambda: db
                app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=UserRole.ADMIN)
                try:
                    created = request("/products", "POST", json={
                        "category_id": str(category.id), "name": "Foto", "price": "10.00",
                        "image_base64": photo(),
                    })
                    assert created.status_code == 201, created.text
                    product = created.json()
                    path = f"/products/{product['id']}"
                    assert "image_data" not in product and "image_base64" not in product
                    assert product["image_url"].startswith("http://")
                    original_url = product["image_url"]
                    original = request(f"{path}/image")
                    assert original.status_code == 200
                    assert original.headers["content-type"] == "image/webp"
                    assert original.headers["x-content-type-options"] == "nosniff"
                    with Image.open(BytesIO(original.content)) as image:
                        assert image.size == (20, 20)
                    assert request("/products").json()[0]["image_url"] == original_url

                    invalid = request(path, "PATCH", json={"name": "Should not save", "image_base64": "bad"})
                    assert invalid.status_code == 422
                    assert request(path).json()["name"] == "Foto"

                    edited = request(path, "PATCH", json={"price": "12.00"})
                    assert edited.status_code == 200
                    assert edited.json()["image_url"] == original_url
                    assert request(f"{path}/image").content == original.content
                    described = request(path, "PATCH", json={"description": "Temporary"})
                    assert described.status_code == 200
                    assert request(path, "PATCH", json={"description": None}).json()["description"] is None

                    replaced = request(path, "PATCH", json={"image_base64": photo("blue")})
                    assert replaced.status_code == 200
                    assert replaced.json()["image_url"] != original_url
                    assert request(f"{path}/image").content != original.content
                    db.expire_all()
                    stored = db.get(Product, product["id"])
                    assert stored is not None and stored.image_data is not None

                    removed = request(path, "PATCH", json={"image_base64": None})
                    assert removed.status_code == 200
                    assert removed.json()["image_url"] is None
                    assert request(f"{path}/image").status_code == 404
                    db.expire_all()
                    assert stored.image_data is None

                    existing = request("/products", "POST", json={
                        "category_id": str(category.id), "name": "Existing path", "price": "10.00",
                        "image_url": "/images/existing.webp",
                    })
                    assert existing.status_code == 201
                    assert existing.json()["image_url"] == "/images/existing.webp"
                finally:
                    app.dependency_overrides.pop(get_db, None)
                    app.dependency_overrides.pop(get_current_user, None)
        finally:
            transaction.rollback()


@pytest.mark.integration
def test_photo_migration_preserves_existing_urls_and_enforces_size():
    path = Path(__file__).parents[1] / "alembic" / "versions" / "d4e5f6a7b8c9_add_product_image_data.py"
    spec = spec_from_file_location("photo_migration", path)
    assert spec is not None and spec.loader is not None
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)
    schema = f"test_photo_migration_{uuid4().hex}"
    with engine.connect() as db:
        transaction = db.begin()
        try:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
            db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            db.execute(text("CREATE TABLE products (image_url text)"))
            db.execute(text("INSERT INTO products VALUES ('/images/existing.webp')"))
            with Operations.context(MigrationContext.configure(db)):
                migration.upgrade()
            assert db.execute(text("SELECT image_url, image_data FROM products")).one() == ("/images/existing.webp", None)
            from sqlalchemy.exc import IntegrityError
            with pytest.raises(IntegrityError):
                with db.begin_nested():
                    db.execute(text("UPDATE products SET image_data = :content"), {"content": b"x" * (256 * 1024 + 1)})
            with Operations.context(MigrationContext.configure(db)):
                migration.downgrade()
            assert db.execute(text("SELECT image_url FROM products")).scalar_one() == "/images/existing.webp"
        finally:
            transaction.rollback()
