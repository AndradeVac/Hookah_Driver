import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.routes.analytics import router as analytics_router
from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.brands import router as brands_router
from app.api.routes.categories import router as categories_router
from app.api.routes.customers import router as customers_router
from app.api.routes.flavors import router as flavors_router
from app.api.routes.orders import router as orders_router
from app.api.routes.payments import router as payments_router
from app.api.routes.products import router as products_router
from app.api.routes.public_orders import router as public_orders_router
from app.api.routes.users import router as users_router
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hookah Driver API",
    version="1.0.0",
    # Interactive docs are only exposed outside production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

register_exception_handlers(app)

for router in (
    auth_router,
    analytics_router,
    audit_router,
    brands_router,
    categories_router,
    customers_router,
    flavors_router,
    orders_router,
    payments_router,
    public_orders_router,
    products_router,
    users_router,
):
    app.include_router(router)


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def root():
    return {"status": "ok", "service": "hookah-driver-api"}


@app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check failed: database unreachable")
        return JSONResponse(status_code=503, content={"status": "error", "database": "unreachable"})
    return {"status": "ok", "database": "ok"}
