const mongoose = require('mongoose');
const Community = require('../models/Community');
const CommunityMember = require('../models/CommunityMember');
const CommunityItem = require('../models/CommunityItem');
const CommunityParticipation = require('../models/CommunityParticipation');
const CommunityAnnouncement = require('../models/CommunityAnnouncement');
const Activity = require('../models/Activity');
const ChatMessage = require('../models/ChatMessage');
const CommunityActivity = require('../models/CommunityActivity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const goalDivisionService = require('./goalDivisionService');

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

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysKey = toDateKeyUTC(sevenDaysAgo);

  // Community points: sum of points from completed personal goals linked to this community
  const pointsAgg = await Goal.aggregate([
    { $match: { 'communityInfo.communityId': community._id, isActive: true, completed: true } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$pointsEarned', 0] } } } },
    { $project: { _id: 0, total: 1 } }
  ]);
  const totalPoints = (pointsAgg[0]?.total) || 0;

  // Weekly activity: goal completions last 7 days + habit 'done' logs for habits linked to this community last 7 days
  const weeklyGoalCount = await Goal.countDocuments({ 'communityInfo.communityId': community._id, completed: true, completedAt: { $gte: sevenDaysAgo } });
  const personalHabits = await Habit.find({ 'communityInfo.communityId': community._id, isActive: true }).select('_id').lean();
  const habitIds = personalHabits.map(h => h._id);
  const weeklyHabitDone = habitIds.length > 0
    ? await HabitLog.countDocuments({ habitId: { $in: habitIds }, status: 'done', dateKey: { $gte: sevenDaysKey } })
    : 0;
  const weeklyActivityCount = weeklyGoalCount + weeklyHabitDone;

  // Completion rate: fraction of completed personal goals linked to this community (all-time)
  const totalCommunityGoals = await Goal.countDocuments({ 'communityInfo.communityId': community._id, isActive: true });
  const completedCommunityGoals = totalCommunityGoals > 0
    ? await Goal.countDocuments({ 'communityInfo.communityId': community._id, isActive: true, completed: true })
    : 0;
  const completionRate = totalCommunityGoals === 0 ? 0 : Math.min(100, Math.round((completedCommunityGoals / totalCommunityGoals) * 100));

  const memberCount = community?.stats?.memberCount || 0;

  const stats = { memberCount, totalPoints, weeklyActivityCount, completionRate };
  const highlights = [];
  if ((stats.completionRate || 0) >= 75) highlights.push('Community hit 75% of shared goals 🎉');
  if (weeklyActivityCount >= 50) highlights.push('High activity this week!');
  return { stats, highlights };
}

// Helpers for weekly bucketing (ISO week starting Monday in UTC)
function startOfWeekUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function toDateKeyUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  return d.toISOString().split('T')[0];
}

async function getCommunityAnalytics(communityId, { weeks = 12 } = {}) {
  const community = await Community.findById(communityId).lean();
  if (!community || !community.isActive) throw Object.assign(new Error('Community not found'), { statusCode: 404 });

  const items = await CommunityItem.find({ communityId, status: 'approved', isActive: true })
    .select('_id type sourceId participationType title')
    .lean();
  const itemIds = items.map(i => i._id);
  const goalItems = items.filter(i => i.type === 'goal');
  const habitItems = items.filter(i => i.type === 'habit');

  const parts = await CommunityParticipation.find({ communityId, status: 'joined' })
    .select('userId itemId type progressPercent')
    .lean();
  const uniqueParticipants = new Set(parts.map(p => String(p.userId)));
  const goalParticipants = new Set(parts.filter(p => p.type === 'goal').map(p => String(p.userId)));
  const habitParticipants = new Set(parts.filter(p => p.type === 'habit').map(p => String(p.userId)));

  // Time window: last N weeks
  const cappedWeeks = Math.max(1, Math.min(52, parseInt(weeks) || 12));
  const now = new Date();
  const thisWeekStart = startOfWeekUTC(now);
  const oldest = new Date(thisWeekStart);
  oldest.setUTCDate(oldest.getUTCDate() - (cappedWeeks - 1) * 7);
  const oldestKey = toDateKeyUTC(oldest);

  // Goals: completions linked to this community
  const goalMatch = { 'communityInfo.communityId': community._id, completed: true, completedAt: { $gte: oldest }, isActive: true };
  const completedGoals = await Goal.find(goalMatch).select('completedAt userId pointsEarned').lean();

  // Habits: personal copies linked to this community, then logs in range
  const personalHabits = await Habit.find({ 'communityInfo.communityId': community._id, isActive: true })
    .select('_id userId currentStreak longestStreak lastLoggedDateKey')
    .lean();
  const habitIds = personalHabits.map(h => h._id);
  let habitLogs = [];
  if (habitIds.length > 0) {
    habitLogs = await HabitLog.find({ habitId: { $in: habitIds }, status: 'done', dateKey: { $gte: oldestKey } })
      .select('dateKey habitId userId')
      .lean();
  }

  // Build weekly bins
  const bins = [];
  for (let i = cappedWeeks - 1; i >= 0; i--) {
    const d = new Date(thisWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = toDateKeyUTC(d);
    bins.push({ weekStart: key, count: 0 });
  }
  const idxByKey = new Map(bins.map((b, i) => [b.weekStart, i]));

  // Tally goal completions per week
  for (const g of completedGoals) {
    const wk = startOfWeekUTC(g.completedAt);
    const key = toDateKeyUTC(wk);
    const idx = idxByKey.get(key);
    if (idx != null) bins[idx].count += 1;
  }
  // Tally habit 'done' logs per week
  for (const l of habitLogs) {
    const d = new Date(l.dateKey + 'T00:00:00.000Z');
    const wk = startOfWeekUTC(d);
    const key = toDateKeyUTC(wk);
    const idx = idxByKey.get(key);
    if (idx != null) bins[idx].count += 1;
  }

  // Today activity snapshot
  const todayKey = toDateKeyUTC(new Date());
  const todaysHabitUserSet = new Set(habitLogs.filter(l => l.dateKey === todayKey).map(l => String(l.userId)));
  const completedGoalsTotal = completedGoals.length;

  // Leaderboard (last N weeks): points = goal points + habit done count
  const userPoints = new Map();
  for (const g of completedGoals) {
    const k = String(g.userId);
    const curr = userPoints.get(k) || { points: 0, goalCompletions: 0, habitDones: 0 };
    // Points are from community-linked goal completions only
    curr.points += Math.max(0, g.pointsEarned || 0);
    curr.goalCompletions += 1;
    userPoints.set(k, curr);
  }
  for (const l of habitLogs) {
    const k = String(l.userId);
    const curr = userPoints.get(k) || { points: 0, goalCompletions: 0, habitDones: 0 };
    // Track habit activity separately, but do not add to points
    curr.habitDones += 1;
    userPoints.set(k, curr);
  }
  const userIds = Array.from(userPoints.keys()).map(id => new mongoose.Types.ObjectId(id));
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } }).select('name username avatar').lean()
    : [];
  const userById = new Map(users.map(u => [String(u._id), u]));
  const topContributors = Array.from(userPoints.entries())
    .map(([userId, v]) => ({
      userId,
      user: userById.get(userId) || null,
      points: v.points,
      goalCompletions: v.goalCompletions,
      habitDones: v.habitDones
    }))
    .sort((a,b) => b.points - a.points)
    .slice(0, 10);

  return {
    totals: {
      members: community?.stats?.memberCount || 0,
      items: { goals: goalItems.length, habits: habitItems.length },
      participants: uniqueParticipants.size,
      goals: { completedInPeriod: completedGoalsTotal },
      habits: { activeToday: todaysHabitUserSet.size }
    },
    series: {
      weeklyActivity: bins
    },
    leaderboard: {
      topContributors
    },
    snapshot: {
      goals: { items: goalItems.length, participants: goalParticipants.size },
      habits: { items: habitItems.length, participants: habitParticipants.size }
    }
  };
}

async function listCommunityItems(communityId) {
  const items = await CommunityItem.find({ communityId, status: 'approved', isActive: true })
    .sort({ 'stats.participantCount': -1, createdAt: -1 })
    .select('communityId type participationType title description stats sourceId createdBy')
    .lean();
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
  // Mirror addition immediately if auto-approved
  if (item.status === 'approved') {
    try {
      const u = await User.findById(userId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_item_added',
        data: payload.type === 'goal'
          ? { goalId: item.sourceId, goalTitle: item.title }
          : { metadata: { habitId: item.sourceId, habitName: item.title } }
      });
    } catch (_) {}
  }
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
    // Create a minimal Goal document as community source (not owned by user to avoid appearing in personal goals)
    const g = new Goal({
      userId: creatorId, // Keep for attribution but mark as community-only
      title: payload.title,
      description: payload.description || '',
      category: 'Other', // Use valid enum value for source goals
      priority: payload.priority || 'medium',
      duration: payload.duration || 'medium-term',
      targetDate: payload.targetDate || null,
      year: new Date().getFullYear(),
      isPublic: true,
      isActive: true,
      isCommunitySource: true, // Flag to identify this as a community source goal
      originalCategory: payload.category || 'Other', // Store original category for personal copies
    });
    await g.save();
    const participationType = payload.participationType === 'collaborative' ? 'collaborative' : 'individual';
    const item = new CommunityItem({ communityId, type: 'goal', participationType, sourceId: g._id, title: g.title, description: g.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    // Auto-join creator so it appears in their dashboard
    const existingParticipation = await CommunityParticipation.findOne({ communityId, itemId: item._id, userId: creatorId });
    const wasAlreadyJoined = existingParticipation && existingParticipation.status === 'joined';
    
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'goal', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    
    // Increment participant count if not already joined
    if (!wasAlreadyJoined) {
      await CommunityItem.updateOne({ _id: item._id }, { $inc: { 'stats.participantCount': 1 } });
    }
    
    // Create personal copy for creator so it appears in Community goals section
    try {
      const personalGoal = new Goal({
        userId: creatorId,
        title: g.title,
        description: g.description || '',
        category: payload.category || 'Other', // Use the original category they selected
        priority: g.priority || 'medium',
        duration: g.duration || 'medium-term',
        targetDate: g.targetDate || null,
        year: new Date().getFullYear(),
        isPublic: false, // Personal copy should be private by default
        isActive: true,
        communityInfo: {
          communityId,
          itemId: item._id,
          sourceId: g._id
        }
      });
      await personalGoal.save();
    } catch (err) {
      console.error('Error creating personal copy for creator:', err);
    }
    
    // Mirror community addition update
    try {
      const u = await User.findById(creatorId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId: creatorId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_item_added',
        data: { goalId: g._id, goalTitle: g.title }
      });
    } catch (_) {}
    return item;
  } else {
    // Create community source habit (hidden from personal dashboard)
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
      isCommunitySource: true, // Flag to hide from personal habits
    });
    await h.save();
    const item = new CommunityItem({ communityId, type: 'habit', participationType: 'individual', sourceId: h._id, title: h.name, description: h.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    
    // Auto-join creator so it appears in their dashboard  
    const existingParticipationCopy = await CommunityParticipation.findOne({ communityId, itemId: item._id, userId: creatorId });
    const wasAlreadyJoinedCopy = existingParticipationCopy && existingParticipationCopy.status === 'joined';
    
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'habit', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    
    // Increment participant count if not already joined
    if (!wasAlreadyJoinedCopy) {
      await CommunityItem.updateOne({ _id: item._id }, { $inc: { 'stats.participantCount': 1 } });
    }
    
    // Create personal copy for creator so it appears in Community habits section
    try {
      const personalHabit = new Habit({
        userId: creatorId,
        name: h.name,
        description: h.description || '',
        frequency: h.frequency || 'daily',
        daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek : undefined,
        timezone: h.timezone || 'UTC',
        reminders: Array.isArray(h.reminders) ? h.reminders : [],
        isPublic: false, // Personal copy should be private by default
        isActive: true,
        communityInfo: {
          communityId,
          itemId: item._id,
          sourceId: h._id
        }
      });
      await personalHabit.save();
    } catch (err) {
      console.error('Error creating personal habit copy for creator:', err);
    }
    
    // Mirror community addition update
    try {
      const u = await User.findById(creatorId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId: creatorId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_item_added',
        data: { metadata: { habitId: h._id, habitName: h.name } }
      });
    } catch (_) {}
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
      category: 'Other', // Use valid enum value for source goals
      priority: src.priority || 'medium',
      duration: src.duration || 'medium-term',
      targetDate: null,
      year: new Date().getFullYear(),
      isPublic: true,
      isActive: true,
      isCommunitySource: true, // Flag to identify this as a community source goal
      originalCategory: src.category || 'Other', // Store original category for personal copies
    });
    await g.save();
    const pType = participationType === 'collaborative' ? 'collaborative' : 'individual';
    const item = new CommunityItem({ communityId, type: 'goal', participationType: pType, sourceId: g._id, title: g.title, description: g.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    // Auto-join creator for copyFromPersonalToCommunity
    const existingParticipationCopy = await CommunityParticipation.findOne({ communityId, itemId: item._id, userId: creatorId });
    const wasAlreadyJoinedCopy = existingParticipationCopy && existingParticipationCopy.status === 'joined';
    
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'goal', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    
    // Increment participant count if not already joined
    if (!wasAlreadyJoinedCopy) {
      await CommunityItem.updateOne({ _id: item._id }, { $inc: { 'stats.participantCount': 1 } });
    }
    
    // Create personal copy for creator so it appears in Community goals section
    try {
      const personalGoal = new Goal({
        userId: creatorId,
        title: g.title,
        description: g.description || '',
        category: src.category || 'Other', // Use the original category from source goal
        priority: g.priority || 'medium',
        duration: g.duration || 'medium-term',
        targetDate: null,
        year: new Date().getFullYear(),
        isPublic: false, // Personal copy should be private by default
        isActive: true,
        communityInfo: {
          communityId,
          itemId: item._id,
          sourceId: g._id
        }
      });
      await personalGoal.save();
    } catch (err) {
      console.error('Error creating personal copy for creator:', err);
    }
    
    // Mirror community addition update
    try {
      const u = await User.findById(creatorId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId: creatorId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_item_added',
        data: { goalId: g._id, goalTitle: g.title }
      });
    } catch (_) {}
    return item;
  } else {
    const src = await Habit.findById(sourceId).lean();
    if (!src) throw Object.assign(new Error('Source habit not found'), { statusCode: 404 });
    
    // Create community source habit (hidden from personal dashboard)
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
      isCommunitySource: true, // Flag to hide from personal habits
    });
    await h.save();
    const item = new CommunityItem({ communityId, type: 'habit', participationType: 'individual', sourceId: h._id, title: h.name, description: h.description, createdBy: creatorId, status: 'approved' });
    await item.save();
    
    // Auto-join creator so it appears in their dashboard  
    const existingParticipationCopy = await CommunityParticipation.findOne({ communityId, itemId: item._id, userId: creatorId });
    const wasAlreadyJoinedCopy = existingParticipationCopy && existingParticipationCopy.status === 'joined';
    
    await CommunityParticipation.updateOne(
      { communityId, itemId: item._id, userId: creatorId },
    { $setOnInsert: { type: 'habit', progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
      { upsert: true }
    );
    
    // Increment participant count if not already joined
    if (!wasAlreadyJoinedCopy) {
      await CommunityItem.updateOne({ _id: item._id }, { $inc: { 'stats.participantCount': 1 } });
    }
    
    // Create personal copy for creator so it appears in Community habits section
    try {
      const personalHabit = new Habit({
        userId: creatorId,
        name: h.name,
        description: h.description || '',
        frequency: h.frequency || 'daily',
        daysOfWeek: Array.isArray(h.daysOfWeek) ? h.daysOfWeek : undefined,
        timezone: h.timezone || 'UTC',
        reminders: Array.isArray(h.reminders) ? h.reminders : [],
        isPublic: false, // Personal copy should be private by default
        isActive: true,
        communityInfo: {
          communityId,
          itemId: item._id,
          sourceId: h._id
        }
      });
      await personalHabit.save();
    } catch (err) {
      console.error('Error creating personal habit copy for creator:', err);
    }
    
    // Mirror community addition update
    try {
      const u = await User.findById(creatorId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId: creatorId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_item_added',
        data: { metadata: { habitId: h._id, habitName: h.name } }
      });
    } catch (_) {}
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
  // Mirror addition if approved now
  if (updated && status === 'approved') {
    try {
      const creator = await User.findById(updated.createdBy).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId: updated.createdBy,
        name: creator?.name,
        avatar: creator?.avatar,
        type: 'community_item_added',
        data: updated.type === 'goal'
          ? { goalId: updated.sourceId, goalTitle: updated.title }
          : { metadata: { habitId: updated.sourceId, habitName: updated.title } }
      });
    } catch (_) {}
  }
  return updated;
}

async function joinItem(userId, communityId, itemId) {
  const item = await CommunityItem.findOne({ _id: itemId, communityId, status: 'approved', isActive: true }).lean();
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  
  // Check if already joined to avoid duplicate increment
  const existing = await CommunityParticipation.findOne({ communityId, itemId, userId });
  const wasAlreadyJoined = existing && existing.status === 'joined';
  
  const doc = await CommunityParticipation.findOneAndUpdate(
    { communityId, itemId, userId },
    { $setOnInsert: { type: item.type, progressPercent: 0, lastUpdatedAt: new Date() }, $set: { status: 'joined' } },
    { new: true, upsert: true }
  );
  
  // Only increment if not already joined
  if (!wasAlreadyJoined) {
    await CommunityItem.updateOne({ _id: itemId }, { $inc: { 'stats.participantCount': 1 } });
  }
  
  // Create personal copy of the goal/habit in user's dashboard
  try {
    if (item.type === 'goal') {
      // Get the source goal details
      const sourceGoal = await Goal.findById(item.sourceId).lean();
      if (sourceGoal) {
        // Check if user already has this goal (by communityInfo match)
        const existingPersonalGoal = await Goal.findOne({ 
          userId, 
          'communityInfo.communityId': communityId,
          'communityInfo.itemId': itemId,
          isActive: true 
        });
        
        if (!existingPersonalGoal) {
          // Create personal copy
          const personalGoal = new Goal({
            userId,
            title: sourceGoal.title,
            description: sourceGoal.description || '',
            category: sourceGoal.originalCategory || sourceGoal.category || 'Other', // Use original category if available
            priority: sourceGoal.priority || 'medium',
            duration: sourceGoal.duration || 'medium-term',
            targetDate: sourceGoal.targetDate || null,
            year: new Date().getFullYear(),
            isPublic: false, // Personal copy should be private by default
            isActive: true,
            communityInfo: {
              communityId,
              itemId,
              sourceId: item.sourceId
            }
          });
          await personalGoal.save();
        }
      }
    } else if (item.type === 'habit') {
      // Get the source habit details
      const sourceHabit = await Habit.findById(item.sourceId).lean();
      if (sourceHabit) {
        // Check if user already has this habit (by communityInfo match)
        const existingPersonalHabit = await Habit.findOne({ 
          userId, 
          'communityInfo.communityId': communityId,
          'communityInfo.itemId': itemId,
          isActive: true 
        });
        
        if (!existingPersonalHabit) {
          // Create personal copy
          const personalHabit = new Habit({
            userId,
            name: sourceHabit.name,
            description: sourceHabit.description || '',
            frequency: sourceHabit.frequency || 'daily',
            daysOfWeek: Array.isArray(sourceHabit.daysOfWeek) ? sourceHabit.daysOfWeek : undefined,
            timezone: sourceHabit.timezone || 'UTC',
            reminders: Array.isArray(sourceHabit.reminders) ? sourceHabit.reminders : [],
            isPublic: false, // Personal copy should be private by default
            isActive: true,
            communityInfo: {
              communityId,
              itemId,
              sourceId: item.sourceId
            }
          });
          await personalHabit.save();
        }
      }
    }
  } catch (err) {
    console.error('Error creating personal copy:', err);
    // Don't fail the join operation if personal copy creation fails
  }
  
  // Create community activity mirror only
  try {
    const u = await User.findById(userId).select('name avatar').lean();
    await CommunityActivity.create({
      communityId,
      userId,
      name: u?.name,
      avatar: u?.avatar,
      type: 'goal_joined',
      data: {
        goalId: item.type === 'goal' ? item.sourceId : undefined,
        goalTitle: item.title,
        metadata: item.type === 'habit' ? { habitId: item.sourceId, habitName: item.title } : undefined
      }
    });
  } catch (_) {}
  return { 
    success: true, 
    joined: true,
    itemId: String(itemId),
    communityId: String(communityId),
    participation: doc 
  };
}

async function leaveItem(userId, communityId, itemId, options = {}) {
  const existing = await CommunityParticipation.findOne({ communityId, itemId, userId, status: 'joined' });
  if (!existing) return { 
    success: true, 
    joined: false,
    itemId: String(itemId),
    communityId: String(communityId),
    message: 'User was not joined to this item' 
  };
  
  const item = await CommunityItem.findOne({ _id: itemId, communityId }).lean();
  if (!item) return { ok: true };

  // Handle personal copy based on user's choice
  if (options.deletePersonalCopy) {
    // Delete the personal copy from user's dashboard completely
    try {
      if (item.type === 'goal') {
        await Goal.findOneAndDelete({
          userId, 
          'communityInfo.communityId': communityId,
          'communityInfo.itemId': itemId
        });
      } else if (item.type === 'habit') {
        await Habit.findOneAndDelete({
          userId, 
          'communityInfo.communityId': communityId,
          'communityInfo.itemId': itemId
        });
      }
    } catch (err) {
      console.error('Error deleting personal copy:', err);
    }
  } else if (options.transferToPersonal !== false) {
    // Transfer to personal goals/habits (remove community info)
    try {
      if (item.type === 'goal') {
        await Goal.findOneAndUpdate(
          { 
            userId, 
            'communityInfo.communityId': communityId,
            'communityInfo.itemId': itemId
          },
          { 
            $unset: { communityInfo: 1 },
            category: 'Other',
            isPublic: true
          }
        );
      } else if (item.type === 'habit') {
        await Habit.findOneAndUpdate(
          { 
            userId, 
            'communityInfo.communityId': communityId,
            'communityInfo.itemId': itemId
          },
          { 
            $unset: { communityInfo: 1 }
          }
        );
      }
    } catch (err) {
      console.error('Error transferring to personal:', err);
    }
  }

  await CommunityParticipation.updateOne({ _id: existing._id }, { $set: { status: 'left' } });
  await CommunityItem.updateOne({ _id: itemId }, { $inc: { 'stats.participantCount': -1 } });
  
  // Create community activity
  try {
    const u = await User.findById(userId).select('name avatar').lean();
    await CommunityActivity.create({
      communityId,
      userId,
      name: u?.name,
      avatar: u?.avatar,
      type: 'goal_left',
      data: {
        goalId: item.type === 'goal' ? item.sourceId : undefined,
        goalTitle: item.title,
        metadata: item.type === 'habit' ? { habitId: item.sourceId, habitName: item.title } : undefined
      }
    });
  } catch (_) {}
  
  return { 
    success: true, 
    joined: false,
    itemId: String(itemId),
    communityId: String(communityId) 
  };
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
  // Mark all participants as left
  await CommunityParticipation.updateMany({ communityId, itemId }, { $set: { status: 'left' } });
  // Optional: notify participants? Out of scope
  return { ok: true };
}

async function getItemProgress(userId, communityId, itemId) {
  const item = await CommunityItem.findOne({ _id: itemId, communityId, status: 'approved', isActive: true }).lean();
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  let personal = 0;
  if (item.type === 'goal') {
    // Prefer the user's personal copy for accurate progress
    const personalGoal = await Goal.findOne({ userId, 'communityInfo.communityId': communityId, 'communityInfo.itemId': itemId, isActive: true })
      .select('_id completed')
      .lean();
    if (personalGoal) {
      if (personalGoal.completed) personal = 100;
      else {
        try {
          const prog = await goalDivisionService.computeGoalProgress(personalGoal._id, userId);
          personal = Math.max(0, Math.min(100, Math.round(prog?.percent || 0)));
        } catch (_) { personal = 0; }
      }
    } else {
      // Fallback: estimate from source structure
      const g = await Goal.findById(item.sourceId).select('completed subGoals habitLinks').lean();
      if (g) {
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

async function getItemAnalytics(communityId, itemId, { days = 30 } = {}) {
  const item = await CommunityItem.findOne({ _id: itemId, communityId, status: 'approved', isActive: true }).lean();
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });

  const parts = await CommunityParticipation.find({ communityId, itemId, status: 'joined' }).select('userId progressPercent').lean();
  const userIds = parts.map(p => p.userId).filter(Boolean);
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } }).select('name username avatar').lean()
    : [];
  const userById = new Map(users.map(u => [String(u._id), u]));

  // Time window for habit logs
  const windowDays = Math.max(1, Math.min(180, parseInt(days) || 30));
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - windowDays);
  const fromKey = toDateKeyUTC(from);

  const rows = [];
  for (const p of parts) {
    const u = userById.get(String(p.userId));
    let progress = 0;
    const details = {};
    if (item.type === 'habit') {
      // Find participant's personal habit copy
      const personalHabit = await Habit.findOne({ userId: p.userId, isActive: true, 'communityInfo.itemId': item._id })
        .select('_id currentStreak longestStreak totalCompletions lastLoggedDateKey')
        .lean();
      if (personalHabit) {
        const denom = Math.max(1, personalHabit.longestStreak || 1);
        progress = Math.min(100, Math.round(((personalHabit.currentStreak || 0) / denom) * 100));
        const logs = await HabitLog.find({ userId: p.userId, habitId: personalHabit._id, dateKey: { $gte: fromKey } }).select('status').lean();
        const totals = { done: 0, missed: 0, skipped: 0 };
        for (const l of logs) {
          if (l.status === 'done') totals.done++; else if (l.status === 'missed') totals.missed++; else totals.skipped++;
        }
        details.habit = {
          currentStreak: personalHabit.currentStreak || 0,
          longestStreak: personalHabit.longestStreak || 0,
          totals
        };
      } else {
        details.habit = { currentStreak: 0, longestStreak: 0, totals: { done: 0, missed: 0, skipped: 0 } };
      }
    } else {
      // goal
      const personalGoal = await Goal.findOne({ userId: p.userId, isActive: true, 'communityInfo.itemId': item._id })
        .select('_id completed')
        .lean();
      if (personalGoal) {
        if (personalGoal.completed) progress = 100; else {
          try {
            const prog = await goalDivisionService.computeGoalProgress(personalGoal._id, p.userId);
            progress = Math.max(0, Math.min(100, Math.round(prog?.percent || 0)));
            details.goal = { completed: !!personalGoal.completed, percent: prog?.percent || 0, breakdown: prog?.breakdown || null };
          } catch (_) {
            details.goal = { completed: !!personalGoal.completed, percent: 0, breakdown: null };
          }
        }
      } else {
        details.goal = { completed: false, percent: 0, breakdown: null };
      }
      if (item.participationType === 'collaborative') {
        details.contributionPercent = progress;
      }
    }

    let status = 'in_progress';
    if (item.type === 'goal') {
      if (item.participationType === 'collaborative') {
        status = progress > 0 ? 'contributed' : 'pending';
      } else {
        status = progress >= 100 ? 'completed' : 'in_progress';
      }
    } else {
      status = progress > 0 ? 'active' : 'pending';
    }

    rows.push({
      userId: String(p.userId),
      user: u ? { _id: String(u._id), name: u.name, username: u.username, avatar: u.avatar } : null,
      progressPercent: progress,
      status,
      ...details
    });
  }

  let aggregate = 0;
  if (item.type === 'goal' && item.participationType === 'collaborative') {
    aggregate = Math.min(100, Math.round(rows.reduce((s, r) => s + (r.progressPercent || 0), 0)));
  } else {
    aggregate = rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + (r.progressPercent || 0), 0) / rows.length);
  }

  const completedCount = rows.filter(r => r.progressPercent >= 100).length;

  return {
    item: { _id: String(item._id), title: item.title, type: item.type, participationType: item.participationType || 'individual' },
    totals: {
      participants: rows.length,
      averagePercent: aggregate,
      completedCount
    },
    participants: rows
  };
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
      sourceId: item.sourceId,
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
    // Create community member joined activity
    try {
      const u = await User.findById(userId).select('name avatar').lean();
      await CommunityActivity.create({
        communityId,
        userId,
        name: u?.name,
        avatar: u?.avatar,
        type: 'community_member_joined',
        data: { metadata: { kind: 'community_member_joined' } }
      });
    } catch (_) {}
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
  // Create community member left activity
  try {
    const u = await User.findById(userId).select('name avatar').lean();
    await CommunityActivity.create({
      communityId,
      userId,
      name: u?.name,
      avatar: u?.avatar,
      type: 'community_member_left',
      data: { metadata: { kind: 'community_member_left' } }
    });
  } catch (_) {}
  return { ok: true };
}

async function listMembers(communityId) {
  const members = await CommunityMember.find({ communityId, status: 'active' })
    .populate('userId', 'name username avatar currentStreak longestStreak totalPoints')
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

async function getFeed(communityId, { limit = 20, filter = 'all', before = null } = {}) {
  const cap = Math.min(100, Math.max(1, limit));
  const beforeClause = before ? { $lt: before } : {};
  // Updates are sourced from per-community mirror; fallback to member activities when mirror is empty
  const qUpdates = { ...(before ? { createdAt: beforeClause } : {}) };
  const qChat = { communityId, ...(before ? { createdAt: beforeClause } : {}) };

  const projBase = { _id: 1, communityId: 1, userId: 1, name: 1, avatar: 1, createdAt: 1, reactions: 1 };

  if (filter === 'updates') {
    const updates = await CommunityActivity.find({ communityId, ...(before ? { createdAt: beforeClause } : {}) })
      .sort({ createdAt: -1 })
      .limit(cap)
      .select({ ...projBase, type: 1, data: 1 })
      .lean({ virtuals: true });
    return (updates || []).map(u => ({ kind: 'update', ...u }));
  }
  if (filter === 'chat') {
    const chat = await ChatMessage.find(qChat).sort({ createdAt: -1 }).limit(cap).select({ ...projBase, text: 1 }).lean();
    return chat.map(m => ({ kind: 'chat', ...m }));
  }
  // all: fetch both and merge-sort
  const [updates, chat] = await Promise.all([
    CommunityActivity.find({ communityId, ...(before ? { createdAt: beforeClause } : {}) })
      .sort({ createdAt: -1 })
      .limit(cap)
      .select({ ...projBase, type: 1, data: 1 })
      .lean({ virtuals: true }),
    ChatMessage.find(qChat).sort({ createdAt: -1 }).limit(cap).select({ ...projBase, text: 1 }).lean()
  ]);
  const merged = [];
  let i = 0, j = 0;
  while (merged.length < cap && (i < updates.length || j < chat.length)) {
    const u = updates[i];
    const c = chat[j];
    if (u && (!c || u.createdAt > c.createdAt)) { merged.push({ kind: 'update', ...u }); i += 1; }
    else if (c) { merged.push({ kind: 'chat', ...c }); j += 1; }
  }
  return merged;
}

async function sendChatMessage(communityId, user, { text }) {
  if (!text || !String(text).trim()) throw Object.assign(new Error('Message required'), { statusCode: 400 });
  // Ensure membership
  const mem = await CommunityMember.findOne({ communityId, userId: user.id, status: 'active' }).lean();
  if (!mem) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  const msg = await ChatMessage.create({ communityId, userId: user.id, name: user.name, avatar: user.avatar, text: String(text).trim() });
  return msg.toObject();
}

async function deleteChatMessage(communityId, requesterId, msgId) {
  const [mem, msg] = await Promise.all([
    CommunityMember.findOne({ communityId, userId: requesterId, status: 'active' }).lean(),
    ChatMessage.findOne({ _id: msgId, communityId })
  ]);
  if (!msg) return { ok: true };
  const isAdmin = !!mem && ['admin','moderator'].includes(mem.role);
  if (!isAdmin) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  await ChatMessage.deleteOne({ _id: msgId });
  return { ok: true };
}

async function toggleReaction(targetType, targetId, userId, emoji) {
  // Reactions: disabled for chat, only allowed for updates
  if (targetType === 'chat') {
    throw Object.assign(new Error('Reactions are disabled for messages'), { statusCode: 400 });
  }
  // updates only
  let doc = await CommunityActivity.findById(targetId).select('reactions type');
  if (!doc) throw Object.assign(new Error('Not found'), { statusCode: 404 });
  // Only allow reactions for specific update types
  const allowedTypes = new Set(['goal_completed', 'community_item_added', 'goal_joined', 'streak_milestone']);
  if (!allowedTypes.has(String(doc.type))) {
    throw Object.assign(new Error('Reactions not allowed for this update'), { statusCode: 400 });
  }
  const map = doc.reactions || new Map();
  const key = String(emoji || '').trim();
  if (!key) throw Object.assign(new Error('Invalid emoji'), { statusCode: 400 });
  let entry = map.get(key) || { count: 0, userIds: [] };
  const idx = entry.userIds.findIndex(u => String(u) === String(userId));
  if (idx >= 0) { entry.userIds.splice(idx, 1); entry.count = Math.max(0, (entry.count || 0) - 1); }
  else { entry.userIds.push(userId); entry.count = (entry.count || 0) + 1; }
  map.set(key, entry);
  doc.reactions = map;
  await doc.save();
  return { ok: true, reactions: Object.fromEntries(map) };
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
  getCommunityAnalytics,
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
  sendChatMessage,
  deleteChatMessage,
  toggleReaction,
  getItemAnalytics,
};


