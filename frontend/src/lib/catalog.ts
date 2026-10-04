import type { Brand } from '../services/brands'
import type { Category } from '../services/categories'
import type { Flavor } from '../services/flavors'
import type { Product } from '../services/products'

const ROSH_CATEGORY_NAMES = ['rosh', 'essências', 'essencias']

export function isRoshCategory(category?: Category | null) {
  return Boolean(category && ROSH_CATEGORY_NAMES.includes(category.name.toLowerCase()))
}

/**
 * The Rosh product to sell for a flavor: the one linked to that flavor, or a generic
 * Rosh (no flavor) as fallback. Returns null when the flavor cannot be ordered.
 */
export function findRoshProduct(products: Product[], categories: Category[], flavor: Flavor) {
  if (!flavor.active) return null
  const roshCategoryIds = new Set(categories.filter((category) => category.active && isRoshCategory(category)).map((category) => category.id))
  const roshProducts = products.filter((product) => roshCategoryIds.has(product.category_id))
  const exact = roshProducts.find((product) => product.flavor_id === flavor.id)
  if (exact) return exact.active ? { product: exact, exact: true } : null
  const generic = roshProducts.find((product) => product.active && product.flavor_id === null)
  return generic ? { product: generic, exact: false } : null
}

/** Note attached to the order item so the lounge always knows which flavor to prepare. */
export function flavorNote(brand: Brand | undefined, flavor: Flavor) {
  return `Sabor: ${brand ? `${brand.name} ` : ''}${flavor.name}`
}
