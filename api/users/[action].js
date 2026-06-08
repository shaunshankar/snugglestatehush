import bcrypt from 'bcryptjs';
import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();

    if (action === 'account') {
      if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
      const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      if (!rowCount) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ success: true });
    }

    if (action === 'goals') {
      if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
      const { target_bedtime, target_duration_hours } = req.body;
      const { rows } = await pool.query(
        `UPDATE users SET
           target_bedtime = COALESCE($1, target_bedtime),
           target_duration_hours = COALESCE($2, target_duration_hours),
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, name, target_bedtime, target_duration_hours, created_at`,
        [target_bedtime || null, target_duration_hours || null, userId]
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(rows[0]);
    }

    if (action === 'password') {
      if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword and newPassword are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hash, userId]
      );
      return res.status(200).json({ success: true });
    }

    if (action === 'profile') {
      if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
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
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error(`users/${req.query.action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
}
