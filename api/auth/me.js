import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  let decoded;
  try {
    decoded = verifyToken(req);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pool = getPool();

    // Fetch user profile, excluding password_hash
    const result = await pool.query(
      `SELECT id, email, name, target_bedtime, target_duration_hours, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        target_bedtime: user.target_bedtime,
        target_duration_hours: parseFloat(user.target_duration_hours),
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error('[me] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
