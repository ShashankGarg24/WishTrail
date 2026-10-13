const crypto = require('crypto');
const { getDateKeyInTimezone, getCurrentDateInTimezone } = require('../utility/timezone');
const { recordedMilestones } = require('./goalJourneyEvents');

const TEMPLATES = {
  GOAL: ['MINIMAL'],
  PROGRESS: ['PROGRESS', 'MINIMAL', 'PHOTO'],
  MILESTONE: ['JOURNEY', 'PROGRESS', 'PHOTO'],
  COMPLETION: ['JOURNEY', 'MINIMAL', 'PHOTO']
};
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
const dateKey = (value, timezone) => value && !Number.isNaN(new Date(value).getTime()) ? getDateKeyInTimezone(value, timezone) : null;

// No narrative text is copied from logs, notes, linked goals, or journals.
function journeyEvents(goal, details, updates, timezone, eventId) {
  const start = dateKey(goal.created_at, timezone);
  const end = dateKey(goal.completed_at, timezone);
  const middle = recordedMilestones(goal, details, timezone);
  const meaningful = updates.filter(item => String(item.text || '').trim() && item.date_key >= start && (!end || item.date_key <= end));
  if (meaningful.length) {
    const last = meaningful[meaningful.length - 1];
    middle.push({ id: `update-${last.id}`, type: 'progress', label: 'Progress logged', date: last.date_key });
  }
  middle.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const selected = eventId ? middle.filter(item => item.id === eventId) : middle.slice(-2);
  return [
    ...(start && (!end || start <= end) ? [{ id: 'started', type: 'start', label: 'Started', date: start }] : []),
    ...selected,
    ...(end ? [{ id: 'completed', type: 'completion', label: 'Completed', date: end }] : [])
  ];
}

function buildContext({ goal, details, updates, timezone = 'UTC', shareType, eventId }) {
  const type = shareType || (goal.completed_at ? 'COMPLETION' : 'GOAL');
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(TEMPLATES, type)) fail('Invalid share type');
  if (eventId !== undefined && (typeof eventId !== 'string' || !/^(subgoal|update)-\d+$/.test(eventId))) fail('Invalid journey event');
  if (type === 'COMPLETION' && !goal.completed_at) fail('This goal is not completed');
  const start = dateKey(goal.created_at, timezone);
  const completionDate = dateKey(goal.completed_at, timezone);
  const end = goal.completed_at ? completionDate : getCurrentDateInTimezone(timezone);
  const meaningful = updates.filter(item => String(item.text || '').trim() && item.date_key >= start && item.date_key <= end);
  const events = journeyEvents(goal, details, meaningful, timezone, eventId);
  if (type === 'MILESTONE' && !events.some(item => item.type === 'milestone' && (!eventId || item.id === eventId))) fail('No recorded milestone is available');
  const selectedUpdate = eventId ? meaningful.find(item => `update-${item.id}` === eventId) : meaningful[meaningful.length - 1];
  if (type === 'PROGRESS' && eventId && !selectedUpdate) fail('This progress event is unavailable');
  const days = start && end && end >= start ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : undefined;
  const activeDates = new Set(meaningful.map(item => item.date_key));
  if (goal.completed_at && end >= start) activeDates.add(end);
  const feeling = type === 'COMPLETION' ? details?.completionFeeling : type === 'PROGRESS' ? selectedUpdate?.emotion : null;
  // Only the existing owner-uploaded completion attachment is eligible in V1.
  const photo = /^https:\/\//.test(details?.completionAttachmentUrl || '') ? details.completionAttachmentUrl : undefined;
  const progress = goal.completed_at ? 100 : details?.progress?.percent;
  const context = {
    shareType: type, goalId: String(goal.id), title: String(goal.title || '').slice(0, 100), category: goal.category,
    ...(progress !== undefined && progress !== null && Number.isFinite(Number(progress)) ? { progress: Math.min(100, Math.max(0, Math.round(Number(progress)))) } : {}),
    ...(completionDate ? { completionDate } : {}),
    ...(days !== undefined ? { journeyDuration: days, progressUpdateCount: meaningful.length, activeDays: activeDates.size } : {}),
    selectedJourneyEvents: events,
    ...(photo ? { photo } : {}),
    ...(feeling && feeling !== 'neutral' ? { feeling } : {}),
    privacy: goal.is_public ? 'PUBLIC' : 'PRIVATE',
    templates: TEMPLATES[type].filter(template => template !== 'PHOTO' || photo),
    ...(eventId ? { eventId } : {})
  };
  context.revision = crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
  return context;
}

function buildSnapshot(context, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('Invalid share options');
  for (const flag of ['showProgress', 'showJourneyDuration', 'showStats', 'showCompletionDate', 'showMilestones', 'showFeeling', 'showNote']) {
    if (options[flag] !== undefined && typeof options[flag] !== 'boolean') fail('Invalid visibility option');
  }
  const template = options.template || context.templates[0];
  const format = options.format || 'STORY_9_16';
  if (!context.templates.includes(template)) fail('Template unavailable');
  if (!['STORY_9_16', 'SQUARE_1_1'].includes(format)) fail('Invalid format');
  if (options.note !== undefined && (typeof options.note !== 'string' || options.note.length > 120)) fail('Share note must be at most 120 characters');
  const result = { version: 1, shareType: context.shareType, title: context.title, category: context.category, template, format };
  const fields = { showProgress: ['progress'], showJourneyDuration: ['journeyDuration'], showStats: ['progressUpdateCount', 'activeDays'], showCompletionDate: ['completionDate'] };
  for (const [flag, keys] of Object.entries(fields)) {
    if (options[flag] !== false) for (const key of keys) if (context[key] !== undefined) result[key] = context[key];
  }
  if (template === 'JOURNEY') result.selectedJourneyEvents = context.selectedJourneyEvents
    .filter(item => options.showMilestones !== false || ['start', 'completion'].includes(item.type))
    .map(({ type, label, date }) => ({ type, label, ...(type === 'completion' && options.showCompletionDate === false ? {} : { date }) }));
  if (template === 'PHOTO') result.photo = context.photo;
  if (options.showFeeling === true && context.feeling) result.feeling = context.feeling;
  if (options.showNote === true && options.note?.trim()) result.note = options.note.trim();
  return result;
}

module.exports = { buildContext, buildSnapshot, journeyEvents, TEMPLATES };
