/**
 * Format a date as DD/MM/YYYY (Australian style)
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a datetime string as 10:30 PM (12-hour with AM/PM)
 * @param {string} dateStr - ISO string or any parseable date
 * @returns {string}
 */
export function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format duration in minutes as "7h 23m"
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const totalMinutes = Math.round(minutes);
  if (totalMinutes < 0) return '—';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Get a greeting based on the current hour
 * @returns {string}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * Get today's date as YYYY-MM-DD in the Australian/local timezone
 * @returns {string}
 */
export function todayAU() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object or date string to YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get an array of the last 7 days as YYYY-MM-DD strings (oldest first)
 * @returns {string[]}
 */
export function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toISODate(d));
  }
  return days;
}

/**
 * Get an array of the last 30 days as YYYY-MM-DD strings (oldest first)
 * @returns {string[]}
 */
export function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toISODate(d));
  }
  return days;
}

/**
 * Format a YYYY-MM-DD date as a short readable string e.g. "Mon 2 Jun"
 * @param {string} isoDate
 * @returns {string}
 */
export function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return isoDate;
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Get the day abbreviation (Mon, Tue, etc.) from a YYYY-MM-DD string
 * @param {string} isoDate
 * @returns {string}
 */
export function getDayAbbr(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-AU', { weekday: 'short' });
}

/**
 * Calculate how many days ago a date was (0 = today, 1 = yesterday, etc.)
 * @param {string} isoDate
 * @returns {number}
 */
export function daysAgo(isoDate) {
  const today = new Date(todayAU() + 'T00:00:00');
  const d = new Date(isoDate + 'T00:00:00');
  const diff = today - d;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get the start of the current week (Monday) as YYYY-MM-DD
 * @returns {string}
 */
export function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday is start
  now.setDate(now.getDate() - diff);
  return toISODate(now);
}
