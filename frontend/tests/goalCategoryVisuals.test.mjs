import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const categories = ['HEALTH_FITNESS', 'MENTAL_HEALTH', 'EDUCATION_LEARNING', 'CAREER_WORK', 'PERSONAL_GROWTH', 'FINANCE', 'CREATIVE', 'SIDE_PROJECTS', 'TRAVEL_EXPERIENCES', 'RELATIONSHIPS', 'FAMILY', 'LIFESTYLE', 'OTHER']

test('all 13 goal categories have one canonical visual definition', async () => {
  const source = await read('src/utils/categoryIcons.jsx')
  for (const category of categories) assert.equal((source.match(new RegExp(`^  ${category}:`, 'gm')) || []).length, 1, category)
  for (const token of ['iconKey', 'accent', 'backgroundStart', 'backgroundEnd', 'iconBackground', 'hero', 'composition', 'base', 'deep', 'mid', 'light', 'glow']) assert.match(source, new RegExp(token))
  assert.match(source, /\|\| 'OTHER'/)
})

test('category banners are generated locally and remain decorative', async () => {
  const [banner, discover] = await Promise.all([read('src/components/GoalCategoryBanner.jsx'), read('src/pages/DiscoverPage.jsx')])
  assert.match(banner, /linear-gradient/)
  assert.match(banner, /aria-hidden="true"/)
  assert.match(banner, /compact: 'h-24'/)
  assert.match(banner, /share: 'h-48/)
  assert.doesNotMatch(discover, /images\.unsplash\.com/)
})

test('shared visual components are used on key goal surfaces', async () => {
  const files = await Promise.all(['pages/DashboardPage.jsx', 'components/GoalDetailsModal.jsx', 'pages/DiscoverPage.jsx', 'pages/FeedPage.jsx', 'components/GoalPostModal.jsx', 'components/ShareableGoalCard.jsx'].map(path => read(`src/${path}`)))
  for (const source of files) assert.match(source, /CategoryIcon|GoalCategoryBanner|GoalHero/)
})

test('goal detail uses one integrated hero for identity and state', async () => {
  const [detail, hero] = await Promise.all([read('src/components/GoalDetailsModal.jsx'), read('src/components/GoalHero.jsx')])
  assert.match(detail, /<GoalHero goal=\{goal\}/)
  for (const feature of ['CategoryIcon', '% complete', 'healthOf', 'AbstractGoalArtwork']) assert.match(hero, new RegExp(feature))
  assert.doesNotMatch(detail, /<GoalCategoryBanner category=\{goal\.category\}/)
})
