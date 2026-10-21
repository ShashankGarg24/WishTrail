const pgUserService = require('./pgUserService');

// Resolve once per page, including cached responses and legacy activity records.
async function hydrateActivityAuthors(input) {
  const rows = Array.isArray(input) ? input : [input];
  const authorId = row => row.userId ?? row.user?.id ?? row.user?._id;
  const ids = [...new Set(rows.map(authorId).filter(id => id != null).map(String))];
  const users = ids.length ? await pgUserService.getUsersByIds(ids) : [];
  const byId = new Map(users.map(user => [String(user.id), user]));
  const result = rows.map(row => {
    const id = authorId(row);
    const user = byId.get(String(id));
    const author = { id, name: user?.name || 'WishTrail member', username: user?.username || '', avatar: user?.avatar_url || '' };
    return { ...row, name: author.name, username: author.username, avatar: author.avatar, user: author };
  });
  return Array.isArray(input) ? result : result[0];
}
module.exports = { hydrateActivityAuthors };
