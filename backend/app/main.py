from fastapi import FastAPI

from app.api.routes.brands import router as brands_router
from app.api.routes.categories import router as categories_router
from app.api.routes.customers import router as customers_router
from app.api.routes.flavors import router as flavors_router
from app.api.routes.auth import router as auth_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.orders import router as orders_router
from app.api.routes.public_orders import router as public_orders_router
from app.api.routes.products import router as products_router
from app.api.routes.users import router as users_router
from app.core.exceptions import register_exception_handlers


app = FastAPI(
    title="Hookah Driver API",
    version="1.0.0",
)

register_exception_handlers(app)


app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(brands_router)
app.include_router(categories_router)
app.include_router(customers_router)
app.include_router(flavors_router)
app.include_router(orders_router)
app.include_router(public_orders_router)
app.include_router(products_router)
app.include_router(users_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "hookah-drive-api",
    }