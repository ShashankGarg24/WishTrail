require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../../src/config/supabase');
async function main() {
  const client = await pool.connect();
  try {
    await client.query(fs.readFileSync(path.join(__dirname,'014_remove_weekly_trail_snapshots.sql'),'utf8'));
    console.log('Empty Weekly Trail snapshot storage removed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
