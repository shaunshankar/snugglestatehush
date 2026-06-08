import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toISODate, formatDate } from '../utils/dateUtils.js';
import { calculateStreak } from '../utils/sleepUtils.js';
import { SkeletonCard, SkeletonText } from '../components/LoadingSkeleton.jsx';

const MILESTONES = [
  { nights: 3, label: 'Great start!', emoji: '🌙', desc: '3 nights in a row' },
  { nights: 7, label: 'One full week!', emoji: '✨', desc: '7 nights in a row' },
  { nights: 14, label: 'Two week warrior!', emoji: '🌟', desc: '14 nights in a row' },
  { nights: 30, label: 'Sleep master!', emoji: '🏆', desc: '30 nights in a row' },
];

function formatTargetBedtime(timeStr) {
  if (!timeStr) return '—';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const p = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${p}`;
}

function goalMet(entry, targetBedtime, targetDurationHours) {
  if (!entry || !entry.duration_minutes) return 0;
  const targetMins = targetDurationHours * 60;
  const meetsHours = entry.duration_minutes >= targetMins;

  let meetsBedtime = true;
  if (entry.bedtime && targetBedtime) {
    const [th, tm] = targetBedtime.split(':').map(Number);
    const bedDate = new Date(entry.bedtime);
    const bh = bedDate.getHours();
    const bm = bedDate.getMinutes();
    const targetTotal = th * 60 + tm;
    const bedTotal = bh * 60 + bm;
    // Handle midnight crossover
    const diff = bedTotal <= targetTotal ? targetTotal - bedTotal : 1440 - bedTotal + targetTotal;
    meetsBedtime = diff <= 30;
  }

  if (meetsHours && meetsBedtime) return 3; // exceeded: both met
  if (meetsHours || meetsBedtime) return 1; // partial
  return 0;
}

function HeatmapCell({ date, level, isToday }) {
  const [tip, setTip] = useState(false);
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const statusLabel = level === 3 ? 'Goal met' : level === 2 ? 'Goal met' : level === 1 ? 'Partial' : 'No data';

  return (
    <div
      className={`heatmap-cell level-${level}${isToday ? ' today-cell' : ''}`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      style={{ position: 'relative' }}
      title={`${label}: ${statusLabel}`}
    >
      {tip && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26,16,64,0.97)',
          border: '1px solid rgba(155,142,196,0.3)',
          borderRadius: 8,
          padding: '4px 8px',
          whiteSpace: 'nowrap',
          fontSize: '0.7rem',
          color: 'var(--color-soft-silver)',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {label} · {statusLabel}
        </div>
      )}
    </div>
  );
}

export default function Streaks() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [goalForm, setGoalForm] = useState({
    target_bedtime: user?.target_bedtime ? user.target_bedtime.slice(0, 5) : '22:30',
    target_duration_hours: user?.target_duration_hours || 8,
  });
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalSuccess, setGoalSuccess] = useState(null);
  const [goalError, setGoalError] = useState(null);

  const todayISO = toISODate(new Date());
  const targetBedtime = user?.target_bedtime || '22:30:00';
  const targetDurationHours = user?.target_duration_hours || 8;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/sleep?days=365');
        setEntries(Array.isArray(res) ? res : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = [...entries].sort((a, b) => (b.date > a.date ? 1 : -1));
  const streak = calculateStreak(sorted, targetBedtime, targetDurationHours);

  // Nights goal met this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= monthStart;
  });
  const goalMetThisMonth = thisMonthEntries.filter((e) => goalMet(e, targetBedtime, targetDurationHours) >= 2).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = Math.min(now.getDate(), daysInMonth);

  // Heatmap: last 12 weeks
  const heatmapDays = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    heatmapDays.push(toISODate(d));
  }

  const entryMap = {};
  for (const e of entries) { if (e.date) entryMap[e.date] = e; }

  // Reorder heatmap to start on Monday
  const firstDate = new Date(heatmapDays[0] + 'T00:00:00');
  const firstDow = firstDate.getDay(); // 0=Sun
  const offsetToMon = firstDow === 0 ? 6 : firstDow - 1;
  const paddedDays = [...Array(offsetToMon).fill(null), ...heatmapDays];

  // Month labels for heatmap
  const monthLabels = [];
  for (let col = 0; col < Math.ceil(paddedDays.length / 7); col++) {
    const dayIdx = col * 7 - offsetToMon;
    if (dayIdx >= 0 && dayIdx < heatmapDays.length) {
      const d = new Date(heatmapDays[dayIdx] + 'T00:00:00');
      const label = d.toLocaleDateString('en-AU', { month: 'short' });
      if (col === 0 || label !== monthLabels[monthLabels.length - 1]?.label) {
        monthLabels.push({ col, label });
      }
    }
  }

  // Current milestone
  const currentMilestone = [...MILESTONES].reverse().find((m) => streak.current >= m.nights);

  async function handleSaveGoals(e) {
    e.preventDefault();
    setSavingGoals(true);
    setGoalError(null);
    setGoalSuccess(null);
    try {
      const payload = {
        target_bedtime: `${goalForm.target_bedtime}:00`,
        target_duration_hours: Number(goalForm.target_duration_hours),
      };
      const res = await api.put('/api/users/goals', payload);
      updateUser({ ...user, ...payload });
      setGoalSuccess('Goals updated!');
    } catch (err) {
      setGoalError(err.message);
    } finally {
      setSavingGoals(false);
    }
  }

  const numWeeks = Math.ceil(paddedDays.length / 7);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Streaks & Goals 🔥</h1>
        <p className="page-subtitle">Track your consistency and celebrate progress.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card">
                <SkeletonText width="50%" style={{ marginBottom: '0.5rem' }} />
                <SkeletonText width="35%" style={{ height: '1.8em' }} />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="card-label">Current Streak</div>
              <div className="card-value">{streak.current} 🔥</div>
              <div className="text-xs text-silver">consecutive nights</div>
            </div>
            <div className="stat-card">
              <div className="card-label">Longest Streak</div>
              <div className="card-value">{streak.longest} 🌙</div>
              <div className="text-xs text-silver">personal best</div>
            </div>
            <div className="stat-card">
              <div className="card-label">Goal Nights This Month</div>
              <div className="card-value">{goalMetThisMonth} / {daysPassed}</div>
              <div className="text-xs text-silver">nights goal met</div>
            </div>
            <div className="stat-card">
              <div className="card-label">Sleep Goal</div>
              <div style={{ fontSize: '1rem', color: 'var(--color-soft-gold)', fontWeight: 600, marginTop: '0.25rem' }}>
                {formatTargetBedtime(targetBedtime)}
              </div>
              <div className="text-xs text-silver">{targetDurationHours}h target · bed by {formatTargetBedtime(targetBedtime)}</div>
            </div>
          </>
        )}
      </div>

      {/* Milestone Celebration */}
      {!loading && currentMilestone && (
        <div
          className="card fade-in-up"
          style={{
            marginBottom: '1.5rem',
            textAlign: 'center',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            padding: '2rem',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{currentMilestone.emoji}</div>
          <h3 style={{ color: 'var(--color-soft-gold)', fontFamily: 'Playfair Display, Georgia, serif', marginBottom: '0.25rem' }}>
            {currentMilestone.label}
          </h3>
          <p style={{ color: 'var(--color-soft-silver)', fontSize: '0.9rem' }}>
            You've achieved {currentMilestone.desc} — {currentMilestone.nights === streak.current ? 'right now!' : 'and counting!'}
          </p>
        </div>
      )}

      {/* Heatmap */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Sleep Consistency — Last 12 Weeks</h3>

        {loading ? (
          <SkeletonCard height={120} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Month labels */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gap: 4, marginBottom: 4, minWidth: numWeeks * 18 }}>
              {Array.from({ length: numWeeks }, (_, col) => {
                const ml = monthLabels.find((m) => m.col === col);
                return (
                  <div key={col} style={{ fontSize: '0.65rem', color: 'rgba(192,200,216,0.5)', textAlign: 'left', paddingLeft: 2 }}>
                    {ml ? ml.label : ''}
                  </div>
                );
              })}
            </div>

            {/* Day labels row */}
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 4, marginRight: 4 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} style={{ width: 10, fontSize: '0.6rem', color: 'rgba(192,200,216,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)', gap: 4, flex: 1, minWidth: numWeeks * 18 }}>
                {/* Render column by column (weeks) */}
                {Array.from({ length: numWeeks }, (_, weekIdx) =>
                  Array.from({ length: 7 }, (_, dow) => {
                    const idx = weekIdx * 7 + dow;
                    const date = paddedDays[idx];
                    if (!date) {
                      return <div key={`${weekIdx}-${dow}`} style={{ aspectRatio: 1 }} />;
                    }
                    const entry = entryMap[date];
                    const level = entry ? goalMet(entry, targetBedtime, targetDurationHours) : 0;
                    const isToday = date === todayISO;
                    return (
                      <HeatmapCell
                        key={`${weekIdx}-${dow}`}
                        date={date}
                        level={level}
                        isToday={isToday}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-soft-silver)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(192,200,216,0.1)' }} />No data
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-soft-silver)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(155,142,196,0.3)' }} />Partial
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-soft-silver)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(155,142,196,0.9)' }} />Goal met
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Milestones List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Milestones</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {MILESTONES.map((m) => {
            const achieved = streak.longest >= m.nights || streak.current >= m.nights;
            return (
              <div
                key={m.nights}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  border: `1px solid ${achieved ? 'rgba(201,168,76,0.35)' : 'rgba(155,142,196,0.15)'}`,
                  background: achieved ? 'rgba(201,168,76,0.08)' : 'rgba(26,16,64,0.3)',
                  opacity: achieved ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: achieved ? 'var(--color-soft-gold)' : 'var(--color-soft-silver)' }}>{m.label}</div>
                  <div className="text-xs text-silver">{m.desc}</div>
                </div>
                {achieved && <span className="badge badge-gold">Achieved!</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Goals */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Edit Sleep Goals</h3>
        <p className="card-subtitle">Your target bedtime and duration used for streak calculation.</p>

        {goalError && <div className="alert alert-error">{goalError}</div>}
        {goalSuccess && <div className="alert alert-success">✓ {goalSuccess}</div>}

        <form onSubmit={handleSaveGoals}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Bedtime</label>
              <input
                type="time"
                className="form-input"
                value={goalForm.target_bedtime}
                onChange={(e) => setGoalForm({ ...goalForm, target_bedtime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Duration (hours)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="12"
                step="0.5"
                value={goalForm.target_duration_hours}
                onChange={(e) => setGoalForm({ ...goalForm, target_duration_hours: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingGoals}>
            {savingGoals ? 'Saving…' : 'Save Goals'}
          </button>
        </form>
      </div>
    </div>
  );
}
