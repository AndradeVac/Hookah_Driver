from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/cleanup-brands", status_code=status.HTTP_200_OK)
def cleanup_brands(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Delete all brands except Ziggy, Zomo, Adalya"""
    try:
        # Get IDs of flavors to delete
        flavor_ids_to_delete = db.execute(text("""
            SELECT f.id FROM flavors f
            JOIN brands b ON f.brand_id = b.id
            WHERE b.name NOT IN ('Ziggy', 'Zomo', 'Adalya')
        """)).fetchall()

        flavor_ids = [row[0] for row in flavor_ids_to_delete]

        if flavor_ids:
            # Convert to string format for IN clause
            flavor_ids_str = ','.join([f"'{fid}'" for fid in flavor_ids])

            # Delete order_items that reference products with these flavors
            db.execute(text(f"""
                DELETE FROM order_items
                WHERE product_id IN (
                    SELECT id FROM products
                    WHERE flavor_id IN ({flavor_ids_str})
                )
            """))

            # Delete products with these flavors
            db.execute(text(f"""
                DELETE FROM products
                WHERE flavor_id IN ({flavor_ids_str})
            """))

            # Delete flavors
            db.execute(text(f"""
                DELETE FROM flavors
                WHERE id IN ({flavor_ids_str})
            """))

        result = db.execute(text("""
            DELETE FROM brands
            WHERE name NOT IN ('Ziggy', 'Zomo', 'Adalya')
        """))

        db.commit()

        return {
            "status": "ok",
            "deleted_brands": result.rowcount,
            "remaining": ["Ziggy", "Zomo", "Adalya"]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
