/**
 * The single goal authorization policy. Keep existing update privacy until an
 * owner explicitly changes it. A shared activity has its own audience and does
 * not grant access to its source goal.
 */
function isGoalOwner(goal, viewerId) {
  return goal?.user_id != null && viewerId != null && String(goal.user_id) === String(viewerId);
}

function goalAccessPolicy(goal, viewerId, { blocked = false, ownerActive = true } = {}) {
  const isOwner = isGoalOwner(goal, viewerId);
  const canViewGoal = Boolean(goal) && (isOwner || (goal.is_public === true && !blocked && ownerActive));
  const canViewUpdates = canViewGoal && (isOwner || goal.is_updates_public === true);
  return {
    canViewGoal,
    canViewTimeline: canViewUpdates,
    canViewUpdates
  };
}

// Resolve relationship context for individual goal reads. Collection readers
// already filter blocked authors in batches and can use the pure policy above.
async function resolveGoalAccess(goal, viewerId) {
  const permissions = goalAccessPolicy(goal, viewerId);
  if (!goal || isGoalOwner(goal, viewerId)) return permissions;
  const [owner, outgoing, incoming] = await Promise.all([
    require('./pgUserService').getUserById(goal.user_id),
    viewerId != null ? require('./pgBlockService').getBlockedUserIds(viewerId) : [],
    viewerId != null ? require('./pgBlockService').getBlockerUserIds(viewerId) : []
  ]);
  return goalAccessPolicy(goal, viewerId, {
    ownerActive: Boolean(owner?.is_active),
    blocked: [...outgoing, ...incoming].some(id => String(id) === String(goal.user_id))
  });
}

module.exports = { goalAccessPolicy, resolveGoalAccess, isGoalOwner };
