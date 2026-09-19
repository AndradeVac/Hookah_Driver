from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])

KEEP_BRANDS = ("Ziggy", "Zomo", "Adalya")


@router.post("/cleanup-brands", status_code=status.HTTP_200_OK)
def cleanup_brands(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Delete all brands except the ones in KEEP_BRANDS.

    Uses bound parameters (never string interpolation) to avoid SQL injection.
    """
    try:
        # Get IDs of flavors belonging to brands that will be removed.
        flavor_ids = [
            row[0]
            for row in db.execute(
                text(
                    """
                    SELECT f.id
                    FROM flavors f
                    JOIN brands b ON f.brand_id = b.id
                    WHERE b.name NOT IN :keep
                    """
                ).bindparams(bindparam("keep", expanding=True)),
                {"keep": list(KEEP_BRANDS)},
            ).fetchall()
        ]

        if flavor_ids:
            # Delete order_items referencing products with these flavors.
            db.execute(
                text(
                    """
                    DELETE FROM order_items
                    WHERE product_id IN (
                        SELECT id FROM products WHERE flavor_id IN :ids
                    )
                    """
                ).bindparams(bindparam("ids", expanding=True)),
                {"ids": flavor_ids},
            )

            # Delete products with these flavors.
            db.execute(
                text(
                    "DELETE FROM products WHERE flavor_id IN :ids"
                ).bindparams(bindparam("ids", expanding=True)),
                {"ids": flavor_ids},
            )

            # Delete the flavors themselves.
            db.execute(
                text(
                    "DELETE FROM flavors WHERE id IN :ids"
                ).bindparams(bindparam("ids", expanding=True)),
                {"ids": flavor_ids},
            )

        result = db.execute(
            text(
                "DELETE FROM brands WHERE name NOT IN :keep"
            ).bindparams(bindparam("keep", expanding=True)),
            {"keep": list(KEEP_BRANDS)},
        )

        db.commit()

        return {
            "status": "ok",
            "deleted_brands": result.rowcount,
            "deleted_flavors": len(flavor_ids),
            "remaining": list(KEEP_BRANDS),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
