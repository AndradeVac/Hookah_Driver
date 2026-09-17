import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['ENVIRONMENT'] = 'development'

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.flavor import Flavor

db = SessionLocal()

brands = db.query(Brand).all()
print(f"Total brands: {len(brands)}\n")

for brand in brands:
    flavors = db.query(Flavor).filter(Flavor.brand_id == brand.id).all()
    print(f"{brand.name}: {len(flavors)} flavors")
    for f in flavors[:3]:
        print(f"  - {f.name}")
    if len(flavors) > 3:
        print(f"  ... and {len(flavors) - 3} more")

db.close()
