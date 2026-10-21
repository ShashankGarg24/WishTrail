jest.mock('../pgUserService', () => ({ getUserById: jest.fn() }));
jest.mock('../pgBlockService', () => ({ getBlockedUserIds: jest.fn(), getBlockerUserIds: jest.fn() }));
const { goalAccessPolicy, resolveGoalAccess, isGoalOwner } = require('../goalAccessPolicy');
const users = require('../pgUserService');
const blocks = require('../pgBlockService');

beforeEach(() => {
  jest.clearAllMocks();
  users.getUserById.mockResolvedValue({ is_active: true });
  blocks.getBlockedUserIds.mockResolvedValue([]);
  blocks.getBlockerUserIds.mockResolvedValue([]);
});

test.each([
  [false, false], [false, true], [true, false], [true, true]
])('owners retain all access for public=%s updates=%s', (is_public, is_updates_public) => {
  const permissions = goalAccessPolicy({ user_id: '7', is_public, is_updates_public }, 7);
  expect(Object.values(permissions).every(Boolean)).toBe(true);
});

test.each([
  [false, false, false, false],
  [false, true, false, false],
  [true, false, true, false],
  [true, true, true, true]
])('visitor access respects both stored privacy choices (%s, %s)', (is_public, is_updates_public, goalVisible, updatesVisible) => {
  const permissions = goalAccessPolicy({ user_id: 7, is_public, is_updates_public }, 8);
  expect(permissions).toEqual({ canViewGoal: goalVisible,
    canViewTimeline: updatesVisible, canViewUpdates: updatesVisible });
});

test('missing identities cannot acquire ownership and missing visibility fails closed', () => {
  expect(isGoalOwner(null, null)).toBe(false);
  expect(isGoalOwner({ user_id: '7' }, 7)).toBe(true);
  expect(isGoalOwner({ user_id: 7 }, 8)).toBe(false);
  expect(Object.values(goalAccessPolicy(null, null)).some(Boolean)).toBe(false);
  expect(goalAccessPolicy({ user_id: 7 }, 8).canViewGoal).toBe(false);
});

test.each(['getBlockedUserIds', 'getBlockerUserIds'])('blocks in %s prevent all public reads', async method => {
  blocks[method].mockResolvedValue(['7']);
  const permissions = await resolveGoalAccess({ user_id: 7, is_public: true, is_updates_public: true }, 8);
  expect(Object.values(permissions).some(Boolean)).toBe(false);
});

test('inactive or deleted authors are unavailable to visitors', async () => {
  for (const owner of [null, { is_active: false }]) {
    users.getUserById.mockResolvedValue(owner);
    expect((await resolveGoalAccess({ user_id: 7, is_public: true }, 8)).canViewGoal).toBe(false);
  }
});

test('owner access does not depend on relationship lookups', async () => {
  expect((await resolveGoalAccess({ user_id: '7' }, 7)).canViewTimeline).toBe(true);
  expect(users.getUserById).not.toHaveBeenCalled();
  expect(blocks.getBlockedUserIds).not.toHaveBeenCalled();
});
