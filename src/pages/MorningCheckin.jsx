import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatTime, formatDuration, toISODate } from '../utils/dateUtils.js';
import { SkeletonCard, SkeletonText } from '../components/LoadingSkeleton.jsx';

const MOODS = ['great', 'good', 'okay', 'tired', 'exhausted'];

const MOOD_EMOJI = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tired: '😴',
  exhausted: '😵',
};

export default function MorningCheckin() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);

  const todayISO = toISODate(new Date());

  const [todayCheckin, setTodayCheckin] = useState(null);
  const [history, setHistory] = useState([]);
  const [sleepEntries, setSleepEntries] = useState([]);

  const [form, setForm] = useState({
    rest_feeling: 7,
    mood: 'good',
    notes: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [checkinsRes, sleepRes] = await Promise.all([
        api.get('/api/checkins?days=14'),
        api.get('/api/sleep?days=14'),
      ]);
      const checkins = checkinsRes.checkins || checkinsRes || [];
      const entries = Array.isArray(sleepRes) ? sleepRes : [];
      const today = checkins.find((c) => c.date === todayISO);
      setTodayCheckin(today || null);
      setHistory(checkins.filter((c) => c.date !== todayISO).sort((a, b) => (b.date > a.date ? 1 : -1)));
      setSleepEntries(entries);
      if (today) {
        setForm({ rest_feeling: today.rest_feeling || 7, mood: today.mood || 'good', notes: today.notes || '' });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { date: todayISO, ...form };
      if (todayCheckin?.id) {
        await api.put(`/api/checkins/${todayCheckin.id}`, payload);
      } else {
        await api.post('/api/checkins', payload);
      }
      setSuccess(true);
      setEditing(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const entryMap = {};
  for (const e of sleepEntries) { if (e.date) entryMap[e.date] = e; }

  const showForm = !todayCheckin || editing;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Morning Check-In ☀️</h1>
        <p className="page-subtitle">How did you sleep last night?</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Success animation */}
      {success && !editing && (
        <div className="card fade-in-up" style={{ marginBottom: '1.5rem', borderColor: 'rgba(104,211,145,0.3)', background: 'rgba(72,187,120,0.08)', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌙</div>
          <h3 style={{ color: 'var(--color-success)', marginBottom: '0.5rem', fontFamily: 'Playfair Display, Georgia, serif' }}>Thanks! Sweet dreams tonight</h3>
          <p style={{ color: 'var(--color-soft-silver)', fontSize: '0.9rem' }}>Your check-in has been saved. Keep tracking your sleep for better insights!</p>
        </div>
      )}

      {/* Today's check-in display */}
      {todayCheckin && !editing && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Today's Check-In</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(true); setSuccess(false); }}>Edit</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div>
              <div className="card-label">Rest Feeling</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-soft-gold)' }}>{todayCheckin.rest_feeling}/10</div>
            </div>
            {todayCheckin.mood && (
              <div>
                <div className="card-label">Mood</div>
                <div style={{ fontSize: '1.1rem' }}>{MOOD_EMOJI[todayCheckin.mood]} {todayCheckin.mood.charAt(0).toUpperCase() + todayCheckin.mood.slice(1)}</div>
              </div>
            )}
          </div>
          {todayCheckin.notes && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="card-label">Notes</div>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>{todayCheckin.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
            {todayCheckin ? 'Edit Today\'s Check-In' : 'How are you feeling this morning?'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">How rested do you feel? {form.rest_feeling}/10</label>
              <input
                type="range"
                className="slider"
                min="1"
                max="10"
                value={form.rest_feeling}
                onChange={(e) => setForm({ ...form, rest_feeling: Number(e.target.value) })}
              />
              <div className="slider-labels">
                <span>Exhausted</span>
                <span>Fully rested</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mood on waking</label>
              <div className="pill-group">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`pill-btn${form.mood === m ? ' selected' : ''}`}
                    onClick={() => setForm({ ...form, mood: m })}
                  >
                    {MOOD_EMOJI[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Anything notable? <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
              <textarea
                className="form-input"
                value={form.notes}
                placeholder="Dreams, disruptions, anything on your mind..."
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : todayCheckin ? 'Update Check-In' : 'Save Check-In'}
              </button>
              {editing && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(false); setSuccess(false); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Recent Check-Ins</h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={80} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-text" style={{ fontSize: '1rem' }}>No previous check-ins</div>
            <div className="empty-state-sub">Your check-in history will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((checkin) => {
              const sleep = entryMap[checkin.date];
              const d = new Date(checkin.date + 'T00:00:00');
              return (
                <div
                  key={checkin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 12,
                    border: '1px solid rgba(155,142,196,0.15)',
                    background: 'rgba(26,16,64,0.3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 52, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-warm-cream)', lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-soft-silver)', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('en-AU', { month: 'short' })}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {checkin.mood && (
                        <span>{MOOD_EMOJI[checkin.mood]} {checkin.mood.charAt(0).toUpperCase() + checkin.mood.slice(1)}</span>
                      )}
                      <span className="badge badge-gold">Rest: {checkin.rest_feeling}/10</span>
                      {sleep && (
                        <span className="badge badge-lavender">{formatDuration(sleep.duration_minutes)}</span>
                      )}
                    </div>
                    {checkin.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'rgba(192,200,216,0.6)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {checkin.notes}
                      </div>
                    )}
                  </div>

                  {sleep && (
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-soft-silver)' }}>Sleep</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-soft-gold)', fontWeight: 600 }}>
                        {formatTime(sleep.bedtime)} – {formatTime(sleep.wake_time)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
