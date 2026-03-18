const { query } = require('../config/supabase');
const emailService = require('./emailService');

const sanitizePlainText = (value = '') => {
  const withoutTags = String(value).replace(/<[^>]*>/g, '');
  const withoutControlChars = withoutTags.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return withoutControlChars.trim();
};

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
};

const formatUserRow = (row) => ({
  id: row.id,
  name: row.name,
  username: row.username,
  email: row.email,
  completedGoals: row.completed_goals,
  totalGoals: row.total_goals,
  totalHabits: row.total_habits,
  createdAt: row.created_at,
  lastActiveAt: row.last_active_at,
  accountActive: row.is_active,
  lastUpdateSeen: row.last_seen_update_version
});

const formatGoalRow = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  year: row.year,
  completed: row.completed_at !== null,
  completedAt: row.completed_at,
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
  status: row.last_log_at && new Date(row.last_log_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive',
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

const getUsers = async ({ page, limit, search, inactiveDays }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const inactiveDaysNum = Math.max(0, parseInt(inactiveDays, 10) || 0);

  const listQuery = `
    SELECT
      u.id,
      u.name,
      u.username,
      u.email,
      u.is_active,
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
    ORDER BY u.created_at DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users
    WHERE
      ($1 = '' OR name ILIKE $2 OR username ILIKE $2 OR email ILIKE $2)
      AND ($3::int <= 0 OR COALESCE(last_active_at, created_at) < NOW() - make_interval(days => $3::int))
  `;

  const wildcard = `%${searchTerm}%`;
  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, inactiveDaysNum, limitNum, offset]),
    query(countQuery, [searchTerm, wildcard, inactiveDaysNum])
  ]);

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    users: listResult.rows.map(formatUserRow),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1
    }
  };
};

const getGoals = async ({ page, limit, search, status }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const wildcard = `%${searchTerm}%`;

  const normalizedStatus = ['completed', 'active', 'all'].includes(status) ? status : 'all';

  const listQuery = `
    SELECT
      g.id,
      g.user_id,
      g.title,
      g.category,
      g.year,
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
      ($1 = '' OR g.title ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'completed' AND g.completed_at IS NOT NULL)
        OR ($3 = 'active' AND g.completed_at IS NULL)
      )
    ORDER BY g.created_at DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM goals g
    INNER JOIN users u ON u.id = g.user_id
    WHERE
      ($1 = '' OR g.title ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'completed' AND g.completed_at IS NOT NULL)
        OR ($3 = 'active' AND g.completed_at IS NULL)
      )
  `;

  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, normalizedStatus, limitNum, offset]),
    query(countQuery, [searchTerm, wildcard, normalizedStatus])
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

const getHabits = async ({ page, limit, search, status }) => {
  const pageNum = toPositiveInt(page, 1);
  const limitNum = Math.min(100, toPositiveInt(limit, 20));
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = sanitizePlainText(search || '');
  const wildcard = `%${searchTerm}%`;

  const normalizedStatus = ['all', 'active', 'inactive'].includes(status) ? status : 'all';

  const listQuery = `
    SELECT
      h.id,
      h.user_id,
      h.name,
      h.frequency,
      h.target_type,
      h.current_streak,
      COALESCE(h.longest_streak, h.max_streak, 0) AS best_streak,
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
        MAX(hl.date_key)::timestamp AS last_log_at
      FROM habit_logs hl
      WHERE hl.habit_id = h.id
    ) hl ON true
    WHERE
      ($1 = '' OR h.name ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'active' AND COALESCE(hl.last_log_at::date, h.created_at::date) >= CURRENT_DATE - INTERVAL '7 days')
        OR ($3 = 'inactive' AND COALESCE(hl.last_log_at::date, h.created_at::date) < CURRENT_DATE - INTERVAL '7 days')
      )
    ORDER BY h.created_at DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM habits h
    INNER JOIN users u ON u.id = h.user_id
    LEFT JOIN LATERAL (
      SELECT MAX(hl.date_key)::timestamp AS last_log_at
      FROM habit_logs hl
      WHERE hl.habit_id = h.id
    ) hl ON true
    WHERE
      ($1 = '' OR h.name ILIKE $2 OR u.username ILIKE $2 OR u.email ILIKE $2)
      AND (
        $3 = 'all'
        OR ($3 = 'active' AND COALESCE(hl.last_log_at::date, h.created_at::date) >= CURRENT_DATE - INTERVAL '7 days')
        OR ($3 = 'inactive' AND COALESCE(hl.last_log_at::date, h.created_at::date) < CURRENT_DATE - INTERVAL '7 days')
      )
  `;

  const [listResult, countResult] = await Promise.all([
    query(listQuery, [searchTerm, wildcard, normalizedStatus, limitNum, offset]),
    query(countQuery, [searchTerm, wildcard, normalizedStatus])
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

const resolveEmailRecipients = async ({ mode, userIds, inactiveDays }) => {
  const normalizedMode = ['selected', 'all', 'inactive'].includes(mode) ? mode : 'all';

  if (normalizedMode === 'selected') {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }
    const numericIds = userIds
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (numericIds.length === 0) {
      return [];
    }

    const res = await query(
      'SELECT id, name, email FROM users WHERE is_active = true AND id = ANY($1::bigint[])',
      [numericIds]
    );
    return res.rows;
  }

  if (normalizedMode === 'inactive') {
    const threshold = Math.max(1, parseInt(inactiveDays, 10) || 30);
    const res = await query(
      'SELECT id, name, email FROM users WHERE is_active = true AND COALESCE(last_active_at, created_at) < NOW() - make_interval(days => $1::int)',
      [threshold]
    );
    return res.rows;
  }

  const res = await query('SELECT id, name, email FROM users WHERE is_active = true');
  return res.rows;
};

const sendBroadcastEmail = async ({ mode, userIds, inactiveDays, subject, message, templateKey }) => {
  const cleanSubject = sanitizePlainText(subject).slice(0, 180);
  const cleanMessage = sanitizePlainText(message).slice(0, 5000);

  if (!cleanSubject || !cleanMessage) {
    throw new Error('Subject and message are required');
  }

  const recipients = await resolveEmailRecipients({ mode, userIds, inactiveDays });

  if (recipients.length === 0) {
    return {
      requested: 0,
      sent: 0,
      failed: 0
    };
  }

  const results = await Promise.allSettled(
    recipients.map((user) =>
      emailService.sendAdminBroadcastEmail({
        to: user.email,
        subject: cleanSubject,
        text: {
          recipientName: user.name,
          message: cleanMessage,
          templateKey
        }
      })
    )
  );

  const sent = results.filter((res) => res.status === 'fulfilled').length;

  return {
    requested: recipients.length,
    sent,
    failed: recipients.length - sent
  };
};

module.exports = {
  getUsers,
  getGoals,
  getHabits,
  getAnalytics,
  sendBroadcastEmail,
  sanitizePlainText
};
