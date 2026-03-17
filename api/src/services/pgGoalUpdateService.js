const { query } = require('../config/supabase');

class PgGoalUpdateService {
  async assertGoalWritable(goalId, userId) {
    const goalResult = await query(
      `SELECT id, user_id, completed_at FROM goals WHERE id = $1`,
      [goalId]
    );

    const goal = goalResult.rows[0];
    if (!goal) {
      throw Object.assign(new Error('Goal not found'), { statusCode: 404 });
    }

    if (Number(goal.user_id) !== Number(userId)) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 });
    }

    if (goal.completed_at) {
      throw Object.assign(new Error('Cannot log updates on completed goal'), { statusCode: 400 });
    }

    return goal;
  }

  async getTodayUpdate(goalId, userId, dateKey) {
    const result = await query(
      `
        SELECT id, goal_id, user_id, text, emotion, date_key, created_at
        FROM goal_updates
        WHERE goal_id = $1 AND user_id = $2 AND date_key = $3::date
        LIMIT 1
      `,
      [goalId, userId, dateKey]
    );

    return this._formatRow(result.rows[0] || null);
  }

  async upsertTodayUpdate({ goalId, userId, text, emotion, dateKey }) {
    const result = await query(
      `
        INSERT INTO goal_updates (goal_id, user_id, date_key, text, emotion)
        VALUES ($1, $2, $3::date, $4, $5)
        ON CONFLICT (goal_id, date_key)
        DO UPDATE SET
          text = EXCLUDED.text,
          emotion = EXCLUDED.emotion,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, goal_id, user_id, text, emotion, date_key, created_at
      `,
      [goalId, userId, dateKey, text, emotion]
    );

    return this._formatRow(result.rows[0] || null);
  }

  async deleteTodayUpdate(goalId, userId, dateKey) {
    const result = await query(
      `
        DELETE FROM goal_updates
        WHERE goal_id = $1 AND user_id = $2 AND date_key = $3::date
        RETURNING id
      `,
      [goalId, userId, dateKey]
    );

    return !!result.rows[0];
  }

  async listGoalUpdates(goalId, userId, { limit = 10, offset = 0 } = {}) {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const result = await query(
      `
        SELECT id, goal_id, user_id, text, emotion, date_key, created_at
        FROM goal_updates
        WHERE goal_id = $1 AND user_id = $2
        ORDER BY date_key DESC, created_at DESC
        LIMIT $3 OFFSET $4
      `,
      [goalId, userId, safeLimit + 1, safeOffset]
    );

    const rows = result.rows || [];
    const hasMore = rows.length > safeLimit;
    const sliced = rows.slice(0, safeLimit).map((row) => this._formatRow(row));

    return {
      updates: sliced,
      hasMore
    };
  }

  _formatRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      text: row.text || '',
      emotion: row.emotion || null,
      dateKey: row.date_key,
      createdAt: row.created_at
    };
  }
}

module.exports = new PgGoalUpdateService();
