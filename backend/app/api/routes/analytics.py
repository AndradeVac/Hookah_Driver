from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.analytics import DashboardAnalyticsResponse
from app.services.analytics import AnalyticsService


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    period: str = Query(default="month", pattern="^(month|quarter|all)$"),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
):
    return AnalyticsService(db).dashboard(period, start, end)


@router.get("/dashboard/export")
def export_dashboard(
    period: str = Query(default="month", pattern="^(month|quarter|all)$"),
    file_format: str = Query(default="xlsx", alias="format", pattern="^(xlsx|pdf)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR)),
):
    service = AnalyticsService(db)
    if file_format == "pdf":
        return Response(
            content=service.export_pdf(period),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=hookah-dashboard-{period}.pdf"},
        )

    return Response(
        content=service.export_xlsx(period),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=hookah-dashboard-{period}.xlsx"},
    )
