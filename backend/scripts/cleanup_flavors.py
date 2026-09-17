#!/usr/bin/env python
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['ENVIRONMENT'] = os.getenv('ENVIRONMENT', 'development')

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.flavor import Flavor
from app.models.product import Product

db = SessionLocal()

try:
    # Brands to keep
    KEEP_BRANDS = {'Ziggy', 'Zomo', 'Adalya'}

    # Get all brands
    all_brands = db.query(Brand).all()
    keep_brand_ids = set()
    remove_brand_ids = set()

    print("Brands in database:")
    for brand in all_brands:
        print(f"  - {brand.name} (id: {brand.id})")
        if brand.name in KEEP_BRANDS:
            keep_brand_ids.add(brand.id)
        else:
            remove_brand_ids.add(brand.id)

    print(f"\nBrands to keep: {KEEP_BRANDS}")
    print(f"Brands to remove: {[b.name for b in all_brands if b.id in remove_brand_ids]}")

    # Get flavors to remove (all flavors from brands not in KEEP_BRANDS)
    all_flavors = db.query(Flavor).all()
    flavors_to_remove = [f for f in all_flavors if f.brand_id not in keep_brand_ids]

    print(f"\nTotal flavors to remove: {len(flavors_to_remove)}")

    # Count products linked to these flavors
    products_with_flavors = db.query(Product).filter(
        Product.flavor_id.in_([f.id for f in flavors_to_remove])
    ).all()

    print(f"Products linked to these flavors: {len(products_with_flavors)}")

    if products_with_flavors:
        print("\nDisassociating products from flavors...")
        for product in products_with_flavors:
            flavor_name = product.flavor.name if product.flavor else "Unknown"
            print(f"  - {product.name} (flavor: {flavor_name})")
            product.flavor_id = None
        db.flush()

    # Delete flavors
    print(f"\nDeleting {len(flavors_to_remove)} flavors...")
    for flavor in flavors_to_remove:
        print(f"  - {flavor.name} (brand: {flavor.brand.name})")
        db.delete(flavor)
    db.flush()

    # Delete brands
    print(f"\nDeleting brands...")
    brands_to_remove = db.query(Brand).filter(Brand.id.in_(remove_brand_ids)).all()
    for brand in brands_to_remove:
        print(f"  - {brand.name}")
        db.delete(brand)

    db.commit()
    print("\n[OK] Successfully removed all flavors and brands from non-Ziggy/Zomo/Adalya")

except Exception as e:
    db.rollback()
    print(f"[ERROR] Error: {e}")
    raise
finally:
    db.close()
