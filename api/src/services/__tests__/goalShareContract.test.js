const { buildContext, buildSnapshot } = require('../goalShareContract');

const goal = { id: 7, user_id: 2, title: 'My goal', category: 'HEALTH_FITNESS', created_at: '2026-01-01T12:00:00Z', completed_at: '2026-10-12T12:00:00Z', is_public: false };
const details = { completionNote: 'PRIVATE NOTE', completionFeeling: 'proud', completionAttachmentUrl: 'https://example.com/owner-photo.png', description: 'PRIVATE DESCRIPTION', progress: { percent: 30, breakdown: { subGoals: [] } } };
const updates = [{ id: 1, text: 'PRIVATE LOG', date_key: '2026-02-01', emotion: 'good' }, { id: 2, text: ' ', date_key: '2026-03-01', emotion: 'great' }, { id: 3, text: 'A real update', date_key: '2026-10-12' }];
const make = (overrides = {}) => buildContext({ goal, details, updates, ...overrides });

test('lifetime counts exclude emotion-only logs, count completion once as an active day, and never count completion as an update', () => {
  expect(make()).toMatchObject({ journeyDuration: 285, progressUpdateCount: 2, activeDays: 2, progress: 100, privacy: 'PRIVATE' });
  expect(make({ updates: updates.slice(0, 2) }).activeDays).toBe(2);
});
test('no private narrative, rolling consistency or invented events enter the context', () => {
  const context = make();
  expect(JSON.stringify(context)).not.toMatch(/PRIVATE NOTE|PRIVATE LOG|PRIVATE DESCRIPTION|consistency|comeback|5K/);
  expect(context.selectedJourneyEvents.map(event => event.type)).toEqual(['start', 'progress', 'completion']);
  expect(make({ updates: [] }).selectedJourneyEvents.map(event => event.type)).toEqual(['start', 'completion']);
});
test('timezone calendar days and backdated completions do not fabricate a duration', () => {
  expect(make({ goal: { ...goal, created_at: '2026-10-11T20:00:00Z' }, updates: [], timezone: 'Asia/Kolkata' }).journeyDuration).toBe(1);
  const invalid = make({ goal: { ...goal, created_at: '2026-10-13T12:00:00Z' }, updates: [] });
  expect(invalid.journeyDuration).toBeUndefined();
  expect(invalid.selectedJourneyEvents.map(event => event.type)).toEqual(['completion']);
});
test.each([
  ['GOAL', ['MINIMAL']], ['PROGRESS', ['PROGRESS', 'MINIMAL', 'PHOTO']],
  ['COMPLETION', ['JOURNEY', 'MINIMAL', 'PHOTO']]
])('%s uses the required template matrix', (shareType, expected) => {
  expect(make({ shareType }).templates).toEqual(expected);
  expect(make({ shareType, details: {} }).templates).toEqual(expected.filter(item => item !== 'PHOTO'));
});
test('milestones require recorded completion dates, including selection of older milestones', () => {
  expect(() => make({ shareType: 'MILESTONE' })).toThrow('No recorded milestone');
  const d = { progress: { breakdown: { subGoals: [
    { completed: true, completedAt: '2026-04-02T12:00:00Z', title: 'PRIVATE SUBGOAL' },
    { completed: true, completedAt: '2026-06-02T12:00:00Z' },
    { completed: true, completedAt: '2026-08-02T12:00:00Z' },
    { completed: true }
  ] } } };
  const context = make({ shareType: 'MILESTONE', details: d, eventId: 'subgoal-0' });
  expect(context.templates).toEqual(['JOURNEY', 'PROGRESS']);
  expect(context.selectedJourneyEvents.map(event => event.id)).toEqual(['started', 'subgoal-0', 'completed']);
  expect(JSON.stringify(context)).not.toContain('PRIVATE SUBGOAL');
});
test('snapshot respects every opt-out, keeps feeling/note off, and ignores injected fields', () => {
  const context = make();
  const snapshot = buildSnapshot(context, { template: 'JOURNEY', showProgress: false, showStats: false, showJourneyDuration: false, showCompletionDate: false, showMilestones: false, note: 'Do not include', location: 'secret', completionNote: 'injected' });
  expect(Object.keys(snapshot).sort()).toEqual(['version', 'shareType', 'title', 'category', 'template', 'format', 'selectedJourneyEvents'].sort());
  expect(snapshot.selectedJourneyEvents).toEqual([{ type: 'start', label: 'Started', date: '2026-01-01' }, { type: 'completion', label: 'Completed' }]);
  expect(buildSnapshot(context, { showFeeling: true, showNote: true, note: ' My own share note ' })).toMatchObject({ feeling: 'proud', note: 'My own share note' });
});
test('rejects invalid templates, options, formats and overlong notes', () => {
  for (const options of [null, [], { template: 'PROGRESS' }, { format: 'WIDE' }, { showFeeling: 'true' }, { note: 'a'.repeat(121) }]) expect(() => buildSnapshot(make(), options)).toThrow();
  expect(() => make({ goal: { ...goal, completed_at: null }, shareType: 'COMPLETION' })).toThrow();
  expect(make({ details: { completionFeeling: 'neutral' } }).feeling).toBeUndefined();
});
