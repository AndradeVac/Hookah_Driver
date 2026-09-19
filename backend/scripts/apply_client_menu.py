from decimal import Decimal

from app.core.database import SessionLocal
from app.models.brand import Brand
from app.models.category import Category
from app.models.flavor import Flavor
from app.models.product import Product

db = SessionLocal()


def get_category(name: str) -> Category:
    category = db.query(Category).filter(Category.name == name).first()
    if category is None:
        category = Category(name=name, active=True)
        db.add(category)
        db.flush()
    else:
        category.active = True
    return category


def upsert_product(category: Category, name: str, price: str, description: str | None = None, flavor_id=None):
    product = db.query(Product).filter(
        Product.category_id == category.id,
        Product.name == name,
        Product.flavor_id == flavor_id,
    ).first()
    if product is None:
        product = Product(category_id=category.id, name=name, price=Decimal(price), description=description, active=True, flavor_id=flavor_id)
        db.add(product)
    else:
        product.price = Decimal(price)
        product.description = description
        product.active = True
    return product


def deactivate_products(category: Category, keep_names: set[str]):
    for product in db.query(Product).filter(Product.category_id == category.id).all():
        if product.name not in keep_names:
            product.active = False


# --- Rosh: brand fix + flat price ---
zommo = db.query(Brand).filter(Brand.name == "Zommo").first()
if zommo is not None:
    zommo.name = "Zomo"
    zommo.active = True

rosh_category = get_category("Rosh")
for product in db.query(Product).filter(Product.category_id == rosh_category.id).all():
    product.price = Decimal("40.00")

# --- Acessórios ---
acessorios = get_category("Acessórios")
upsert_product(acessorios, "Piteira higiênica", "0.00", "Free")
upsert_product(acessorios, "Piteira higiênica Ziggy", "30.00")
upsert_product(acessorios, "Alumínio", "1.50")
upsert_product(acessorios, "Carvão", "1.50")
upsert_product(acessorios, "Essência", "20.00")
upsert_product(acessorios, "Prato", "15.00")
upsert_product(acessorios, "Rosh (peça)", "15.00", "Peça de reposição")
upsert_product(acessorios, "Vaso", "25.00")
upsert_product(acessorios, "Pegador", "15.00")
upsert_product(acessorios, "Abafador", "35.00")
upsert_product(acessorios, "Borracha Vaso", "2.00")
upsert_product(acessorios, "Borracha Rosh", "2.00")
upsert_product(acessorios, "Borracha Mangueira", "2.00")
upsert_product(acessorios, "Kit mangueira", "10.00")
deactivate_products(acessorios, {
    "Piteira higiênica", "Piteira higiênica Ziggy", "Alumínio", "Carvão", "Essência",
    "Prato", "Rosh (peça)", "Vaso", "Pegador", "Abafador",
    "Borracha Vaso", "Borracha Rosh", "Borracha Mangueira", "Kit mangueira",
})

# --- Adicional ---
adicional = get_category("Adicionais")
upsert_product(adicional, "Piteira Hydra (gelo)", "10.00")
upsert_product(adicional, "Carvão", "1.50")
upsert_product(adicional, "Acender carvão", "10.00")
deactivate_products(adicional, {"Piteira Hydra (gelo)", "Carvão", "Acender carvão"})

# --- Bebida ---
bebidas = get_category("Bebidas")
upsert_product(bebidas, "Água", "5.00")
upsert_product(bebidas, "Coca", "7.00")
upsert_product(bebidas, "Monster", "15.00")
upsert_product(bebidas, "Intake", "12.00")
deactivate_products(bebidas, {"Água", "Coca", "Monster", "Intake"})

# --- Combos ---
combos = get_category("Combos")
upsert_product(combos, "Combo 1", "50.00", "Rosh + coca")
upsert_product(combos, "Combo 2", "120.00", "3 rosh")
upsert_product(combos, "Combo 3", "20.00", "3 cocas")
upsert_product(combos, "Combo 4", "12.00", "3 águas")
deactivate_products(combos, {"Combo 1", "Combo 2", "Combo 3", "Combo 4"})

# --- Kits ---
kits = get_category("Kits")
upsert_product(kits, "Kit o básico", "40.00", "1 essência + 6 carvão + 3 alumínio")
upsert_product(kits, "Kit o completo", "100.00", "3 essência + 18 carvão + 9 alumínio")
deactivate_products(kits, {"Kit o básico", "Kit o completo"})

# --- Retire categories no longer part of the menu ---
for old_category_name in ("Carvões", "Porções"):
    old_category = db.query(Category).filter(Category.name == old_category_name).first()
    if old_category is not None:
        for product in db.query(Product).filter(Product.category_id == old_category.id).all():
            product.active = False
        old_category.active = False

db.commit()
db.close()
print("done")
