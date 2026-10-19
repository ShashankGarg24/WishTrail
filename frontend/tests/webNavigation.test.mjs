import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('web shell defines the five global destinations', async () => {
  const header = await read('src/components/Header.jsx')
  for (const destination of ['Home', 'Feed', 'Discover', 'Leaderboard', 'Profile']) {
    assert.match(header, new RegExp(`name: '${destination}'`))
  }
  assert.doesNotMatch(header, /name: 'Communities'/)
})

test('contextual navigation covers each supported section and dynamic interests', async () => {
  const sidebar = await read('src/components/navigation/ContextualSidebar.jsx')
  for (const section of ['home', 'feed', 'discover', 'leaderboard', 'profile']) {
    assert.match(sidebar, new RegExp(`section === '${section}'|return '${section}'`))
  }
  assert.match(sidebar, /user\?\.interests/)
  assert.match(sidebar, /wt_sidebar_collapsed/)
  assert.doesNotMatch(sidebar, /Communit/)
})

test('communities stay implemented but are disabled at the routing boundary', async () => {
  const [features, app] = await Promise.all([read('src/config/features.js'), read('src/App.jsx')])
  assert.match(features, /communities: false/)
  assert.match(app, /FEATURES\.communities/)
  assert.match(app, /Navigate to="\/discover" replace/)
})

test('mobile bottom navigation remains independent of the web sidebar', async () => {
  const [app, bottomTabs] = await Promise.all([read('src/App.jsx'), read('src/components/BottomTabBar.jsx')])
  assert.match(app, /<BottomTabBar \/>/)
  assert.match(bottomTabs, /md:hidden/)
  assert.doesNotMatch(bottomTabs, /ContextualSidebar/)
})

test('header marks mobile discovery and notifications as selected pages', async () => {
  const header = await read('src/components/Header.jsx')
  assert.match(header, /isDiscoverActive/)
  assert.match(header, /isNotificationsActive/)
  assert.match(header, /aria-current=\{isDiscoverActive \? 'page'/)
  assert.match(header, /aria-current=\{isNotificationsActive \? 'page'/)
})
