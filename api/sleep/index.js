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
        `SELECT * FROM sleep_entries WHERE user_id = $1 ORDER BY date DESC`,
        [userId]
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const {
        date, bedtime, wake_time, duration_minutes,
        sleep_score, rem_minutes, deep_minutes, core_minutes,
        awake_minutes, rest_quality_rating, source, notes,
      } = req.body;

      if (!date) return res.status(400).json({ error: 'date is required' });

      let duration = duration_minutes;
      let bt = bedtime || null;
      let wt = wake_time || null;

      // Build full timestamptz strings if only time provided
      if (bedtime && !bedtime.includes('T')) {
        bt = `${date}T${bedtime}:00`;
      }
      if (wake_time && !wake_time.includes('T')) {
        // If wake_time is earlier than bedtime (e.g. past midnight), use next day
        const wakeDateStr = wake_time < bedtime ? nextDay(date) : date;
        wt = `${wakeDateStr}T${wake_time}:00`;
      }

      if (!duration && bt && wt) {
        const diff = (new Date(wt) - new Date(bt)) / 60000;
        duration = diff > 0 ? Math.round(diff) : null;
      }

      const { rows } = await pool.query(
        `INSERT INTO sleep_entries
          (user_id, date, bedtime, wake_time, duration_minutes, sleep_score,
           rem_minutes, deep_minutes, core_minutes, awake_minutes,
           rest_quality_rating, source, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (user_id, date) DO UPDATE SET
           bedtime = EXCLUDED.bedtime,
           wake_time = EXCLUDED.wake_time,
           duration_minutes = EXCLUDED.duration_minutes,
           sleep_score = EXCLUDED.sleep_score,
           rem_minutes = EXCLUDED.rem_minutes,
           deep_minutes = EXCLUDED.deep_minutes,
           core_minutes = EXCLUDED.core_minutes,
           awake_minutes = EXCLUDED.awake_minutes,
           rest_quality_rating = EXCLUDED.rest_quality_rating,
           source = EXCLUDED.source,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [userId, date, bt, wt, duration,
         sleep_score || null, rem_minutes || 0, deep_minutes || 0,
         core_minutes || 0, awake_minutes || 0,
         rest_quality_rating || null, source || 'manual', notes || null]
      );
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('sleep/index error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
