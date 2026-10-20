import test from 'node:test'
import assert from 'node:assert/strict'
import { readThemeMode, resolveDarkMode, applyTheme } from '../src/utils/theme.js'

test('theme preference migrates old settings and resolves system preference', () => {
  let saved = null
  globalThis.localStorage = { getItem: () => saved }
  globalThis.window = { matchMedia: () => ({ matches: true }) }
  assert.equal(readThemeMode(), 'system')
  assert.equal(resolveDarkMode('system'), true)
  assert.equal(resolveDarkMode('light'), false)
  saved = JSON.stringify({ state: { isDarkMode: false } })
  assert.equal(readThemeMode(), 'light')
  saved = JSON.stringify({ state: { isDarkMode: false, themeMode: 'system' } })
  assert.equal(readThemeMode(), 'system')
  saved = '{broken'
  assert.equal(readThemeMode(), 'system')
  window.matchMedia = () => ({ matches: false })
  assert.equal(resolveDarkMode('system'), false)
  assert.equal(resolveDarkMode('dark'), true)
})

test('theme application updates browser and native shell together', () => {
  const messages = []
  const classes = new Set()
  const meta = {}
  globalThis.document = {
    documentElement: { classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name) }, style: {} },
    querySelector: () => ({ setAttribute: (key, value) => { meta[key] = value } })
  }
  globalThis.window = { ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) } }
  applyTheme(true)
  assert.ok(classes.has('dark'))
  assert.equal(meta.content, '#0B1220')
  assert.equal(document.documentElement.style.colorScheme, 'dark')
  applyTheme(false)
  assert.equal(classes.has('dark'), false)
  assert.deepEqual(messages.map(message => message.theme), ['dark', 'light'])
  delete globalThis.document
  delete globalThis.window
  delete globalThis.localStorage
})
