from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.brand import Brand
from app.models.flavor import Flavor
from app.models.user import User, UserRole

router = APIRouter(
    prefix="/admin/seed",
    tags=["Admin"],
)


@router.post("/ziggy-flavors", status_code=status.HTTP_201_CREATED)
def seed_ziggy_flavors(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Seed all 27 Ziggy flavors if they don't exist"""

    ziggy = db.query(Brand).filter(Brand.name == "Ziggy").first()
    if not ziggy:
        return {"error": "Ziggy brand not found"}

    flavors_data = [
        "Banana",
        "Berry",
        "Berry 2",
        "Burleymint",
        "Cherry",
        "Coffecream Instagram",
        "Coffeecream",
        "Cornmagic",
        "Fresh66",
        "Freshlemon",
        "Freshmelon",
        "Frutasamarelas",
        "Grape",
        "Manga",
        "Melão",
        "Menta",
        "Mix Duasgoiabas",
        "Mix Duasmacas",
        "Mix Frutasroxas",
        "Mix Frutasverdes",
        "Mix Morangoelaranja",
        "Mix Morangoelaranja 02",
        "Morango",
        "Pistache",
        "Sorvetedelimao",
        "Watermelon",
        "Yogurt",
    ]

    created_count = 0
    skipped_count = 0

    for name in flavors_data:
        existing = db.query(Flavor).filter(
            Flavor.brand_id == ziggy.id,
            Flavor.name == name,
        ).first()

        if existing:
            # Reactivate if inactive
            if not existing.active:
                existing.active = True
                db.flush()
            skipped_count += 1
        else:
            flavor = Flavor(
                brand_id=ziggy.id,
                name=name,
                active=True,
            )
            db.add(flavor)
            created_count += 1

    db.commit()

    return {
        "created": created_count,
        "skipped": skipped_count,
        "total": len(flavors_data),
    }
