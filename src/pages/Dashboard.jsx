import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDuration, formatTime, getGreeting, toISODate } from '../utils/dateUtils.js';
import { calculateStreak, weeklyAvgDuration } from '../utils/sleepUtils.js';
import WeekCalendar from '../components/WeekCalendar.jsx';
import { SkeletonStatCard, SkeletonCard, SkeletonText } from '../components/LoadingSkeleton.jsx';

function formatTargetBedtime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${minutes} ${period}`;
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? '#c9a84c' : pct >= 50 ? '#9b8ec4' : '#ff8080';
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span className="text-xs text-silver">Sleep score</span>
        <span className="text-xs" style={{ color }}>{pct}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [error, setError] = useState(null);

  const todayISO = toISODate(new Date());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [entriesRes, checkinsRes] = await Promise.all([
          api.get('/api/sleep?days=30'),
          api.get('/api/checkins?days=7'),
        ]);
        const allEntries = Array.isArray(entriesRes) ? entriesRes : [];
        const allCheckins = Array.isArray(checkinsRes) ? checkinsRes : [];
        setEntries(allEntries);
        setCheckins(allCheckins);
        const todayCI = allCheckins.find((c) => c.date === todayISO);
        setTodayCheckin(todayCI || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const targetBedtime = formatTargetBedtime(user?.target_bedtime);
  const targetDurationHours = user?.target_duration_hours || 8;

  const sortedEntries = [...entries].sort((a, b) => (b.date > a.date ? 1 : -1));
  const lastNight = sortedEntries[0] || null;
  const isLastNightToday = lastNight?.date === todayISO;
  const displayEntry = lastNight;

  const streak = calculateStreak(sortedEntries, user?.target_bedtime || '22:30:00', targetDurationHours);
  const weeklyAvg = weeklyAvgDuration(entries);

  const recentCheckins = checkins.filter((c) => c.rest_feeling);
  const avgQuality =
    recentCheckins.length > 0
      ? (recentCheckins.reduce((sum, c) => sum + (c.rest_feeling || 0), 0) / recentCheckins.length).toFixed(1)
      : null;

  const lastCheckin = checkins.find((c) => c.date === (displayEntry?.date));

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="greeting">
          {getGreeting()}, {firstName} 🌙
        </h1>
        {targetBedtime && (
          <p className="greeting-sub">Aim to be in bed by {targetBedtime}</p>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid stagger-children" style={{ marginBottom: '1.5rem' }}>
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            {/* Last Night */}
            <div className="stat-card fade-in">
              <div className="card-label">Last night's sleep</div>
              {displayEntry ? (
                <>
                  <div className="card-value">{formatDuration(displayEntry.duration_minutes)}</div>
                  {displayEntry.sleep_score != null && (
                    <div className="text-sm text-silver" style={{ marginTop: '0.25rem' }}>
                      Score: {displayEntry.sleep_score}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="card-value-sm text-silver" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>No data yet</div>
                  <div className="text-xs text-silver" style={{ marginTop: '0.25rem' }}>Log your first night to get started</div>
                </>
              )}
            </div>

            {/* Streak */}
            <div className="stat-card fade-in">
              <div className="card-label">Current streak</div>
              <div className="card-value">
                {streak.current} {streak.current === 1 ? 'night' : 'nights'}
              </div>
              <div className="text-xs text-silver" style={{ marginTop: '0.25rem' }}>
                Best: {streak.longest} nights
              </div>
            </div>

            {/* Weekly Average */}
            <div className="stat-card fade-in">
              <div className="card-label">Weekly average</div>
              <div className="card-value">
                {weeklyAvg ? formatDuration(weeklyAvg) : '—'}
              </div>
              <div className="text-xs text-silver" style={{ marginTop: '0.25rem' }}>
                Last 7 days
              </div>
            </div>

            {/* This Week's Quality */}
            <div className="stat-card fade-in">
              <div className="card-label">This week's quality</div>
              <div className="card-value">
                {avgQuality ? `${avgQuality}/10` : '—'}
              </div>
              <div className="text-xs text-silver" style={{ marginTop: '0.25rem' }}>
                Average rest feeling
              </div>
            </div>
          </>
        )}
      </div>

      {/* Weekly Mini Calendar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>This Week</h3>
          <span className="text-xs text-silver">Last 7 days</span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
            ))}
          </div>
        ) : (
          <WeekCalendar entries={entries} checkins={checkins} />
        )}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span className="text-xs" style={{ color: '#68d391' }}>● 7+ hours</span>
          <span className="text-xs" style={{ color: '#c9a84c' }}>● 6-7 hours</span>
          <span className="text-xs" style={{ color: '#ff8080' }}>● Under 6 hours</span>
          <span className="text-xs text-silver">● No data</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/sleep')}>
            🌙 Log Sleep
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/checkin')}>
            ☀️ Morning Check-In
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/factors')}>
            📊 Log Factors
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => navigate('/insights')}>
            ✨ Get AI Insights
          </button>
        </div>
      </div>

      {/* Last Night Details or Empty State */}
      {loading ? (
        <div className="card">
          <SkeletonText width="40%" style={{ marginBottom: '1rem', height: '1.2em' }} />
          <SkeletonCard height={140} />
        </div>
      ) : entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">✨</span>
            <div className="empty-state-text">Time to start your sleep story</div>
            <div className="empty-state-sub">
              Log your first night to begin tracking your journey
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/sleep')}>
              Log My First Night
            </button>
          </div>
        </div>
      ) : displayEntry ? (
        <div className="card fade-in">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            {isLastNightToday ? "Last Night's Details" : `Night of ${new Date(displayEntry.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div className="card-label">Bedtime</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--color-warm-cream)', fontWeight: 500 }}>
                {formatTime(displayEntry.bedtime)}
              </div>
            </div>
            <div>
              <div className="card-label">Wake Time</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--color-warm-cream)', fontWeight: 500 }}>
                {formatTime(displayEntry.wake_time)}
              </div>
            </div>
            <div>
              <div className="card-label">Duration</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--color-soft-gold)', fontWeight: 600 }}>
                {formatDuration(displayEntry.duration_minutes)}
              </div>
            </div>
            {lastCheckin?.rest_feeling != null && (
              <div>
                <div className="card-label">Rest Feeling</div>
                <div style={{ fontSize: '1.1rem', color: 'var(--color-accent-lavender)', fontWeight: 500 }}>
                  {lastCheckin.rest_feeling}/10
                </div>
              </div>
            )}
          </div>

          {(displayEntry.sleep_score != null || displayEntry.rest_quality_rating != null) && (
            <ScoreBar score={displayEntry.sleep_score || (displayEntry.rest_quality_rating * 10)} />
          )}

          {displayEntry.notes && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="card-label">Notes</div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{displayEntry.notes}</p>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/sleep')}>
              View Full Log
            </button>
            {!todayCheckin && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/checkin')}>
                Add Morning Check-In
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
