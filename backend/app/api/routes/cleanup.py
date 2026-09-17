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
        # Delete in cascade order
        db.execute(text("""
            DELETE FROM order_items
            WHERE product_id IN (
                SELECT p.id FROM products p
                JOIN flavors f ON p.flavor_id = f.id
                JOIN brands b ON f.brand_id = b.id
                WHERE b.name NOT IN ('Ziggy', 'Zomo', 'Adalya')
            )
        """))

        db.execute(text("""
            DELETE FROM products
            WHERE flavor_id IN (
                SELECT f.id FROM flavors f
                JOIN brands b ON f.brand_id = b.id
                WHERE b.name NOT IN ('Ziggy', 'Zomo', 'Adalya')
            )
        """))

        db.execute(text("""
            DELETE FROM flavors
            WHERE brand_id IN (
                SELECT id FROM brands
                WHERE name NOT IN ('Ziggy', 'Zomo', 'Adalya')
            )
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
