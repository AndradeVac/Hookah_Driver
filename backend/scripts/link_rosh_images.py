"""Link rosh images from their associated flavors."""
from app.core.database import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.flavor import Flavor

db = SessionLocal()

rosh_category = db.query(Category).filter(Category.name == "Rosh").first()
if rosh_category is None:
    print("Rosh category not found")
    db.close()
    exit(1)

# Find all rosh products without image_url
rosh_without_image = db.query(Product).filter(
    Product.category_id == rosh_category.id,
    (Product.image_url == None) | (Product.image_url == ""),
).all()

print(f"Found {len(rosh_without_image)} rosh products without image_url")

updated = 0
for rosh in rosh_without_image:
    if rosh.flavor_id:
        flavor = db.query(Flavor).filter(Flavor.id == rosh.flavor_id).first()
        if flavor and flavor.image_url:
            rosh.image_url = flavor.image_url
            updated += 1
            print(f"âœ“ Updated Rosh {str(rosh.id)[:8]}: {flavor.name} -> {flavor.image_url}")
        else:
            print(f"âœ— Flavor {rosh.str(rosh.flavor_id)[:8]} has no image_url")
    else:
        print(f"âœ— Rosh {str(rosh.id)[:8]} has no flavor_id")

db.commit()
db.close()
print(f"\nDone! Updated {updated} rosh products with flavor images.")


