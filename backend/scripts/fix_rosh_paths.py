"""Fix rosh image paths from absolute to relative."""
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.product import Product

db = SessionLocal()

rosh_category = db.query(Category).filter(Category.name == "Rosh").first()
if rosh_category is None:
    print("Rosh category not found")
    db.close()
    exit(1)

# Find all rosh products with absolute paths
rosh_products = db.query(Product).filter(
    Product.category_id == rosh_category.id,
    Product.image_url.isnot(None),
).all()

print(f"Found {len(rosh_products)} rosh products")

updated = 0
for rosh in rosh_products:
    if rosh.image_url and rosh.image_url.startswith("C:"):
        # Convert C:\images\... to /images/products/...
        path = rosh.image_url.replace("\\", "/").replace("C:/images", "/images/products")
        if path != rosh.image_url:
            old_path = rosh.image_url
            rosh.image_url = path
            updated += 1
            print(f"✓ Fixed: {old_path[:50]}... → {path}")

db.commit()
db.close()
print(f"\nDone! Updated {updated} paths.")
