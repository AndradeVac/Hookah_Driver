"""Add missing rosh products for Adalya and Zomo brands."""
from decimal import Decimal

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.product import Product

db = SessionLocal()

# Get categories and brands
rosh_category = db.query(Category).filter(Category.name == "Rosh").first()
if rosh_category is None:
    print("Rosh category not found")
    db.close()
    exit(1)

adalya_brand = db.query(Brand).filter(Brand.name == "Adalya").first()
zomo_brand = db.query(Brand).filter(Brand.name == "Zomo").first()

if adalya_brand is None:
    print("Adalya brand not found")
if zomo_brand is None:
    print("Zomo brand not found")

# Get flavors for each brand
adalya_flavors = db.query(Flavor).filter(Flavor.brand_id == adalya_brand.id).all() if adalya_brand else []
zomo_flavors = db.query(Flavor).filter(Flavor.brand_id == zomo_brand.id).all() if zomo_brand else []

print(f"\nAdalya flavors ({len(adalya_flavors)}):")
for f in adalya_flavors:
    print(f"  - {f.name}")

print(f"\nZomo flavors ({len(zomo_flavors)}):")
for f in zomo_flavors:
    print(f"  - {f.name}")

# Add rosh products for each flavor
if adalya_brand:
    for flavor in adalya_flavors:
        existing = db.query(Product).filter(
            Product.category_id == rosh_category.id,
            Product.flavor_id == flavor.id,
        ).first()
        if existing is None:
            product = Product(
                category_id=rosh_category.id,
                flavor_id=flavor.id,
                name="Rosh",
                price=Decimal("40.00"),
                active=True,
            )
            db.add(product)
            print(f"✓ Created rosh for Adalya / {flavor.name}")
        else:
            print(f"  Already exists: Adalya / {flavor.name}")

if zomo_brand:
    for flavor in zomo_flavors:
        existing = db.query(Product).filter(
            Product.category_id == rosh_category.id,
            Product.flavor_id == flavor.id,
        ).first()
        if existing is None:
            product = Product(
                category_id=rosh_category.id,
                flavor_id=flavor.id,
                name="Rosh",
                price=Decimal("40.00"),
                active=True,
            )
            db.add(product)
            print(f"✓ Created rosh for Zomo / {flavor.name}")
        else:
            print(f"  Already exists: Zomo / {flavor.name}")

db.commit()
db.close()
print("\nDone!")
