import { getPool } from '../_db.js';
import { verifyToken, setCors } from '../_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = verifyToken(req);
    const pool = getPool();
    const { csvText, preview, entries, confirmed } = req.body;

    if (confirmed && entries) {
      // Bulk insert the confirmed entries
      let imported = 0;
      for (const entry of entries) {
        if (!entry.date) continue;
        await pool.query(
          `INSERT INTO sleep_entries
            (user_id, date, bedtime, wake_time, duration_minutes,
             rem_minutes, deep_minutes, core_minutes, awake_minutes, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'apple_health')
           ON CONFLICT (user_id, date) DO UPDATE SET
             bedtime = EXCLUDED.bedtime,
             wake_time = EXCLUDED.wake_time,
             duration_minutes = EXCLUDED.duration_minutes,
             rem_minutes = EXCLUDED.rem_minutes,
             deep_minutes = EXCLUDED.deep_minutes,
             core_minutes = EXCLUDED.core_minutes,
             awake_minutes = EXCLUDED.awake_minutes,
             source = 'apple_health',
             updated_at = NOW()`,
          [userId, entry.date, entry.bedtime || null, entry.wake_time || null,
           entry.duration_minutes || null, entry.rem_minutes || 0,
           entry.deep_minutes || 0, entry.core_minutes || 0, entry.awake_minutes || 0]
        );
        imported++;
      }
      return res.status(200).json({ success: true, imported });
    }

    if (!csvText) return res.status(400).json({ error: 'csvText is required' });

    const parsed = parseAppleHealthCSV(csvText);
    return res.status(200).json({ entries: parsed });
  } catch (err) {
    if (err.message === 'No token provided' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('sleep/import error:', err);
    return res.status(500).json({ error: 'Failed to process CSV: ' + err.message });
  }
}

function parseAppleHealthCSV(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Parse header row
  const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  // Detect Apple Health export format (has 'type', 'startdate', 'enddate', 'value')
  const hasType = rawHeaders.some(h => h === 'type');
  const hasStart = rawHeaders.some(h => h.includes('start'));
  const hasEnd = rawHeaders.some(h => h.includes('end'));

  if (hasType && hasStart && hasEnd) {
    return parseAppleHealthDetailedFormat(lines, rawHeaders);
  }

  // Fallback: simple format with date, bedtime, wake_time, duration columns
  return parseSimpleFormat(lines, rawHeaders);
}

function parseAppleHealthDetailedFormat(lines, headers) {
  const typeIdx = headers.findIndex(h => h === 'type');
  const startIdx = headers.findIndex(h => h.includes('start'));
  const endIdx = headers.findIndex(h => h.includes('end'));

  // Map of date → aggregated data
  const byDate = {};

  const STAGE_TYPES = {
    'hkcategoryvaluesleepanalysisasleeprem': 'rem',
    'hkcategoryvaluesleepanalysisasleepdeep': 'deep',
    'hkcategoryvaluesleepanalysisasleepcore': 'core',
    'hkcategoryvaluesleepanalysisawake': 'awake',
    'hkcategoryvaluesleepanalysisasleepunspecified': 'core',
    'asleep - rem': 'rem',
    'asleep - deep': 'deep',
    'asleep - core': 'core',
    'awake': 'awake',
    'inbed': 'inbed',
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < Math.max(typeIdx, startIdx, endIdx) + 1) continue;

    const typeRaw = (cols[typeIdx] || '').replace(/^"|"$/g, '').trim();
    const typeLow = typeRaw.toLowerCase();
    const stage = Object.keys(STAGE_TYPES).find(k => typeLow.includes(k));
    if (!stage) continue;

    const stageKey = STAGE_TYPES[stage];
    if (stageKey === 'inbed') continue; // skip "in bed" non-sleep time

    const startStr = (cols[startIdx] || '').replace(/^"|"$/g, '').trim();
    const endStr = (cols[endIdx] || '').replace(/^"|"$/g, '').trim();

    const startDt = parseAppleDate(startStr);
    const endDt = parseAppleDate(endStr);
    if (!startDt || !endDt) continue;

    const durationMins = Math.round((endDt - startDt) / 60000);
    if (durationMins <= 0) continue;

    // Group by the "sleep date" — use the date of wake_time (end) if after midnight
    const sleepDate = getSleepDate(startDt, endDt);

    if (!byDate[sleepDate]) {
      byDate[sleepDate] = {
        date: sleepDate,
        bedtime: startDt,
        wake_time: endDt,
        rem_minutes: 0,
        deep_minutes: 0,
        core_minutes: 0,
        awake_minutes: 0,
      };
    }

    const d = byDate[sleepDate];
    if (startDt < d.bedtime) d.bedtime = startDt;
    if (endDt > d.wake_time) d.wake_time = endDt;

    if (stageKey === 'rem') d.rem_minutes += durationMins;
    else if (stageKey === 'deep') d.deep_minutes += durationMins;
    else if (stageKey === 'core') d.core_minutes += durationMins;
    else if (stageKey === 'awake') d.awake_minutes += durationMins;
  }

  return Object.values(byDate).map(d => ({
    date: d.date,
    bedtime: d.bedtime.toISOString(),
    wake_time: d.wake_time.toISOString(),
    duration_minutes: d.rem_minutes + d.deep_minutes + d.core_minutes,
    rem_minutes: d.rem_minutes,
    deep_minutes: d.deep_minutes,
    core_minutes: d.core_minutes,
    awake_minutes: d.awake_minutes,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function parseSimpleFormat(lines, headers) {
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const bedtimeIdx = headers.findIndex(h => h.includes('bed'));
  const wakeIdx = headers.findIndex(h => h.includes('wake') || h.includes('end'));
  const durationIdx = headers.findIndex(h => h.includes('duration') || h.includes('hour'));

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const date = dateIdx >= 0 ? cols[dateIdx]?.replace(/^"|"$/g, '').trim() : null;
    if (!date) continue;

    const isoDate = toISO(date);
    if (!isoDate) continue;

    const bedtime = bedtimeIdx >= 0 ? cols[bedtimeIdx]?.replace(/^"|"$/g, '').trim() : null;
    const wake_time = wakeIdx >= 0 ? cols[wakeIdx]?.replace(/^"|"$/g, '').trim() : null;
    const durationRaw = durationIdx >= 0 ? parseFloat(cols[durationIdx]) : null;
    const duration_minutes = durationRaw ? Math.round(durationRaw * 60) : null;

    results.push({ date: isoDate, bedtime: bedtime || null, wake_time: wake_time || null, duration_minutes });
  }
  return results;
}

function parseAppleDate(str) {
  if (!str) return null;
  // Apple Health format: "2024-01-15 22:30:00 +1100" or ISO
  const clean = str.replace(' +', '+').replace(' -', '-');
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function getSleepDate(startDt, endDt) {
  // The sleep date is the date the person went to sleep
  // If start is before 3am, it belongs to the previous day's sleep
  const h = startDt.getHours();
  const d = new Date(startDt);
  if (h < 12) d.setDate(d.getDate() - 1); // treat early-morning as previous night
  return d.toISOString().slice(0, 10);
}

function toISO(dateStr) {
  if (!dateStr) return null;
  // Handle DD/MM/YYYY
  const auMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (auMatch) return `${auMatch[3]}-${auMatch[2].padStart(2,'0')}-${auMatch[1].padStart(2,'0')}`;
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}
