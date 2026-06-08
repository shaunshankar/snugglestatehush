import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();
    const { name } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const { rows } = await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, target_bedtime, target_duration_hours, created_at`,
      [name.trim(), userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('users/profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
