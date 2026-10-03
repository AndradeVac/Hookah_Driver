"""Make sure every active flavor can be ordered, and optionally load the base menu.

Default: every active flavor (of an active brand) gets an active "Rosh" product —
created if missing, reactivated if it exists but is inactive. That is what the
customer menu sells when someone picks a flavor.

--with-menu also creates the base categories, brands, flavors and products below.
Use it to bootstrap an empty database; on a database already in use the menu is
managed in the admin panel.

Idempotent: rows are matched by name; nothing is ever removed or deactivated.

Usage (from backend/):
    python -m scripts.seed_catalog --dry-run      # show what would change
    python -m scripts.seed_catalog                # Rosh for every active flavor
    python -m scripts.seed_catalog --with-menu    # + base menu (new databases)
"""
from __future__ import annotations

import argparse
import sys
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.product import Product

ROSH_CATEGORY = "Rosh"
ROSH_PRICE = Decimal("40.00")

FLAVORS: dict[str, list[str]] = {
    "Adalya": ["Love 66"],
    "Ziggy": [
        "Banana", "Berry", "Berry 2", "Burleymint", "Cherry", "Coffecream Instagram",
        "Coffeecream", "Cornmagic", "Fresh66", "Freshlemon", "Freshmelon", "Frutasamarelas",
        "Grape", "Manga", "Melão", "Menta", "Mix Duasgoiabas", "Mix Duasmacas",
        "Mix Frutasroxas", "Mix Frutasverdes", "Mix Morangoelaranja", "Mix Morangoelaranja 02",
        "Morango", "Pistache", "Sorvetedelimao", "Watermelon", "Yogurt",
    ],
    "Zomo": ["Banana", "Laranja", "Uva"],
}

# category -> [(name, price, description)]
PRODUCTS: dict[str, list[tuple[str, str, str | None]]] = {
    "Acessórios": [
        ("Abafador", "35.00", None),
        ("Alumínio", "1.50", None),
        ("Borracha Mangueira", "2.00", None),
        ("Borracha Rosh", "2.00", None),
        ("Borracha Vaso", "2.00", None),
        ("Carvão", "1.50", None),
        ("Essência", "20.00", None),
        ("Kit mangueira", "10.00", None),
        ("Pegador", "15.00", None),
        ("Piteira higiênica", "0.00", "Free"),
        ("Piteira higiênica Ziggy", "30.00", None),
        ("Prato", "15.00", None),
        ("Rosh (peça)", "15.00", "Peça de reposição"),
        ("Vaso", "25.00", None),
    ],
    "Adicionais": [
        ("Acender carvão", "10.00", None),
        ("Carvão", "1.50", None),
        ("Piteira Hydra (gelo)", "10.00", None),
    ],
    "Bebidas": [
        ("Água", "5.00", None),
        ("Coca", "7.00", None),
        ("Intake", "12.00", None),
        ("Monster", "15.00", None),
    ],
    "Combos": [
        ("Combo 1", "50.00", "Rosh + coca"),
        ("Combo 2", "120.00", "3 rosh"),
        ("Combo 3", "20.00", "3 cocas"),
        ("Combo 4", "12.00", "3 águas"),
    ],
    "Kits": [
        ("Kit o básico", "40.00", "1 essência + 6 carvão + 3 alumínio"),
        ("Kit o completo", "100.00", "3 essência + 18 carvão + 9 alumínio"),
    ],
}


class Seeder:
    def __init__(self, db: Session):
        self.db = db
        self.created: list[str] = []

    def category(self, name: str) -> Category:
        category = self.db.scalar(select(Category).where(Category.name == name))
        if category is None:
            category = Category(name=name, active=True)
            self.db.add(category)
            self.db.flush()
            self.created.append(f"categoria {name}")
        return category

    def brand(self, name: str) -> Brand:
        brand = self.db.scalar(select(Brand).where(Brand.name == name))
        if brand is None:
            brand = Brand(name=name, active=True)
            self.db.add(brand)
            self.db.flush()
            self.created.append(f"marca {name}")
        return brand

    def flavor(self, brand: Brand, name: str) -> Flavor:
        flavor = self.db.scalar(select(Flavor).where(Flavor.brand_id == brand.id, Flavor.name == name))
        if flavor is None:
            flavor = Flavor(brand_id=brand.id, name=name, active=True)
            self.db.add(flavor)
            self.db.flush()
            self.created.append(f"sabor {brand.name} {name}")
        return flavor

    def product(
        self,
        category: Category,
        name: str,
        price: Decimal,
        description: str | None = None,
        flavor: Flavor | None = None,
    ) -> None:
        statement = select(Product).where(Product.category_id == category.id, Product.name == name)
        statement = statement.where(
            Product.flavor_id == flavor.id if flavor is not None else Product.flavor_id.is_(None)
        )
        label = f"{name} · {flavor.name}" if flavor is not None else name
        existing = self.db.scalars(statement.order_by(Product.active.desc())).first()
        if existing is not None:
            # A flavored product (Rosh) must be active for its active flavor to be orderable.
            if flavor is not None and not existing.active:
                existing.active = True
                self.created.append(f"reativado {category.name} / {label}")
            return
        self.db.add(Product(
            category_id=category.id,
            flavor_id=flavor.id if flavor is not None else None,
            name=name,
            price=price,
            description=description,
            active=True,
        ))
        self.created.append(f"produto {category.name} / {label}")

    def run(self, with_menu: bool = False) -> None:
        if with_menu:
            for category_name, products in PRODUCTS.items():
                category = self.category(category_name)
                for name, price, description in products:
                    self.product(category, name, Decimal(price), description)

            for brand_name, flavor_names in FLAVORS.items():
                brand = self.brand(brand_name)
                for flavor_name in flavor_names:
                    self.flavor(brand, flavor_name)

        # Every active flavor in the database (including ones added in the admin) needs its Rosh.
        rosh = self.category(ROSH_CATEGORY)
        active_flavors = self.db.scalars(
            select(Flavor).join(Brand).where(Flavor.active.is_(True), Brand.active.is_(True))
        ).all()
        for flavor in active_flavors:
            self.product(rosh, "Rosh", ROSH_PRICE, f"{flavor.brand.name} · {flavor.name}", flavor)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="show changes without saving")
    parser.add_argument("--with-menu", action="store_true", help="also create the base menu (new databases)")
    args = parser.parse_args()

    with SessionLocal() as db:
        seeder = Seeder(db)
        seeder.run(with_menu=args.with_menu)
        if args.dry_run:
            db.rollback()
        else:
            db.commit()

    for item in seeder.created:
        print(f"  + {item}")
    print(f"{len(seeder.created)} alteração(ões) {'seriam feitas' if args.dry_run else 'feitas'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
