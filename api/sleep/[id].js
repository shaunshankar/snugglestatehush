import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();
    const { id } = req.query;

    // Verify ownership
    const { rows: existing } = await pool.query(
      'SELECT id FROM sleep_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    if (req.method === 'PUT') {
      const {
        date, bedtime, wake_time, duration_minutes,
        sleep_score, rem_minutes, deep_minutes, core_minutes,
        awake_minutes, rest_quality_rating, source, notes,
      } = req.body;

      let bt = bedtime || null;
      let wt = wake_time || null;
      let duration = duration_minutes;

      if (bedtime && date && !bedtime.includes('T')) {
        bt = `${date}T${bedtime}:00`;
      }
      if (wake_time && date && !wake_time.includes('T')) {
        const wakeDateStr = wake_time < bedtime ? nextDay(date) : date;
        wt = `${wakeDateStr}T${wake_time}:00`;
      }
      if (!duration && bt && wt) {
        const diff = (new Date(wt) - new Date(bt)) / 60000;
        duration = diff > 0 ? Math.round(diff) : null;
      }

      const { rows } = await pool.query(
        `UPDATE sleep_entries SET
           date = COALESCE($1, date),
           bedtime = COALESCE($2, bedtime),
           wake_time = COALESCE($3, wake_time),
           duration_minutes = COALESCE($4, duration_minutes),
           sleep_score = COALESCE($5, sleep_score),
           rem_minutes = COALESCE($6, rem_minutes),
           deep_minutes = COALESCE($7, deep_minutes),
           core_minutes = COALESCE($8, core_minutes),
           awake_minutes = COALESCE($9, awake_minutes),
           rest_quality_rating = COALESCE($10, rest_quality_rating),
           source = COALESCE($11, source),
           notes = COALESCE($12, notes),
           updated_at = NOW()
         WHERE id = $13 AND user_id = $14
         RETURNING *`,
        [date || null, bt, wt, duration,
         sleep_score || null, rem_minutes ?? null, deep_minutes ?? null,
         core_minutes ?? null, awake_minutes ?? null,
         rest_quality_rating || null, source || null, notes ?? null,
         id, userId]
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM sleep_entries WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('sleep/[id] error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
