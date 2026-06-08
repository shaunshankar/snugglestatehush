import React from 'react';
import { getLast7Days, formatShortDate } from '../utils/dateUtils.js';
import { getSleepColor } from '../utils/sleepUtils.js';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekCalendar({ entries = [], checkins = [] }) {
  const days = getLast7Days();
  const today = days[days.length - 1];

  const entryMap = {};
  for (const e of entries) {
    if (e.date) entryMap[e.date] = e;
  }

  const checkinMap = {};
  for (const c of checkins) {
    if (c.date) checkinMap[c.date] = c;
  }

  return (
    <div className="weekly-mini-cal">
      {days.map((isoDate) => {
        const entry = entryMap[isoDate];
        const checkin = checkinMap[isoDate];
        const score = entry?.sleep_score ?? entry?.rest_quality_rating ?? checkin?.rest_feeling ?? null;
        const duration = entry?.duration_minutes ?? null;
        const color = getSleepColor(score, duration);
        const isToday = isoDate === today;

        const d = new Date(isoDate + 'T00:00:00');
        const dayAbbr = DAY_ABBRS[d.getDay()];
        const dateNum = d.getDate();

        return (
          <div
            key={isoDate}
            className={`day-dot ${color}${isToday ? ' today' : ''}`}
            title={`${formatShortDate(isoDate)}${entry ? ` · ${Math.floor((entry.duration_minutes || 0) / 60)}h ${(entry.duration_minutes || 0) % 60}m` : ' · No data'}`}
          >
            <span className="day-dot-label">{dayAbbr}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{dateNum}</span>
          </div>
        );
      })}
    </div>
  );
}
