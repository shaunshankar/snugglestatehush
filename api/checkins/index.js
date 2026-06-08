import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();

    if (req.method === 'GET') {
      const limit = parseInt(req.query?.limit) || 100;
      const { rows } = await pool.query(
        `SELECT c.*, s.duration_minutes, s.sleep_score
         FROM morning_checkins c
         LEFT JOIN sleep_entries s ON s.user_id = c.user_id AND s.date = c.date
         WHERE c.user_id = $1
         ORDER BY c.date DESC
         LIMIT $2`,
        [userId, limit]
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { date, rest_feeling, mood, notes } = req.body;
      if (!date) return res.status(400).json({ error: 'date is required' });

      const { rows } = await pool.query(
        `INSERT INTO morning_checkins (user_id, date, rest_feeling, mood, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, date) DO UPDATE SET
           rest_feeling = EXCLUDED.rest_feeling,
           mood = EXCLUDED.mood,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [userId, date, rest_feeling || null, mood || null, notes || null]
      );
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('checkins/index error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
