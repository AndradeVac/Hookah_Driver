from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.brands import router as brands_router
from app.api.routes.categories import router as categories_router
from app.api.routes.customers import router as customers_router
from app.api.routes.flavors import router as flavors_router
from app.api.routes.auth import router as auth_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.audit import router as audit_router
from app.api.routes.orders import router as orders_router
from app.api.routes.payments import router as payments_router
from app.api.routes.public_orders import router as public_orders_router
from app.api.routes.products import router as products_router
from app.api.routes.users import router as users_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers


app = FastAPI(
    title="Hookah Driver API",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in (settings.frontend_url or "").split(",")
    if origin.strip()
]
if not allowed_origins:
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(audit_router)
app.include_router(brands_router)
app.include_router(categories_router)
app.include_router(customers_router)
app.include_router(flavors_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(public_orders_router)
app.include_router(products_router)
app.include_router(users_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "hookah-drive-api",
    }