const mongoose = require('mongoose');
const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const CommunityItem = require('../models/CommunityItem');
const CommunityParticipation = require('../models/CommunityParticipation');
const CommunityAnnouncement = require('../models/CommunityAnnouncement');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Habit = require('../models/Habit');

async function createCommunity(ownerId, payload) {
  const session = await mongoose.startSession();
  let created = null;
  await session.withTransaction(async () => {
    const requestedLimitRaw = parseInt(payload.memberLimit || '');
    const requestedLimit = isNaN(requestedLimitRaw) ? 1 : requestedLimitRaw;
    const memberLimit = Math.max(1, Math.min(100, requestedLimit));
    const doc = await Community.create([{
      name: payload.name,
      description: payload.description || '',
      ownerId,
      avatarUrl: payload.avatarUrl || '',
      bannerUrl: payload.bannerUrl || '',
      visibility: payload.visibility || 'public',
      interests: Array.isArray(payload.interests) ? payload.interests : [],
      settings: { memberLimit }
    }], { session });
    created = doc[0];
    await CommunityMember.create([{ communityId: created._id, userId: ownerId, role: 'admin', status: 'active' }], { session });
  });
  session.endSession();
  return created;
}

async function listMyCommunities(userId) {
  const memberships = await CommunityMember.find({ userId, status: 'active' }).select('communityId role').lean();
  const ids = memberships.map(m => m.communityId);
  const communities = await Community.find({ _id: { $in: ids }, isActive: true }).sort({ 'stats.memberCount': -1 });
  const roleById = new Map(memberships.map(m => [String(m.communityId), m.role]));
  return communities.map(c => ({ ...c.toObject(), role: roleById.get(String(c._id)) }));
}

async function discoverCommunities(userId, { interests = [], limit = 10 } = {}) {
  const q = { isActive: true, visibility: { $in: ['public', 'invite-only'] } };
  if (Array.isArray(interests) && interests.length > 0) {
    q.interests = { $in: interests };
  }
  const list = await Community.find(q).sort({ 'stats.memberCount': -1, createdAt: -1 }).limit(Math.min(50, limit));
  return list;
}

async function getCommunitySummary(communityId, userId) {
  const [community, membership] = await Promise.all([
    Community.findById(communityId),
    CommunityMember.findOne({ communityId, userId })
  ]);
  if (!community || !community.isActive) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  const role = membership?.role || null;
  const isMember = !!membership && membership.status === 'active';
  return { community, role, isMember };
}

async function updateCommunity(requesterId, communityId, payload) {
  const mem = await CommunityMember.findOne({ communityId, userId: requesterId, status: 'active' }).lean();
  if (!mem || !['admin','moderator'].includes(mem.role)) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  const community = await Community.findById(communityId).select('settings').lean();
  if (!community) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  const set = {};
  ['name','description','visibility'].forEach(k => {
    if (typeof payload[k] !== 'undefined') set[k] = payload[k];
  });
  // Enforce image change permission if toggled to admin-only
  const imagesRestricted = community?.settings?.onlyAdminsCanChangeImages !== false;
  if (typeof payload.avatarUrl !== 'undefined' || typeof payload.bannerUrl !== 'undefined') {
    if (imagesRestricted && mem.role !== 'admin') {
      throw Object.assign(new Error('Only admins can change images'), { statusCode: 403 });
    }
    if (typeof payload.avatarUrl !== 'undefined') set.avatarUrl = payload.avatarUrl;
    if (typeof payload.bannerUrl !== 'undefined') set.bannerUrl = payload.bannerUrl;
  }
  if (Array.isArray(payload.interests)) set.interests = payload.interests;
  if (payload.memberLimit !== undefined) {
    const requestedRaw = parseInt(payload.memberLimit || '');
    const requested = isNaN(requestedRaw) ? 1 : requestedRaw;
    set['settings.memberLimit'] = Math.max(1, Math.min(100, requested));
  }
  if (typeof payload.onlyAdminsCanAddItems !== 'undefined') {
    set['settings.onlyAdminsCanAddItems'] = !!payload.onlyAdminsCanAddItems;
  }
  if (typeof payload.allowContributions !== 'undefined') {
    set['settings.allowContributions'] = !!payload.allowContributions;
  }
  if (typeof payload.onlyAdminsCanAddGoals !== 'undefined') set['settings.onlyAdminsCanAddGoals'] = !!payload.onlyAdminsCanAddGoals;
  if (typeof payload.onlyAdminsCanAddHabits !== 'undefined') set['settings.onlyAdminsCanAddHabits'] = !!payload.onlyAdminsCanAddHabits;
  if (typeof payload.onlyAdminsCanChangeImages !== 'undefined') set['settings.onlyAdminsCanChangeImages'] = !!payload.onlyAdminsCanChangeImages;
  if (typeof payload.onlyAdminsCanAddMembers !== 'undefined') set['settings.onlyAdminsCanAddMembers'] = !!payload.onlyAdminsCanAddMembers;
  if (typeof payload.onlyAdminsCanRemoveMembers !== 'undefined') set['settings.onlyAdminsCanRemoveMembers'] = !!payload.onlyAdminsCanRemoveMembers;
  const updated = await Community.findByIdAndUpdate(communityId, { $set: set }, { new: true, runValidators: true });
  if (!updated) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  return updated;
}

async function getCommunityDashboard(communityId) {
  const community = await Community.findById(communityId).lean();
  if (!community || !community.isActive) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  // Simple aggregation placeholder; can be expanded later
  const stats = community.stats || { memberCount: 0, totalPoints: 0, weeklyActivityCount: 0, completionRate: 0 };
  const highlights = [];
  if ((stats.completionRate || 0) >= 75) highlights.push('Community hit 75% of shared goals this week 🎉');
  return { stats, highlights };
}

async function listCommunityItems(communityId) {
  const items = await CommunityItem.find({ communityId, status: 'approved', isActive: true }).sort({ 'stats.participantCount': -1, createdAt: -1 }).lean();
  return items;
}

async function listPendingItems(communityId, requesterId) {
  const mem = await CommunityMember.findOne({ communityId, userId: requesterId, status: 'active' }).lean();
  if (!mem || !['admin','moderator'].includes(mem.role)) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  return CommunityItem.find({ communityId, status: 'pending', isActive: true })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name avatar username')
    .lean();
}

async function suggestCommunityItem(communityId, userId, payload) {
  // Check policy: if onlyAdminsCanAddItems is false, suggestions auto-approve when policy allows anyone
  const community = await Community.findById(communityId).select('settings').lean();
  if (!community) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  const s = community.settings || {};
  const allowAnyoneGlobal = s.onlyAdminsCanAddItems === false;
  const allowAnyoneByType = (payload.type === 'goal')
    ? s.onlyAdminsCanAddGoals === false
    : s.onlyAdminsCanAddHabits === false;
  const allowAnyone = allowAnyoneGlobal || allowAnyoneByType;
  const item = new CommunityItem({
    communityId,
    type: payload.type,
    sourceId: payload.sourceId,
    title: payload.title || '',
    description: payload.description || '',
    createdBy: userId,
    status: allowAnyone ? 'approved' : 'pending'
  });
  await item.save();
  return item;
}

// Create new community-owned goal/habit from fields (fresh progress)
async function createCommunityOwnedItem(communityId, creatorId, payload) {
  const community = await Community.findById(communityId).select('settings').lean();
  if (!community) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  // Enforce admin-only toggle per type (or global)
  const s = community.settings || {};
  const restrictedGlobal = s.onlyAdminsCanAddItems !== false;
  const restrictedByType = (payload.type === 'goal')
    ? s.onlyAdminsCanAddGoals !== false
    : s.onlyAdminsCanAddHabits !== false;
  const restricted = restrictedGlobal && restrictedByType; // if either is open, allow
  if (restricted) {
    const mem = await CommunityMember.findOne({ communityId, userId: creatorId, status: 'active' }).lean();
    if (!mem || mem.role !== 'admin') {
      throw Object.assign(new Error('Only admins can add this item'), { statusCode: 403 });
    }
  }
  if (payload.type === 'goal') {
    // Create a minimal Goal document owned by a virtual community owner (store userId=creatorId to attribute)
    const g = new Goal({
      userId: creatorId,
      title: payload.title,
      description: payload.description || '',
      category: payload.category,
      priority: payload.priority || 'medium',
      duration: payload.duration || 'medium-term',
      targetDate: payload.targetDate || null,
      year: new Date().getFullYear(),
      isPublic: true,
      isActive: true,
    });
    await g.save();
    const participationType = payload.participationType === 'collaborative' ? 'collaborative' : 'individual';
    const item = new CommunityItem({ communityId, type: 'goal', participationType, sourceId: g._id, title: g.title, description: g.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    // Auto-join creator so it appears in their dashboard
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'goal', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    return item;
  } else {
    const h = new Habit({
      userId: creatorId,
      name: payload.title,
      description: payload.description || '',
      frequency: payload.frequency || 'daily',
      daysOfWeek: Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : undefined,
      timezone: payload.timezone || 'UTC',
      reminders: Array.isArray(payload.reminders) ? payload.reminders : [],
      isPublic: true,
      isActive: true,
    });
    await h.save();
    const item = new CommunityItem({ communityId, type: 'habit', participationType: 'individual', sourceId: h._id, title: h.name, description: h.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'habit', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    return item;
  }
}

// Copy content from a personal goal/habit into a fresh community-owned copy (no progress)
async function copyFromPersonalToCommunity(communityId, creatorId, { type, sourceId, participationType }) {
  const community = await Community.findById(communityId).select('settings').lean();
  if (!community) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  const s = community.settings || {};
  const restrictedGlobal = s.onlyAdminsCanAddItems !== false;
  const restrictedByType = (type === 'goal')
    ? s.onlyAdminsCanAddGoals !== false
    : s.onlyAdminsCanAddHabits !== false;
  const restricted = restrictedGlobal && restrictedByType;
  if (restricted) {
    const mem = await CommunityMember.findOne({ communityId, userId: creatorId, status: 'active' }).lean();
    if (!mem || mem.role !== 'admin') {
      throw Object.assign(new Error('Only admins can add this item'), { statusCode: 403 });
    }
  }
  if (type === 'goal') {
    const src = await Goal.findById(sourceId).lean();
    if (!src) throw Object.assign(new Error('Source goal not found'), { statusCode: 404 });
    const g = new Goal({
      userId: creatorId,
      title: src.title,
      description: src.description || '',
      category: src.category,
      priority: src.priority || 'medium',
      duration: src.duration || 'medium-term',
      targetDate: null,
      year: new Date().getFullYear(),
      isPublic: true,
      isActive: true,
    });
    await g.save();
    const pType = participationType === 'collaborative' ? 'collaborative' : 'individual';
    const item = new CommunityItem({ communityId, type: 'goal', participationType: pType, sourceId: g._id, title: g.title, description: g.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'goal', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    return item;
  } else {
    const src = await Habit.findById(sourceId).lean();
    if (!src) throw Object.assign(new Error('Source habit not found'), { statusCode: 404 });
    const h = new Habit({
      userId: creatorId,
      name: src.name,
      description: src.description || '',
      frequency: src.frequency || 'daily',
      daysOfWeek: Array.isArray(src.daysOfWeek) ? src.daysOfWeek : undefined,
      timezone: src.timezone || 'UTC',
      reminders: Array.isArray(src.reminders) ? src.reminders : [],
      isPublic: true,
      isActive: true,
    });
    await h.save();
    const item = new CommunityItem({ communityId, type: 'habit', participationType: 'individual', sourceId: h._id, title: h.name, description: h.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'habit', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    return item;
  }
}

async function approveCommunityItem(communityId, itemId, approverId, approve = true) {
  // Only admins/moderators may approve
  const mem = await CommunityMember.findOne({ communityId, userId: approverId, status: 'active' }).lean();
  if (!mem || !['admin','moderator'].includes(mem.role)) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  const status = approve ? 'approved' : 'rejected';
  const updated = await CommunityItem.findOneAndUpdate(
    { _id: itemId, communityId },
    { $set: { status, approverId, approvedAt: approve ? new Date() : null } },
    { new: true }
  );
  return updated;
}

async function joinItem(userId, communityId, itemId) {
  const item = await CommunityItem.findOne({ _id: itemId, communityId, status: 'approved', isActive: true });
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  const doc = await CommunityParticipation.findOneAndUpdate(
    { communityId, itemId, userId },
    { $setOnInsert: { type: item.type, progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
    { new: true, upsert: true }
  );
  await CommunityItem.updateOne({ _id: itemId }, { $inc: { 'stats.participantCount': 1 } });
  return doc;
}

async function leaveItem(userId, communityId, itemId) {
  const existing = await CommunityParticipation.findOne({ communityId, itemId, userId, status: 'joined' });
  if (!existing) return { ok: true };
  await CommunityParticipation.updateOne({ _id: existing._id }, { $set: { status: 'left' } });
  await CommunityItem.updateOne({ _id: itemId }, { $inc: { 'stats.participantCount': -1 } });
  return { ok: true };
}

async function removeCommunityItem(communityId, itemId, requesterId) {
  const [mem, item] = await Promise.all([
    CommunityMember.findOne({ communityId, userId: requesterId, status: 'active' }).lean(),
    CommunityItem.findOne({ _id: itemId, communityId, isActive: true })
  ]);
  if (!item) return { ok: true };
  const isAdmin = !!mem && mem.role === 'admin';
  const isCreator = String(item.createdBy) === String(requesterId);
  if (!isAdmin && !isCreator) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  await CommunityItem.updateOne({ _id: itemId }, { $set: { isActive: false, status: 'rejected' } });
  await CommunityParticipation.updateMany({ communityId, itemId }, { $set: { status: 'left' } });
  return { ok: true };
}

async function getItemProgress(userId, communityId, itemId) {
  const item = await CommunityItem.findOne({ _id: itemId, communityId, status: 'approved', isActive: true }).lean();
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  let personal = 0;
  if (item.type === 'goal') {
    const g = await Goal.findById(item.sourceId).select('completed subGoals habitLinks').lean();
    if (g) {
      // For individual: personal progress; collaborative: contributions are aggregated below
      if (item.participationType !== 'collaborative') {
        if (g.completed) personal = 100; else {
          const total = (g.subGoals?.length || 0) + (g.habitLinks?.length || 0) || 1;
          const done = (g.subGoals || []).filter(s => s.completed).length;
          personal = Math.round((done / total) * 100);
        }
      }
    }
  } else {
    const h = await Habit.findById(item.sourceId).select('currentStreak longestStreak').lean();
    if (h) {
      const denom = Math.max(1, h.longestStreak || 1);
      personal = Math.min(100, Math.round(((h.currentStreak || 0) / denom) * 100));
    }
  }
  const participants = await CommunityParticipation.find({ communityId, itemId, status: 'joined' }).select('progressPercent').lean();
  let communityProgress = 0;
  if (item.type === 'goal' && item.participationType === 'collaborative') {
    // Aggregate contributions for collaborative goals (cap at 100)
    const sum = participants.reduce((s, p) => s + (p.progressPercent || 0), 0);
    communityProgress = Math.min(100, Math.round(sum));
  } else {
    // Average for individual items
    communityProgress = participants.length === 0 ? 0 : Math.round(participants.reduce((s, p) => s + (p.progressPercent || 0), 0) / participants.length);
  }
  // Persist personal snapshot (for collaborative, this records user's contribution)
  await CommunityParticipation.updateOne({ communityId, itemId, userId }, { $set: { progressPercent: personal, lastUpdatedAt: new Date() } }, { upsert: true });
  return { personal, community: communityProgress };
}

async function listMyJoinedItems(userId) {
  const parts = await CommunityParticipation.find({ userId, status: 'joined' }).select('communityId itemId type progressPercent').lean();
  if (parts.length === 0) return [];
  const itemIds = parts.map(p => p.itemId);
  const items = await CommunityItem.find({ _id: { $in: itemIds }, isActive: true, status: 'approved' }).select('communityId type participationType title description stats').lean();
  const itemById = new Map(items.map(i => [String(i._id), i]));
  const communityIds = Array.from(new Set(items.map(i => String(i.communityId))));
  const communities = await Community.find({ _id: { $in: communityIds }, isActive: true }).select('name visibility').lean();
  const communityById = new Map(communities.map(c => [String(c._id), c]));
  return parts.map(p => {
    const item = itemById.get(String(p.itemId));
    const community = item ? communityById.get(String(item.communityId)) : null;
    if (!item || !community) return null;
    return {
      _id: String(p.itemId),
      communityId: String(item.communityId),
      communityName: community.name,
      type: item.type,
      participationType: item.participationType || 'individual',
      title: item.title,
      description: item.description,
      stats: item.stats || {},
      personalPercent: p.progressPercent || 0
    };
  }).filter(Boolean);
}

async function joinCommunity(userId, communityId) {
  const community = await Community.findById(communityId);
  if (!community || !community.isActive) throw Object.assign(new Error('Community not found'), { statusCode: 404 });
  // Enforce community member limit 1..100
  const effectiveCap = Math.max(1, Math.min(100, community.settings?.memberLimit || 1));
  if ((community.stats?.memberCount || 0) >= effectiveCap) {
    throw Object.assign(new Error('Community member limit reached'), { statusCode: 400 });
  }
  const existing = await CommunityMember.findOne({ communityId, userId });
  if (existing && existing.status === 'active') return existing;
  const requiresApproval = community.visibility !== 'public' || community.settings?.membershipApprovalRequired;
  const status = requiresApproval ? 'pending' : 'active';
  const role = 'member';
  const membership = existing
    ? await CommunityMember.findByIdAndUpdate(existing._id, { $set: { status, role } }, { new: true })
    : await CommunityMember.create({ communityId, userId, role, status });
  if (status === 'active') {
    await Community.updateOne({ _id: communityId }, { $inc: { 'stats.memberCount': 1 } });
  }
  return membership;
}

async function listPendingMembers(communityId, requesterId) {
  const [mem, community] = await Promise.all([
    CommunityMember.findOne({ communityId, userId: requesterId, status: 'active' }).lean(),
    Community.findById(communityId).select('settings').lean()
  ]);
  if (!mem) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  const restrict = community?.settings?.onlyAdminsCanAddMembers !== false;
  // If restricted, only admin may view pending; else any active member may view
  if (restrict && mem.role !== 'admin') {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  return CommunityMember.find({ communityId, status: 'pending' }).populate('userId', 'name avatar username');
}

async function decideMembership(communityId, targetUserId, approverId, approve = true) {
  const [mem, community] = await Promise.all([
    CommunityMember.findOne({ communityId, userId: approverId, status: 'active' }).lean(),
    Community.findById(communityId).select('settings').lean()
  ]);
  if (!mem) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  const restrict = community?.settings?.onlyAdminsCanAddMembers !== false;
  if ((restrict && mem.role !== 'admin') || (!restrict && !['admin','moderator'].includes(mem.role))) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  const updated = await CommunityMember.findOneAndUpdate(
    { communityId, userId: targetUserId, status: 'pending' },
    { $set: { status: approve ? 'active' : 'rejected' } },
    { new: true }
  );
  if (approve && updated) {
    await Community.updateOne({ _id: communityId }, { $inc: { 'stats.memberCount': 1 } });
  }
  return updated;
}

async function leaveCommunity(userId, communityId) {
  const mem = await CommunityMember.findOne({ communityId, userId, status: 'active' });
  if (!mem) return { ok: true };
  await CommunityMember.updateOne({ _id: mem._id }, { $set: { status: 'removed' } });
  await Community.updateOne({ _id: communityId }, { $inc: { 'stats.memberCount': -1 } });
  return { ok: true };
}

async function listMembers(communityId) {
  const members = await CommunityMember.find({ communityId, status: 'active' })
    .populate('userId', 'name avatar currentStreak longestStreak totalPoints')
    .sort({ role: 1, 'userId.totalPoints': -1 })
    .lean();
  return members.map(m => ({
    _id: m._id,
    role: m.role,
    contributionPoints: m.contributionPoints,
    currentStreak: m.currentStreak,
    longestStreak: m.longestStreak,
    user: m.userId
  }));
}

async function getFeed(communityId, { limit = 20 } = {}) {
  // For now reuse Activity model; later, can scope to community-specific events
  const items = await Activity.find({ isActive: true, isPublic: true })
    .sort({ createdAt: -1 })
    .limit(Math.min(50, limit))
    .populate('userId', 'name avatar level')
    .lean();
  return items;
}

async function deleteCommunity(communityId) {
  const c = await Community.findById(communityId);
  if (!c) return false;
  await Community.updateOne({ _id: communityId }, { $set: { isActive: false } });
  return true;
}

module.exports = {
  createCommunity,
  listMyCommunities,
  discoverCommunities,
  getCommunitySummary,
  getCommunityDashboard,
  listCommunityItems,
  listPendingItems,
  suggestCommunityItem,
  approveCommunityItem,
  createCommunityOwnedItem,
  copyFromPersonalToCommunity,
  joinItem,
  leaveItem,
  getItemProgress,
  joinCommunity,
  leaveCommunity,
  updateCommunity,
  listPendingMembers,
  decideMembership,
  listMembers,
  getFeed,
  deleteCommunity,
  listMyJoinedItems,
  removeCommunityItem,
};


