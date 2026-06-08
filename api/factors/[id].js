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
      'SELECT id FROM factor_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    if (req.method === 'PUT') {
      const {
        caffeine_cups, alcohol_units, stress_level,
        screen_time_minutes, exercise_minutes, exercise_type, notes,
      } = req.body;

      const { rows } = await pool.query(
        `UPDATE factor_logs SET
           caffeine_cups = COALESCE($1, caffeine_cups),
           alcohol_units = COALESCE($2, alcohol_units),
           stress_level = COALESCE($3, stress_level),
           screen_time_minutes = COALESCE($4, screen_time_minutes),
           exercise_minutes = COALESCE($5, exercise_minutes),
           exercise_type = COALESCE($6, exercise_type),
           notes = COALESCE($7, notes),
           updated_at = NOW()
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [caffeine_cups ?? null, alcohol_units ?? null, stress_level || null,
         screen_time_minutes ?? null, exercise_minutes ?? null,
         exercise_type ?? null, notes ?? null, id, userId]
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM factor_logs WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('factors/[id] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
