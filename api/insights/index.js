import Anthropic from '@anthropic-ai/sdk';
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
        `SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
        [userId]
      );
      return res.status(200).json(rows[0] || null);
    }

    if (req.method === 'POST') {
      // Fetch last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

      const [sleepRes, factorRes, userRes] = await Promise.all([
        pool.query(
          `SELECT date, duration_minutes, sleep_score, rem_minutes, deep_minutes,
                  core_minutes, awake_minutes, rest_quality_rating, bedtime, wake_time
           FROM sleep_entries
           WHERE user_id = $1 AND date >= $2
           ORDER BY date ASC`,
          [userId, cutoff]
        ),
        pool.query(
          `SELECT date, caffeine_cups, alcohol_units, stress_level,
                  screen_time_minutes, exercise_minutes, exercise_type
           FROM factor_logs
           WHERE user_id = $1 AND date >= $2
           ORDER BY date ASC`,
          [userId, cutoff]
        ),
        pool.query(
          `SELECT name, target_bedtime, target_duration_hours FROM users WHERE id = $1`,
          [userId]
        ),
      ]);

      const sleepEntries = sleepRes.rows;
      const factorLogs = factorRes.rows;
      const user = userRes.rows[0];

      if (sleepEntries.length < 3) {
        return res.status(422).json({
          error: 'Not enough data. Log at least 3 nights of sleep to generate insights.',
        });
      }

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const prompt = `You are a sleep health expert. Analyse this user's sleep data and lifestyle factors from the last 30 days and provide personalised insights.

Sleep data: ${JSON.stringify(sleepEntries)}
Factor logs: ${JSON.stringify(factorLogs)}
User's sleep goal: ${user.target_bedtime || '22:30'} for ${user.target_duration_hours || 8} hours

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "insights": [
    { "title": "short title", "detail": "2-3 sentence personalised insight" },
    { "title": "...", "detail": "..." },
    { "title": "...", "detail": "..." }
  ],
  "weekly_tip": "one specific actionable tip for this week",
  "summary": "2-3 sentence overall sleep health summary"
}`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = message.content[0]?.text || '';
      let insightData;
      try {
        // Strip any accidental markdown code fences
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        insightData = JSON.parse(cleaned);
      } catch {
        insightData = {
          insights: [{ title: 'Sleep Analysis', detail: rawText }],
          weekly_tip: 'Continue logging your sleep consistently for better insights.',
          summary: 'Keep tracking your sleep to unlock personalised recommendations.',
        };
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

      const { rows } = await pool.query(
        `INSERT INTO ai_insights (user_id, generated_at, insight_text, insight_type, week_start_date)
         VALUES ($1, NOW(), $2, 'weekly', $3)
         RETURNING *`,
        [userId, JSON.stringify(insightData), weekStart.toISOString().slice(0, 10)]
      );

      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('insights/index error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
