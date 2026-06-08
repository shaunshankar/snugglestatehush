import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT f.*, s.sleep_score, s.duration_minutes
         FROM factor_logs f
         LEFT JOIN sleep_entries s ON s.user_id = f.user_id AND s.date = f.date
         WHERE f.user_id = $1
         ORDER BY f.date DESC`,
        [userId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const {
        date, caffeine_cups, alcohol_units, stress_level,
        screen_time_minutes, exercise_minutes, exercise_type, notes,
      } = req.body;
      if (!date) return res.status(400).json({ error: 'date is required' });

      const { rows } = await pool.query(
        `INSERT INTO factor_logs
          (user_id, date, caffeine_cups, alcohol_units, stress_level,
           screen_time_minutes, exercise_minutes, exercise_type, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id, date) DO UPDATE SET
           caffeine_cups = EXCLUDED.caffeine_cups,
           alcohol_units = EXCLUDED.alcohol_units,
           stress_level = EXCLUDED.stress_level,
           screen_time_minutes = EXCLUDED.screen_time_minutes,
           exercise_minutes = EXCLUDED.exercise_minutes,
           exercise_type = EXCLUDED.exercise_type,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [userId, date, caffeine_cups ?? 0, alcohol_units ?? 0,
         stress_level || null, screen_time_minutes ?? 0,
         exercise_minutes ?? 0, exercise_type || null, notes || null]
      );
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('factors/index error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
