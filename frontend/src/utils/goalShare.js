export const defaultShareOptions = context => ({ template: context.templates[0], format: 'STORY_9_16', showProgress: true, showJourneyDuration: true, showStats: true, showCompletionDate: true, showMilestones: true, showFeeling: false, showNote: false, note: '' })

// Mirrors the server allowlist; the server rebuilds and validates this on post.
export function shareSnapshot(context, options) {
  const result = { version: 1, shareType: context.shareType, title: context.title, category: context.category, template: options.template, format: options.format }
  const fields = { showProgress: ['progress'], showJourneyDuration: ['journeyDuration'], showStats: ['progressUpdateCount', 'activeDays'], showCompletionDate: ['completionDate'] }
  for (const [flag, keys] of Object.entries(fields)) if (options[flag] !== false) for (const key of keys) if (context[key] !== undefined) result[key] = context[key]
  if (options.template === 'JOURNEY') result.selectedJourneyEvents = context.selectedJourneyEvents
    .filter(item => options.showMilestones !== false || ['start', 'completion'].includes(item.type))
    .map(({ type, label, date }) => ({ type, label, ...(type === 'completion' && options.showCompletionDate === false ? {} : { date }) }))
  if (options.template === 'PHOTO') result.photo = context.photo
  if (options.showFeeling && context.feeling) result.feeling = context.feeling
  if (options.showNote && options.note.trim()) result.note = options.note.trim()
  return result
}

export function isRecentlyCompleted(goal, now = Date.now()) {
  const date = Date.parse(goal?.completedAt || goal?.completed_at)
  if (!Number.isFinite(date)) return false
  // Completion calendar dates are stored at noon. A goal completed this morning
  // must still get its CTA before today's stored noon timestamp.
  if (now < date) return new Date(now).toDateString() === new Date(date).toDateString()
  return now - date < 7 * 86400000
}
