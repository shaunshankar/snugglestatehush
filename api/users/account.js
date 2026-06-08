import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();

    // CASCADE on all child tables handles the rest
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('users/account error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
