const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'auth', 'loginSchema.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const loaded = { exports: {} }
new Function('require', 'module', 'exports', compiled)(require, loaded, loaded.exports)
const { loginSchema } = loaded.exports
const password = 'test-password-only'

test('login accepts the existing admin identifier and regular email accounts', () => {
  for (const username of ['admin@admin', 'hookahdriver@hookah.com']) {
    assert.equal(loginSchema.parse({ username, password }).username, username)
  }
})

test('login trims the identifier but preserves the password', () => {
  assert.deepEqual(loginSchema.parse({ username: ' admin@admin ', password: ' password ' }), {
    username: 'admin@admin', password: ' password ',
  })
})

test('login rejects empty identifiers and short passwords', () => {
  assert.equal(loginSchema.safeParse({ username: '   ', password }).success, false)
  assert.equal(loginSchema.safeParse({ username: 'admin@admin', password: 'short' }).success, false)
})
