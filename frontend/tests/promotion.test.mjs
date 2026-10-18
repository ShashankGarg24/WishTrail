import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { build } from 'esbuild'
import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { promotionDestination } from '../src/utils/promotion.js'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const bundle = await build({
  stdin: { contents: "export { default as Home } from './src/components/HomeOverview'; export { default as Card } from './src/components/PromotionCard'", resolveDir: root, loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  packages: 'external',
  plugins: [{ name: 'home-dependencies', setup(builder) {
    builder.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'stub' }))
    builder.onResolve({ filter: /^\.\/WeeklyTrail$/ }, () => ({ path: 'weekly', namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({ contents: path === 'api'
      ? "export default globalThis.client; export const settingsAPI = { getTodayFocus: async () => ({data:{data:{}}}) }"
      : "export const WeeklyTrailTeaser = ({ fallback = null }) => fallback" }))
  } }],
})
const offer = { id: 'offer-1', surface: 'announcement_card', title: 'Keep growing', subtitle: 'More support', offerCopy: 'An offer', ctaLabel: 'Explore', ctaUrl: 'https://wishtrail.in/premium?offer=1#plans' }

async function mount(initial = offer, { storageBlocked = false, native = false } = {}) {
  let value = initial
  const saved = new Map(), events = new Map(), timers = new Map()
  let requests = 0
  const storage = { getItem: key => saved.get(key), setItem: (key, data) => saved.set(key, data) }
  const window = {
    get localStorage() { if (storageBlocked) throw Error('unavailable'); return storage },
    setInterval: (fn, ms) => { assert.equal(ms, 60000); timers.set(1, fn); return 1 },
    clearInterval: id => timers.delete(id),
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: name => events.delete(name),
    ...(native ? { ReactNativeWebView: { postMessage: () => assert.fail('CTA should remain in the web router') } } : {}),
  }
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) }
  const client = { get: async (path, options) => {
    requests++
    assert.equal(path, '/config/active-promotion')
    assert.equal(options.timeout, 5000)
    if (value instanceof Error) throw value
    return { data: { data: { promotion: value } } }
  } }
  const module = { exports: {} }
  vm.runInNewContext(bundle.outputFiles[0].text, { require, module, exports: module.exports, window, document, client, AbortController, URL, console })
  const { Home, Card } = module.exports
  let route = ''
  function Location() { const location = useLocation(); route = `${location.pathname}${location.search}${location.hash}`; return null }
  const props = { user: { id: 1, name: 'Taylor' }, setQuickActionsOpen() {}, onTab() {}, navigate() {} }
  const tree = () => React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, React.createElement(Home, props), React.createElement(Location))
  let view
  await act(async () => { view = renderer.create(tree()) })
  return {
    view, saved, events, timers, Card, props,
    get requests() { return requests }, get route() { return route },
    async refresh(next = value) { value = next; await act(async () => { await timers.get(1)?.() }) },
    async remount() { await act(async () => view.unmount()); await act(async () => { view = renderer.create(tree()) }); this.view = view },
    async close() { await act(async () => view.unmount()); assert.equal(timers.size, 0); assert.equal(events.size, 0) },
  }
}
const cards = fixture => fixture.view.root.findAll(node => node.type === 'article' && node.props['aria-label'] === 'WishTrail announcement')

test('Home renders normally with null or failed promotion fetch', async () => {
  for (const result of [null, new Error('offline')]) {
    const fixture = await mount(result)
    assert.equal(cards(fixture).length, 0)
    assert.match(JSON.stringify(fixture.view.toJSON()), /Your Momentum/)
    assert.equal(fixture.requests, 1)
    await fixture.close()
  }
})

test('eligible Home renders one card; dismissal persists across remount and new content appears', async () => {
  const fixture = await mount()
  assert.equal(cards(fixture).length, 1)
  await act(async () => fixture.view.root.findByProps({ 'aria-label': 'Dismiss promotion' }).props.onClick())
  assert.equal(cards(fixture).length, 0)
  assert.equal(fixture.saved.get('wt_promotion_dismissed:offer-1'), '1')
  await fixture.remount()
  assert.equal(cards(fixture).length, 0)
  await fixture.refresh({ ...offer, id: 'offer-2', title: 'New offer' })
  assert.equal(cards(fixture).length, 1)
  await fixture.refresh(null)
  assert.equal(cards(fixture).length, 0)
  await fixture.close()
})

test('unavailable storage still allows dismissal through refreshes', async () => {
  const fixture = await mount(offer, { storageBlocked: true })
  await act(async () => fixture.view.root.findByProps({ 'aria-label': 'Dismiss promotion' }).props.onClick())
  await fixture.refresh()
  assert.equal(cards(fixture).length, 0)
  await fixture.close()
})

test('CTA uses React Router in browser and installed WebView', async () => {
  for (const native of [false, true]) {
    const fixture = await mount(offer, { native })
    const link = fixture.view.root.findAllByType('a').find(node => node.props.href === '/premium?offer=1#plans')
    assert.ok(link)
    await act(async () => link.props.onClick({ button: 0, preventDefault() {} }))
    assert.equal(fixture.route, '/premium?offer=1#plans')
    await fixture.close()
  }
  assert.equal(promotionDestination('https://wishtrail.in//premium'), '/premium')
  assert.throws(() => promotionDestination('javascript:alert(1)'))
})

test('focus revalidates, failures remove stale offers, and cleanup stops polling', async () => {
  const fixture = await mount()
  await act(async () => { await fixture.events.get('focus')() })
  assert.equal(fixture.requests, 2)
  await fixture.refresh(new Error('offline'))
  assert.equal(cards(fixture).length, 0)
  assert.match(JSON.stringify(fixture.view.toJSON()), /Your Momentum/)
  await fixture.close()
})

test('shared card renders configured markup as text and omits absent slots', async () => {
  const fixture = await mount()
  let view
  await act(async () => { view = renderer.create(React.createElement(MemoryRouter, null, React.createElement(fixture.Card, { promotion: { title: '<script>alert(1)</script>' } }))) })
  assert.equal(view.root.findAllByType('script').length, 0)
  assert.equal(view.root.findAllByType('a').length, 0)
  assert.match(JSON.stringify(view.toJSON()), /<script>alert\(1\)<\/script>/)
  await act(async () => view.unmount())
  await fixture.close()
})
