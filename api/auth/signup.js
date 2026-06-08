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

  const { name, email, password, target_bedtime, target_duration_hours } = req.body || {};

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  // Validate optional fields with defaults
  const bedtime = target_bedtime || '22:30:00';
  const durationHours =
    target_duration_hours != null
      ? Math.min(12, Math.max(1, parseFloat(target_duration_hours)))
      : 8.0;

  try {
    const pool = getPool();

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password with bcrypt (12 rounds — good security/speed balance)
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user
    const insertResult = await pool.query(
      `INSERT INTO users (email, name, password_hash, target_bedtime, target_duration_hours)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, target_bedtime, target_duration_hours, created_at`,
      [normalizedEmail, normalizedName, passwordHash, bedtime, durationHours]
    );

    const newUser = insertResult.rows[0];

    // Generate JWT
    const token = signToken(newUser);

    // Return token + safe user object
    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        target_bedtime: newUser.target_bedtime,
        target_duration_hours: parseFloat(newUser.target_duration_hours),
        created_at: newUser.created_at,
      },
    });
  } catch (err) {
    console.error('[signup] Error:', err.message);

    // Handle unique constraint violation (race condition)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
