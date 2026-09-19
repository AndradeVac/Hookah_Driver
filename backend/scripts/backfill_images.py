"""Backfill `image_url` on flavors and products from real image files.

Matches DB rows to files under ``frontend/public/images`` using a normalized
kebab-case slug. Only sets ``image_url`` when a real file exists; rows without a
matching file are reported so the missing images can be produced (never a
generic fallback).

Usage (from backend/):
    python -m scripts.backfill_images            # apply changes
    python -m scripts.backfill_images --dry-run  # report only
"""
from __future__ import annotations

import argparse
import sys
import unicodedata
from pathlib import Path

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.product import Product

# backend/scripts/backfill_images.py -> repo root is two parents up.
REPO_ROOT = Path(__file__).resolve().parents[2]
IMAGES_ROOT = REPO_ROOT / "frontend" / "public" / "images"
ESSENCIAS_DIR = IMAGES_ROOT / "essencias"
PRODUCTS_DIR = IMAGES_ROOT / "products"
MARCAS_DIR = IMAGES_ROOT / "marcas"
CATEGORIAS_DIR = IMAGES_ROOT / "categorias"


def slugify(value: str) -> str:
    """Lowercase, strip accents, collapse to kebab-case (a-z0-9-)."""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    out = []
    for ch in text:
        if ch.isalnum():
            out.append(ch)
        elif ch in " _-/":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def public_path(file: Path) -> str:
    """Return the browser path (/images/...) for a file under IMAGES_ROOT."""
    rel = file.relative_to(IMAGES_ROOT).as_posix()
    return f"/images/{rel}"


def index_dir(directory: Path) -> dict[str, Path]:
    """Map slugified file stem -> file path for every image in a directory tree."""
    index: dict[str, Path] = {}
    if not directory.exists():
        return index
    for file in directory.rglob("*"):
        if file.is_file() and file.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
            index.setdefault(slugify(file.stem), file)
    return index


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="report only, do not write")
    args = parser.parse_args()

    essencias = index_dir(ESSENCIAS_DIR)
    products_idx = index_dir(PRODUCTS_DIR)
    marcas_idx = index_dir(MARCAS_DIR)
    categorias_idx = index_dir(CATEGORIAS_DIR)

    db = SessionLocal()
    matched_flavors = 0
    matched_products = 0
    matched_brands = 0
    matched_categories = 0
    missing_flavors: list[str] = []
    missing_products: list[str] = []
    missing_brands: list[str] = []
    missing_categories: list[str] = []

    try:
        brands = {b.id: b.name for b in db.query(Brand).all()}

        # --- Brands: {brand} in marcas/ ---
        for brand in db.query(Brand).all():
            file = marcas_idx.get(slugify(brand.name))
            if file is not None:
                brand.image_url = public_path(file)
                matched_brands += 1
            else:
                missing_brands.append(f"{brand.name}  (esperado: marcas/{slugify(brand.name)}.png)")

        # --- Flavors: {brand}-{flavor} in essencias ---
        for flavor in db.query(Flavor).all():
            brand_name = brands.get(flavor.brand_id, "")
            key = f"{slugify(brand_name)}-{slugify(flavor.name)}"
            file = essencias.get(key)
            if file is None:
                # fall back to bare flavor slug (some files omit the brand)
                file = essencias.get(slugify(flavor.name))
            if file is not None:
                flavor.image_url = public_path(file)
                matched_flavors += 1
            else:
                missing_flavors.append(f"{brand_name} / {flavor.name}  (esperado: {key}.png)")

        # --- Products: match by normalized name across products/ tree ---
        categories = {c.id: c.name for c in db.query(Category).all()}

        # --- Categories: {category} in categorias/ ---
        for category in db.query(Category).all():
            file = categorias_idx.get(slugify(category.name))
            if file is not None:
                category.image_url = public_path(file)
                matched_categories += 1
            else:
                missing_categories.append(
                    f"{category.name}  (esperado: categorias/{slugify(category.name)}.png)"
                )

        for product in db.query(Product).all():
            file = products_idx.get(slugify(product.name))
            if file is not None:
                product.image_url = public_path(file)
                matched_products += 1
            else:
                cat = categories.get(product.category_id, "")
                missing_products.append(f"{cat} / {product.name}")

        if args.dry_run:
            db.rollback()
        else:
            db.commit()
    finally:
        db.close()

    print("=" * 60)
    print(f"Brands     com imagem: {matched_brands} | sem imagem: {len(missing_brands)}")
    print(f"Categories com imagem: {matched_categories} | sem imagem: {len(missing_categories)}")
    print(f"Flavors    com imagem: {matched_flavors} | sem imagem: {len(missing_flavors)}")
    print(f"Products   com imagem: {matched_products} | sem imagem: {len(missing_products)}")
    if missing_brands:
        print("\n[FALTAM] Marcas sem imagem real:")
        for item in sorted(missing_brands):
            print(f"  - {item}")
    if missing_categories:
        print("\n[FALTAM] Categorias sem imagem real:")
        for item in sorted(missing_categories):
            print(f"  - {item}")
    if missing_flavors:
        print("\n[FALTAM] Sabores sem imagem real:")
        for item in sorted(missing_flavors):
            print(f"  - {item}")
    if missing_products:
        print("\n[FALTAM] Produtos sem imagem real:")
        for item in sorted(missing_products):
            print(f"  - {item}")
    print("=" * 60)
    print("(dry-run, nada gravado)" if args.dry_run else "Alterações gravadas no banco.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
