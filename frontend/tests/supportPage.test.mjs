import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('footer support links open the public support page', async () => {
  const [footer, app] = await Promise.all([
    read('src/components/Footer.jsx'),
    read('src/App.jsx'),
  ])

  assert.match(footer, /to="\/support">Support<\/Link>/)
  assert.doesNotMatch(footer, /mailto:support@wishtrail\.in">Support/)
  assert.match(app, /path="\/support" element=\{<SupportPage \/>\}/)
})

test('support page provides email, feedback, FAQs, and safety guidance', async () => {
  const page = await read('src/pages/SupportPage.jsx')

  assert.match(page, /mailto:support@wishtrail\.in/)
  assert.match(page, /wt_open_feedback/)
  assert.match(page, /Frequently asked questions/)
  assert.match(page, /Never send your password/)
})
