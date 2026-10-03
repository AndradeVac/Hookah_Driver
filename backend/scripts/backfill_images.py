"""Point every `image_url` in the database to the standardized files in
``frontend/public/images`` (see frontend/design/IMAGENS.md).

Matching uses the same slug as the frontend (lowercase, no accents, a-z0-9-):
    brands      -> marcas/<brand>.webp
    categories  -> categorias/<category>.webp
    flavors     -> essencias/<brand>/<brand>-<flavor>.webp
    products    -> image of their flavor, else products/<category>/<product>.webp
Rows without a matching file get ``image_url = NULL`` (the UI shows a neutral
placeholder), so the database never points to files that do not exist.

Usage (from backend/):
    python -m scripts.backfill_images --dry-run  # report only
    python -m scripts.backfill_images            # apply
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

IMAGES_ROOT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "images"
IMAGE_EXTS = (".webp", ".svg", ".png", ".jpg", ".jpeg")


def slugify(value: str) -> str:
    """Lowercase, strip accents, collapse everything else to single dashes."""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    slug = "".join(ch if ch.isascii() and ch.isalnum() else "-" for ch in text)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def find_image(relative_stem: str) -> str | None:
    """Return the public path (/images/...) of the first existing file, preferring WebP."""
    for ext in IMAGE_EXTS:
        file = IMAGES_ROOT / f"{relative_stem}{ext}"
        if file.is_file():
            return f"/images/{relative_stem}{ext}"
    return None


class Backfill:
    def __init__(self) -> None:
        self.changed = 0
        self.missing: list[str] = []

    def assign(self, row, url: str | None, label: str, expected: str, visible: bool = True) -> None:
        if url is None and row.active and visible:
            self.missing.append(f"{label}  (esperado: {expected}.webp)")
        if row.image_url != url:
            row.image_url = url
            self.changed += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="report only, do not write")
    args = parser.parse_args()

    if not IMAGES_ROOT.is_dir():
        print(f"Pasta de imagens não encontrada: {IMAGES_ROOT}")
        return 1

    report = Backfill()
    with SessionLocal() as db:
        brands = {brand.id: brand for brand in db.query(Brand).all()}
        categories = {category.id: category for category in db.query(Category).all()}
        flavor_images: dict = {}

        for brand in brands.values():
            stem = f"marcas/{slugify(brand.name)}"
            report.assign(brand, find_image(stem), f"Marca {brand.name}", stem)

        for category in categories.values():
            stem = f"categorias/{slugify(category.name)}"
            report.assign(category, find_image(stem), f"Categoria {category.name}", stem)

        for flavor in db.query(Flavor).all():
            brand = brands[flavor.brand_id]
            brand_slug = slugify(brand.name)
            stem = f"essencias/{brand_slug}/{brand_slug}-{slugify(flavor.name)}"
            url = find_image(stem)
            flavor_images[flavor.id] = url
            report.assign(flavor, url, f"Sabor {brand.name} {flavor.name}", stem, visible=brand.active)

        for product in db.query(Product).all():
            category = categories[product.category_id]
            stem = f"products/{slugify(category.name)}/{slugify(product.name)}"
            url = flavor_images.get(product.flavor_id) if product.flavor_id else None
            report.assign(product, url or find_image(stem), f"Produto {category.name} / {product.name}", stem)

        if args.dry_run:
            db.rollback()
        else:
            db.commit()

    print(f"{report.changed} registro(s) {'seriam alterados' if args.dry_run else 'alterados'}.")
    if report.missing:
        print("\nItens ativos sem imagem (o app mostra o placeholder):")
        for item in sorted(set(report.missing)):
            print(f"  - {item}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
