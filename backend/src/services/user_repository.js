const { query } = require('../data/pg_client');

function publicUser(row) {
  if (!row) return null;
  const { deleted_at, ...user } = row;
  return user;
}

async function getUserById(userId) {
  const result = await query(
    `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active' LIMIT 1`,
    [userId]
  );
  return publicUser(result.rows[0]);
}

async function listAdminUsers() {
  const result = await query(
    `SELECT * FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`
  );
  return result.rows.map(publicUser);
}

async function getDefaultHouseholdForUser(userId) {
  const result = await query(
    `SELECT h.*
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = $1 AND hm.status = 'active'
      ORDER BY CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END, h.created_at ASC
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = { getUserById, listAdminUsers, getDefaultHouseholdForUser, publicUser };
