import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { defaultShareOptions, shareSnapshot, isRecentlyCompleted } from '../src/utils/goalShare.js'
const require = createRequire(import.meta.url)
const { buildContext, buildSnapshot } = require('../../api/src/services/goalShareContract.js')
const context = buildContext({ goal: { id: 1, title: 'A long goal', category: 'OTHER', created_at: '2026-01-01', completed_at: '2026-10-12' }, details: { completionFeeling: 'happy', completionAttachmentUrl: 'https://example.com/owner.png' }, updates: [{ id: 1, text: 'Private', date_key: '2026-03-02' }] })
test('preview and server snapshot match for every format, template and visibility switch', () => {
  for (const template of context.templates) for (const format of ['STORY_9_16', 'SQUARE_1_1']) {
    for (let mask = 0; mask < 128; mask++) {
      const options = { ...defaultShareOptions(context), template, format, note: 'An explicit note' }
      ;['showProgress', 'showStats', 'showJourneyDuration', 'showCompletionDate', 'showMilestones', 'showFeeling', 'showNote'].forEach((key, index) => { options[key] = Boolean(mask & (1 << index)) })
      assert.deepEqual(shareSnapshot(context, options), buildSnapshot(context, options))
    }
  }
})
test('card CTA ends at seven days while incomplete and malformed dates are excluded', () => {
  const date = Date.parse('2026-10-01T12:00:00Z')
  const goal = { completedAt: new Date(date).toISOString() }
  assert.equal(isRecentlyCompleted(goal, date), true)
  assert.equal(isRecentlyCompleted(goal, date + 7 * 86400000 - 1), true)
  assert.equal(isRecentlyCompleted(goal, date + 7 * 86400000), false)
  assert.equal(isRecentlyCompleted({}, date), false)
  assert.equal(isRecentlyCompleted({ completedAt: 'invalid' }, date), false)
  const morning = new Date(2026, 9, 13, 9).getTime()
  assert.equal(isRecentlyCompleted({ completedAt: new Date(2026, 9, 13, 12).toISOString() }, morning), true)
  assert.equal(isRecentlyCompleted({ completedAt: new Date(2026, 9, 14, 12).toISOString() }, morning), false)
})
