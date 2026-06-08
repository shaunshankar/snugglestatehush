import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();
    const { id } = req.query;

    const { rows: existing } = await pool.query(
      'SELECT id FROM morning_checkins WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    if (req.method === 'PUT') {
      const { rest_feeling, mood, notes } = req.body;
      const { rows } = await pool.query(
        `UPDATE morning_checkins SET
           rest_feeling = COALESCE($1, rest_feeling),
           mood = COALESCE($2, mood),
           notes = COALESCE($3, notes),
           updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [rest_feeling || null, mood || null, notes ?? null, id, userId]
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM morning_checkins WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('checkins/[id] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
