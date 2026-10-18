const { query } = require('../config/supabase');
const DailyLogsEntry = require('../models/DailyLogsEntry');
const UserPreferences = require('../models/extended/UserPreferences');

const sanitizePlainText = (value = '') => {
  const withoutTags = String(value).replace(/<[^>]*>/g, '');
  const withoutControlChars = withoutTags.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return withoutControlChars.trim();
};

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 100000);
};

const validId = (value) => {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw Object.assign(new Error('Invalid record ID'), { statusCode: 400 });
  }
  return Number(value);
};

const safeOrder = (key, direction, allowed, fallback) =>
  `${Object.prototype.hasOwnProperty.call(allowed, key) ? allowed[key] : fallback} ${String(direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;

const formatUserRow = (row, lastDailyUpdatedAt = null, emailNotificationsEnabled = true) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  email: row.email,
  emailNotificationsEnabled,
  completedGoals: row.completed_goals,
  totalGoals: row.total_goals,
  totalHabits: row.total_habits,
  createdAt: row.created_at,
  lastActiveAt: row.last_active_at,
  lastDailyUpdatedAt,
  accountActive: row.is_active,
  isVerified: row.is_verified,
  premiumExpiresAt: row.premium_expires_at,
  lastUpdateSeen: row.last_seen_update_version
});

const formatGoalRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  year: row.year,
  completed: row.completed_at !== null,
  completedAt: row.completed_at,
  targetDate: row.target_date,
  totalGoalUpdates: row.total_goal_updates,
  lastGoalUpdateAt: row.last_goal_update_at,
  isPublic: row.is_public,
  createdAt: row.created_at,
  user: {
    id: row.user_id,
    name: row.user_name,
    username: row.user_username,
    email: row.user_email
  }
});

const formatHabitRow = (row) => ({
  id: row.id,
  name: row.name,
  frequency: row.frequency,
  targetType: row.target_type,
  daysOfWeek: row.days_of_week,
  isArchived: row.is_archived,
  status: row.recently_active ? 'Active' : 'Inactive',
  totalLogs: row.total_logs,
  lastLogAt: row.last_log_at,
  currentStreak: row.current_streak,
  bestStreak: row.best_streak,
  createdAt: row.created_at,
  user: {
    id: row.user_id,
    name: row.user_name,
    username: row.user_username,
    email: row.user_email
  }
});

const getUsers = async ({ page, limit, search, inactiveDays, emailNotifications = 'all', sortBy, sortOrder }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const inactiveDaysNum = Math.min(36500, Math.max(0, parseInt(inactiveDays, 10) || 0));
  const normalizedEmailFilter = ['all', 'enabled', 'disabled'].includes(String(emailNotifications || '').toLowerCase())
    ? String(emailNotifications).toLowerCase()
    : 'all';

  let disabledIds = [];
  if (normalizedEmailFilter !== 'all') {
    const disabledPrefs = await UserPreferences.find({ 'notifications.email.enabled': false })
      .select('userId')
      .lean();
    disabledIds = disabledPrefs
      .map((p) => Number(p.userId))
      .filter((id) => Number.isFinite(id));
  }

  const disabledIdsForSql = disabledIds.length ? disabledIds : [-1];

  const listQuery = `
    SELECT
      u.id,
      u.name,
      u.username,
      u.email,
      u.is_active,
      u.is_verified,
      u.premium_expires_at,
      u.total_goals,
      u.completed_goals,
      COALESCE(hc.total_habits, 0) AS total_habits,
      u.last_seen_update_version,
      u.created_at,
      u.last_active_at
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS total_habits
      FROM habits
      GROUP BY user_id
    ) hc ON hc.user_id = u.id
    WHERE
      ($1 = '' OR u.name ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND ($3::int <= 0 OR COALESCE(u.last_active_at, u.created_at) < NOW() - make_interval(days => $3::int))
      AND (
        $4 = 'all'
        OR ($4 = 'disabled' AND u.id = ANY($5::bigint[]))
        OR ($4 = 'enabled' AND u.id <> ALL($5::bigint[]))
      )
    ORDER BY ${safeOrder(sortBy, sortOrder, { name: 'u.name', email: 'u.email', createdAt: 'u.created_at', lastActiveAt: 'u.last_active_at', totalGoals: 'u.total_goals' }, 'u.created_at')}, u.id DESC
    LIMIT $6 OFFSET $7
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users
    WHERE
      ($1 = '' OR name ILIKE $2 OR username ILIKE $2 OR email ILIKE $2)
      AND ($3::int <= 0 OR COALESCE(last_active_at, created_at) < NOW() - make_interval(days => $3::int))
      AND (
        $4 = 'all'
        OR ($4 = 'disabled' AND id = ANY($5::bigint[]))
        OR ($4 = 'enabled' AND id <> ALL($5::bigint[]))
      )
  `;

  const wildcard = `%${searchTerm}%`;
  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, inactiveDaysNum, normalizedEmailFilter, disabledIdsForSql, limitNum, offset]),
    query(countQuery, [searchTerm, wildcard, inactiveDaysNum, normalizedEmailFilter, disabledIdsForSql])
  ]);

  const listedUserIds = listResult.rows
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));

  let lastDailyUpdatedAtByUserId = {};
  let emailNotificationsByUserId = {};
  if (listedUserIds.length > 0) {
    const [latestDailyLogs, listedPrefs] = await Promise.all([
      DailyLogsEntry.aggregate([
        { $match: { userId: { $in: listedUserIds } } },
        { $group: { _id: '$userId', lastDailyUpdatedAt: { $max: '$updatedAt' } } }
      ]),
      UserPreferences.find({ userId: { $in: listedUserIds } })
        .select('userId notifications.email.enabled')
        .lean()
    ]);

    lastDailyUpdatedAtByUserId = latestDailyLogs.reduce((acc, item) => {
      acc[String(item._id)] = item.lastDailyUpdatedAt || null;
      return acc;
    }, {});

    emailNotificationsByUserId = listedPrefs.reduce((acc, item) => {
      const enabled = item?.notifications?.email?.enabled !== false;
      acc[String(item.userId)] = enabled;
      return acc;
    }, {});
  }

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    users: listResult.rows.map((row) => formatUserRow(
      row,
      lastDailyUpdatedAtByUserId[String(row.id)] || null,
      emailNotificationsByUserId[String(row.id)] !== false
    )),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
};

const getGoals = async ({ page, limit, search, status, userId, sortBy, sortOrder }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const ownerId = userId ? validId(userId) : null;
  const wildcard = `%${searchTerm}%`;

  const normalizedStatus = ['completed', 'active', 'all'].includes(status) ? status : 'all';

  const listQuery = `
    SELECT
      g.id,
      g.user_id,
      g.title,
      g.category,
      g.year,
      g.target_date,
      g.completed_at,
      g.is_public,
      COALESCE(gu.total_goal_updates, 0) AS total_goal_updates,
      gu.last_goal_update_at,
      g.created_at,
      u.name AS user_name,
      u.username AS user_username,
      u.email AS user_email
    FROM goals g
    INNER JOIN users u ON u.id = g.user_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_goal_updates,
        MAX(created_at) AS last_goal_update_at
      FROM goal_updates gu
      WHERE gu.goal_id = g.id
    ) gu ON true
    WHERE
      ($6::bigint IS NULL OR g.user_id = $6)
      AND ($1 = '' OR g.title ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'completed' AND g.completed_at IS NOT NULL)
        OR ($3 = 'active' AND g.completed_at IS NULL)
      )
    ORDER BY ${safeOrder(sortBy, sortOrder, { title: 'g.title', createdAt: 'g.created_at', category: 'g.category' }, 'g.created_at')}, g.id DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM goals g
    INNER JOIN users u ON u.id = g.user_id
    WHERE
      ($4::bigint IS NULL OR g.user_id = $4)
      AND ($1 = '' OR g.title ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'completed' AND g.completed_at IS NOT NULL)
        OR ($3 = 'active' AND g.completed_at IS NULL)
      )
  `;

  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, normalizedStatus, limitNum, offset, ownerId]),
    query(countQuery, [searchTerm, wildcard, normalizedStatus, ownerId])
  ]);

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    goals: listResult.rows.map(formatGoalRow),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
};

const getHabits = async ({ page, limit, search, status, userId, sortBy, sortOrder }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const ownerId = userId ? validId(userId) : null;
  const wildcard = `%${searchTerm}%`;

  const normalizedStatus = ['all', 'active', 'inactive'].includes(status) ? status : 'all';

  const listQuery = `
    SELECT
      h.id,
      h.user_id,
      h.name,
      h.frequency,
      h.days_of_week,
      COALESCE(
        (to_jsonb(h)->>'is_archived')::boolean,
        NOT COALESCE((to_jsonb(h)->>'is_active')::boolean, true),
        false
      ) AS is_archived,
      (hl.last_log_at >= NOW() - INTERVAL '7 days') AS recently_active,
      h.target_type,
      h.current_streak,
      GREATEST(COALESCE(h.longest_streak, 0), COALESCE(h.max_streak, 0)) AS best_streak,
      COALESCE(hl.total_logs, 0) AS total_logs,
      hl.last_log_at,
      h.created_at,
      u.name AS user_name,
      u.username AS user_username,
      u.email AS user_email
    FROM habits h
    INNER JOIN users u ON u.id = h.user_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_logs,
        MAX(hl.occurred_at) AS last_log_at
      FROM habit_logs hl
      WHERE hl.habit_id = h.id
    ) hl ON true
    WHERE
      ($6::bigint IS NULL OR h.user_id = $6)
      AND ($1 = '' OR h.name ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'active' AND hl.last_log_at >= NOW() - INTERVAL '7 days')
        OR ($3 = 'inactive' AND (hl.last_log_at IS NULL OR hl.last_log_at < NOW() - INTERVAL '7 days'))
      )
    ORDER BY ${safeOrder(sortBy, sortOrder, { name: 'h.name', createdAt: 'h.created_at', currentStreak: 'h.current_streak' }, 'h.created_at')}, h.id DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM habits h
    INNER JOIN users u ON u.id = h.user_id
    LEFT JOIN LATERAL (
      SELECT MAX(hl.occurred_at) AS last_log_at
      FROM habit_logs hl
      WHERE hl.habit_id = h.id
    ) hl ON true
    WHERE
      ($4::bigint IS NULL OR h.user_id = $4)
      AND ($1 = '' OR h.name ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'active' AND hl.last_log_at >= NOW() - INTERVAL '7 days')
        OR ($3 = 'inactive' AND (hl.last_log_at IS NULL OR hl.last_log_at < NOW() - INTERVAL '7 days'))
      )
  `;

  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, normalizedStatus, limitNum, offset, ownerId]),
    query(countQuery, [searchTerm, wildcard, normalizedStatus, ownerId])
  ]);

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    habits: listResult.rows.map(formatHabitRow),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
};

const getAnalytics = async ({ inactiveDays }) => {
  const inactiveDaysNum = Math.max(1, parseInt(inactiveDays, 10) || 30);

  const [totalUsersRes, activeTodayRes, inactiveUsersRes, totalGoalsRes] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM users'),
    query('SELECT COUNT(*) AS total FROM users WHERE last_active_at >= CURRENT_DATE'),
    query(
      'SELECT COUNT(*) AS total FROM users WHERE COALESCE(last_active_at, created_at) < NOW() - make_interval(days => $1::int)',
      [inactiveDaysNum]
    ),
    query('SELECT COUNT(*) AS total FROM goals')
  ]);

  return {
    totalUsers: parseInt(totalUsersRes.rows[0]?.total || '0', 10),
    activeToday: parseInt(activeTodayRes.rows[0]?.total || '0', 10),
    inactiveUsers: parseInt(inactiveUsersRes.rows[0]?.total || '0', 10),
    totalGoals: parseInt(totalGoalsRes.rows[0]?.total || '0', 10)
  };
};


module.exports = {
  validId,
  formatUserRow,
  getUsers,
  getGoals,
  getHabits,
  getAnalytics,
  sanitizePlainText
};
