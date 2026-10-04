import { getBrands } from './brands'
import { getCategories } from './categories'
import { getFlavors } from './flavors'
import { getProducts } from './products'
import { getPublicConfig } from './publicOrders'

export async function getCustomerCatalog() {
  const [loadedBrands, loadedFlavors, loadedCategories, loadedProducts, config] = await Promise.all([
    getBrands(), getFlavors(), getCategories(), getProducts(), getPublicConfig(),
  ])
  const brands = loadedBrands.filter((item) => item.active)
  const categories = loadedCategories.filter((item) => item.active)
  const flavors = loadedFlavors.filter((item) => item.active && brands.some((brand) => brand.id === item.brand_id))
  // Keep inactive products so an explicitly disabled Rosh never falls back to a generic one.
  const products = loadedProducts.map((product) => ({
    ...product,
    active: product.active && categories.some((category) => category.id === product.category_id) &&
      (!product.flavor_id || flavors.some((flavor) => flavor.id === product.flavor_id)),
  }))
  return { brands, categories, flavors, products, config }
}
