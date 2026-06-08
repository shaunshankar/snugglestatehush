import { toISODate } from './dateUtils.js';

/**
 * Determine a colour category for a sleep entry based on score and duration.
 * Returns 'green', 'amber', 'red', or 'empty'.
 * @param {number|null} score - sleep_score (1–100) or rest_quality_rating (1–10)
 * @param {number|null} durationMinutes
 * @returns {'green'|'amber'|'red'|'empty'}
 */
export function getSleepColor(score, durationMinutes) {
  if (!durationMinutes && !score) return 'empty';
  const hours = (durationMinutes || 0) / 60;
  if (hours >= 7 || (score && score >= 7)) return 'green';
  if (hours >= 6 || (score && score >= 4)) return 'amber';
  return 'red';
}

/**
 * Format a bedtime ISO string as a 12-hour time (e.g. "10:45 PM")
 * @param {string|null} isoString
 * @returns {string}
 */
export function formatBedtime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate a current streak of consecutive nights where sleep goals were met.
 * A night counts if:
 *   - duration_minutes >= targetDurationHours * 60 * 0.9  (within 10% of target)
 *   AND
 *   - bedtime is no later than targetBedtime + 30 minutes (if bedtime recorded)
 *
 * @param {Array} entries - sleep_entries sorted by date descending
 * @param {string} targetBedtime - e.g. "22:30:00"
 * @param {number} targetDurationHours - e.g. 8
 * @returns {{ current: number, longest: number }}
 */
export function calculateStreak(entries, targetBedtime = '22:30:00', targetDurationHours = 8) {
  if (!entries || entries.length === 0) return { current: 0, longest: 0 };

  const targetDurationMinutes = targetDurationHours * 60 * 0.9; // 90% threshold
  const [targetHour, targetMinute] = targetBedtime.split(':').map(Number);

  // Build a set of dates where sleep goals were met
  const goodNights = new Set();

  for (const entry of entries) {
    if (!entry.date) continue;
    const meetsHours = entry.duration_minutes >= targetDurationMinutes;

    let meetsBedtime = true;
    if (entry.bedtime) {
      const bedtimeDate = new Date(entry.bedtime);
      const bedtimeHour = bedtimeDate.getHours();
      const bedtimeMinute = bedtimeDate.getMinutes();
      const bedtimeTotalMinutes = bedtimeHour * 60 + bedtimeMinute;
      const targetTotalMinutes = targetHour * 60 + targetMinute;
      // Allow up to 30 minutes past target
      meetsBedtime = bedtimeTotalMinutes <= targetTotalMinutes + 30;
    }

    if (meetsHours && meetsBedtime) {
      goodNights.add(entry.date);
    }
  }

  // Calculate current streak (consecutive days ending today or yesterday)
  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);
  // If today has no entry, start checking from yesterday
  if (!goodNights.has(toISODate(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (goodNights.has(toISODate(checkDate))) {
    current++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak ever
  let longest = 0;
  let runLength = 0;

  if (goodNights.size > 0) {
    // Sort all good night dates ascending
    const sortedDates = Array.from(goodNights).sort();
    let prevDate = null;

    for (const dateStr of sortedDates) {
      const d = new Date(dateStr + 'T00:00:00');
      if (prevDate) {
        const diffDays = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          runLength++;
        } else {
          longest = Math.max(longest, runLength);
          runLength = 1;
        }
      } else {
        runLength = 1;
      }
      prevDate = d;
    }
    longest = Math.max(longest, runLength);
  }

  return { current, longest };
}

/**
 * Calculate the weekly average sleep duration in minutes from an array of entries.
 * Uses entries from the last 7 days only.
 * @param {Array} entries - sleep_entries
 * @returns {number} average minutes (0 if no data)
 */
export function weeklyAvgDuration(entries) {
  if (!entries || entries.length === 0) return 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recent = entries.filter((e) => {
    if (!e.date || !e.duration_minutes) return false;
    const d = new Date(e.date + 'T00:00:00');
    return d >= sevenDaysAgo;
  });

  if (recent.length === 0) return 0;
  const total = recent.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  return Math.round(total / recent.length);
}

/**
 * Calculate a sleep quality score from 0–100 based on available data.
 * @param {Object} entry - sleep_entry row
 * @returns {number}
 */
export function computeSleepScore(entry) {
  if (!entry) return 0;

  // If we already have a score, use it
  if (entry.sleep_score) return entry.sleep_score;

  let score = 0;
  let factors = 0;

  // Duration factor (max 40 pts): ideal is 7.5–9 hours
  if (entry.duration_minutes) {
    const hours = entry.duration_minutes / 60;
    let durationScore = 0;
    if (hours >= 7.5 && hours <= 9) {
      durationScore = 40;
    } else if (hours >= 7 || hours <= 9.5) {
      durationScore = 32;
    } else if (hours >= 6 || hours <= 10) {
      durationScore = 20;
    } else {
      durationScore = 10;
    }
    score += durationScore;
    factors += 40;
  }

  // Quality rating factor (max 40 pts)
  if (entry.rest_quality_rating) {
    score += (entry.rest_quality_rating / 10) * 40;
    factors += 40;
  }

  // Sleep stages factor (max 20 pts)
  if (entry.duration_minutes && entry.rem_minutes != null) {
    const totalSleepMinutes = entry.duration_minutes - (entry.awake_minutes || 0);
    if (totalSleepMinutes > 0) {
      const remPercent = entry.rem_minutes / totalSleepMinutes;
      const deepPercent = entry.deep_minutes / totalSleepMinutes;
      // Ideal REM ~25%, Deep ~20%
      let stageScore = 0;
      if (remPercent >= 0.2 && remPercent <= 0.3) stageScore += 10;
      else if (remPercent >= 0.15) stageScore += 6;
      else stageScore += 2;
      if (deepPercent >= 0.15 && deepPercent <= 0.25) stageScore += 10;
      else if (deepPercent >= 0.1) stageScore += 6;
      else stageScore += 2;
      score += stageScore;
      factors += 20;
    }
  }

  if (factors === 0) return 0;
  return Math.round((score / factors) * 100);
}

/**
 * Get a human-readable label for a sleep score
 * @param {number} score
 * @returns {string}
 */
export function getSleepScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Very Poor';
}

/**
 * Get a sleep score category color name
 * @param {number} score
 * @returns {'green'|'amber'|'red'}
 */
export function getSleepScoreColor(score) {
  if (score >= 70) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}
