jest.mock('../pgUserService', () => ({ getUsersByIds: jest.fn() }));
const users = require('../pgUserService');
const { hydrateActivityAuthors } = require('../activityAuthors');

test('batches unique IDs and replaces stale flat and cached nested profiles', async () => {
  users.getUsersByIds.mockResolvedValue([{ id: 4, name: 'Latest', username: 'latest', avatar_url: 'latest.png' }]);
  const result = await hydrateActivityAuthors([{ userId: 4, name: 'Old' }, { user: { id: '4', name: 'Cached', avatar: 'old.png' } }]);
  expect(users.getUsersByIds).toHaveBeenLastCalledWith(['4']);
  result.forEach(row => {
    expect(row.name).toBe('Latest');
    expect(row.user.avatar).toBe('latest.png');
  });
});
test('deleted authors never fall back to stale identity data', async () => {
  users.getUsersByIds.mockResolvedValue([]);
  const result = await hydrateActivityAuthors({ userId: 4, name: 'Deleted name', avatar: 'old.png' });
  expect(result.user).toEqual({ id: 4, name: 'WishTrail member', username: '', avatar: '' });
  expect(result.avatar).toBe('');
});
