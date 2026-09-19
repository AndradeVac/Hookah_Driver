"""Activate all inactive rosh products."""
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.product import Product

db = SessionLocal()

rosh_category = db.query(Category).filter(Category.name == "Rosh").first()
if rosh_category is None:
    print("Rosh category not found")
    db.close()
    exit(1)

# Find all inactive rosh products
inactive_rosh = db.query(Product).filter(
    Product.category_id == rosh_category.id,
    Product.active == False,
).all()

print(f"Found {len(inactive_rosh)} inactive rosh products")

for product in inactive_rosh:
    product.active = True
    print(f"✓ Activated: {product.id}")

db.commit()
db.close()
print("Done!")
