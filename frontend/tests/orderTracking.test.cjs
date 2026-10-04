const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'orderTracking.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText

test('tracking persists in session storage, survives reads and clears for a new order', () => {
  const values = new Map()
  const session = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const module = { exports: {} }
  new Function('sessionStorage', 'module', 'exports', compiled)(session, module, module.exports)
  const { readOrderToken, saveOrderToken } = module.exports
  assert.equal(readOrderToken(), null)
  saveOrderToken('private-order-token')
  assert.equal(readOrderToken(), 'private-order-token')
  assert.equal(readOrderToken(), 'private-order-token')
  saveOrderToken(null)
  assert.equal(readOrderToken(), null)
})

test('blocked session storage raises an error so the interface can notify the customer', () => {
  const fail = () => { throw new Error('Storage blocked') }
  const module = { exports: {} }
  new Function('sessionStorage', 'module', 'exports', compiled)(
    { getItem: fail, setItem: fail, removeItem: fail }, module, module.exports,
  )
  assert.throws(() => module.exports.readOrderToken(), /Storage blocked/)
  assert.throws(() => module.exports.saveOrderToken('token'), /Storage blocked/)
})
