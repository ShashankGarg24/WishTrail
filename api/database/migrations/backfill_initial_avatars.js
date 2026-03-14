/**
 * Backfill missing avatars for existing users.
 *
 * Runs safely by updating only users whose avatar_url is NULL or empty.
 *
 * Usage:
 *   node api/database/migrations/backfill_initial_avatars.js
 */

require('dotenv').config();
const { logger } = require('./../../src/config/observability');
const { query } = require('./../../src/config/supabase');
const { generateAndUploadInitialAvatar } = require('./../../src/utility/avatarGenerator');

async function backfillInitialAvatars() {
  logger.info('Starting avatar backfill migration...');

  const candidates = await query(
    `
      SELECT id, name, email
      FROM users
      WHERE avatar_url IS NULL OR btrim(avatar_url) = ''
      ORDER BY created_at ASC
    `
  );

  logger.info(`Found ${candidates.rows.length} users with missing avatar_url`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const user of candidates.rows) {
    const avatarUrl = await generateAndUploadInitialAvatar({
      name: user.name,
      email: user.email,
      username: ''
    });

    if (!avatarUrl) {
      skippedCount += 1;
      logger.warn(`Skipped user ${user.id}: Cloudinary avatar URL not generated`);
      continue;
    }

    const result = await query(
      `
        UPDATE users
        SET avatar_url = $1,
            updated_at = NOW()
        WHERE id = $2
          AND (avatar_url IS NULL OR btrim(avatar_url) = '')
      `,
      [avatarUrl, user.id]
    );

    if (result.rowCount > 0) {
      updatedCount += 1;
    }
  }

  logger.info(`Avatar backfill complete. Updated ${updatedCount} user(s), skipped ${skippedCount} user(s).`);
}

if (require.main === module) {
  backfillInitialAvatars()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Avatar backfill failed:', error);
      process.exit(1);
    });
}

module.exports = backfillInitialAvatars;
