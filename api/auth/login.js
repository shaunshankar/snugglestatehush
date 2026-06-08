import bcrypt from 'bcryptjs';
import { getPool } from '../_db.js';
import { setCors, signToken } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  // Validate required fields
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const pool = getPool();

    // Look up the user
    const result = await pool.query(
      `SELECT id, email, name, password_hash, target_bedtime, target_duration_hours, created_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Return a generic message to avoid leaking whether the email exists
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = signToken(user);

    // Return token + safe user object (no password_hash)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        target_bedtime: user.target_bedtime,
        target_duration_hours: parseFloat(user.target_duration_hours),
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[login] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
