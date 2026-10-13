const pgBlockService = require('./pgBlockService');

async function assertShareAccess(activity, userId) {
  if (activity?.type !== 'goal_shared') return;
  const owner = Number(activity.userId) === Number(userId);
  if (!owner && !activity.isPublic) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  if (!owner) {
    const [out, incoming] = await Promise.all([pgBlockService.getBlockedUserIds(userId), pgBlockService.getBlockerUserIds(userId)]);
    if ([...out, ...incoming].some(id => Number(id) === Number(activity.userId))) throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
}
module.exports = { assertShareAccess };
