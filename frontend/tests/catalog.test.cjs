const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function load(relativePath, dependencies = {}) {
  const file = path.join(__dirname, '..', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  return module.exports
}

const { findRoshProduct } = load('src/lib/catalog.ts')
const category = { id: 'rosh', name: 'Rosh', active: true }
const flavor = { id: 'flavor', brand_id: 'brand', name: 'Mint', active: true }
const generic = { id: 'generic', category_id: 'rosh', flavor_id: null, active: true }
const exact = { id: 'exact', category_id: 'rosh', flavor_id: 'flavor', active: true }

test('deactivated exact Rosh cannot fall back to an active generic Rosh', () => {
  assert.equal(findRoshProduct([generic, { ...exact, active: false }], [category], flavor), null)
})

test('active exact product takes precedence over generic', () => {
  assert.deepEqual(findRoshProduct([generic, exact], [category], flavor), { product: exact, exact: true })
})

test('generic Rosh remains available for flavors without a dedicated product', () => {
  assert.deepEqual(findRoshProduct([generic], [category], flavor), { product: generic, exact: false })
})

test('inactive category, flavor and generic Rosh are unavailable', () => {
  assert.equal(findRoshProduct([exact], [{ ...category, active: false }], flavor), null)
  assert.equal(findRoshProduct([exact], [category], { ...flavor, active: false }), null)
  assert.equal(findRoshProduct([{ ...generic, active: false }], [category], flavor), null)
})

test('each catalog refresh reflects activation, price and photo changes', async () => {
  const brand = { id: 'brand', active: true }
  const product = { ...exact, price: '40.00', image_url: '/old.webp' }
  const { getCustomerCatalog } = load('src/services/customerCatalog.ts', {
    './brands': { getBrands: async () => [brand] },
    './categories': { getCategories: async () => [category] },
    './flavors': { getFlavors: async () => [flavor] },
    './products': { getProducts: async () => [product, generic] },
    './publicOrders': { getPublicConfig: async () => ({ online_payments_enabled: false }) },
  })
  assert.equal((await getCustomerCatalog()).products[0].active, true)
  product.active = false
  let catalog = await getCustomerCatalog()
  assert.equal(catalog.products[0].active, false)
  assert.equal(findRoshProduct(catalog.products, catalog.categories, flavor), null)
  product.active = true
  product.price = '45.00'
  product.image_url = '/new.webp'
  catalog = await getCustomerCatalog()
  assert.equal(catalog.products[0].price, '45.00')
  assert.equal(catalog.products[0].image_url, '/new.webp')
  brand.active = false
  catalog = await getCustomerCatalog()
  assert.equal(catalog.products[0].active, false)
  assert.equal(catalog.flavors.length, 0)
  brand.active = true
  assert.equal((await getCustomerCatalog()).products[0].active, true)
  flavor.active = false
  assert.equal((await getCustomerCatalog()).products[0].active, false)
  flavor.active = true
  category.active = false
  catalog = await getCustomerCatalog()
  assert.equal(catalog.products[0].active, false)
  assert.equal(catalog.products[1].active, false)
  category.active = true
  assert.equal((await getCustomerCatalog()).products[0].active, true)
})
