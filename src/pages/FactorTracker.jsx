import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatDuration, toISODate } from '../utils/dateUtils.js';
import { SkeletonCard } from '../components/LoadingSkeleton.jsx';

function Stepper({ value, onChange, min = 0, max = 10 }) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
      >−</button>
      <span className="stepper-value">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
      >+</button>
    </div>
  );
}

const EMPTY_FORM = {
  caffeine_cups: 0,
  alcohol_units: 0,
  stress_level: 5,
  screen_time_minutes: 0,
  exercised: false,
  exercise_minutes: 30,
  exercise_type: '',
  notes: '',
};

function calcCorrelation(factors, sleepEntries, label, filterFn) {
  const entryMap = {};
  for (const e of sleepEntries) { if (e.date) entryMap[e.date] = e; }

  const withSleep = factors
    .map((f) => ({ factor: f, entry: entryMap[f.date] }))
    .filter((x) => x.entry?.duration_minutes);

  const groupA = withSleep.filter((x) => filterFn(x.factor, true));
  const groupB = withSleep.filter((x) => filterFn(x.factor, false));

  if (groupA.length < 5 || groupB.length < 5) return null;

  const avgScore = (group) => {
    const scores = group.map((x) => x.entry.sleep_score || (x.entry.duration_minutes / 60) * 10);
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  return { label, scoreA: avgScore(groupA), scoreB: avgScore(groupB), countA: groupA.length, countB: groupB.length };
}

export default function FactorTracker() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const todayISO = toISODate(new Date());

  const [todayFactor, setTodayFactor] = useState(null);
  const [history, setHistory] = useState([]);
  const [sleepEntries, setSleepEntries] = useState([]);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [factorsRes, sleepRes] = await Promise.all([
        api.get('/api/factors?days=30'),
        api.get('/api/sleep?days=30'),
      ]);
      const factors = factorsRes.factors || factorsRes || [];
      const entries = sleepRes.entries || sleepRes || [];
      setSleepEntries(entries);
      const today = factors.find((f) => f.date === todayISO);
      setTodayFactor(today || null);
      setHistory(factors.filter((f) => f.date !== todayISO).sort((a, b) => (b.date > a.date ? 1 : -1)));
      if (today) {
        setForm({
          caffeine_cups: today.caffeine_cups ?? 0,
          alcohol_units: today.alcohol_units ?? 0,
          stress_level: today.stress_level ?? 5,
          screen_time_minutes: today.screen_time_minutes ?? 0,
          exercised: today.exercised ?? false,
          exercise_minutes: today.exercise_minutes ?? 30,
          exercise_type: today.exercise_type ?? '',
          notes: today.notes ?? '',
        });
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
    setSuccess(null);
    try {
      const payload = { date: todayISO, ...form };
      if (!form.exercised) {
        payload.exercise_minutes = null;
        payload.exercise_type = '';
      }
      if (todayFactor?.id) {
        await api.put(`/api/factors/${todayFactor.id}`, payload);
      } else {
        await api.post('/api/factors', payload);
      }
      setSuccess('Factors saved for today!');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const allFactors = [todayFactor, ...history].filter(Boolean);

  const exerciseCorr = calcCorrelation(allFactors, sleepEntries, 'Exercise', (f, inA) =>
    inA ? f.exercised : !f.exercised
  );
  const caffeineCorr = calcCorrelation(allFactors, sleepEntries, 'Caffeine', (f, inA) =>
    inA ? (f.caffeine_cups ?? 0) <= 1 : (f.caffeine_cups ?? 0) > 2
  );
  const stressCorr = calcCorrelation(allFactors, sleepEntries, 'Stress', (f, inA) =>
    inA ? (f.stress_level ?? 5) <= 4 : (f.stress_level ?? 5) > 6
  );

  const entryMap = {};
  for (const e of sleepEntries) { if (e.date) entryMap[e.date] = e; }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Factor Tracker 📊</h1>
        <p className="page-subtitle">Track lifestyle factors that affect your sleep.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>✓ {success}</div>}

      {/* Today's Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>
          Today's Factors
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Caffeine (cups)</label>
              <Stepper value={form.caffeine_cups} onChange={(v) => setForm({ ...form, caffeine_cups: v })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Alcohol (units)</label>
              <Stepper value={form.alcohol_units} onChange={(v) => setForm({ ...form, alcohol_units: v })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Stress Level: {form.stress_level}/10</label>
            <input
              type="range"
              className="slider"
              min="1"
              max="10"
              value={form.stress_level}
              onChange={(e) => setForm({ ...form, stress_level: Number(e.target.value) })}
            />
            <div className="slider-labels">
              <span>Relaxed</span>
              <span>Very stressed</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Screen Time Before Bed (minutes)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="480"
              value={form.screen_time_minutes}
              onChange={(e) => setForm({ ...form, screen_time_minutes: Math.max(0, Number(e.target.value)) })}
              style={{ maxWidth: 160 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Exercise Today</label>
            <label className="toggle-wrapper" style={{ display: 'inline-flex' }}>
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={form.exercised}
                  onChange={(e) => setForm({ ...form, exercised: e.target.checked })}
                />
                <span className="toggle-slider" />
              </span>
              <span style={{ fontSize: '0.9rem', color: form.exercised ? 'var(--color-success)' : 'var(--color-soft-silver)' }}>
                {form.exercised ? 'Yes, I exercised' : 'No exercise today'}
              </span>
            </label>

            {form.exercised && (
              <div className="form-row" style={{ marginTop: '0.75rem' }}>
                <div>
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="480"
                    value={form.exercise_minutes}
                    onChange={(e) => setForm({ ...form, exercise_minutes: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label">Type (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Running, Yoga..."
                    value={form.exercise_type}
                    onChange={(e) => setForm({ ...form, exercise_type: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-input"
              value={form.notes}
              placeholder="Anything else that might affect your sleep tonight..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : todayFactor ? 'Update Factors' : 'Save Factors'}
          </button>
        </form>
      </div>

      {/* Correlations */}
      {(exerciseCorr || caffeineCorr || stressCorr) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Sleep Correlations</h3>
          <p className="card-subtitle">Based on your tracked data.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {exerciseCorr && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(155,142,196,0.08)', borderRadius: 10, border: '1px solid rgba(155,142,196,0.15)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-soft-silver)', marginBottom: '0.4rem' }}>Exercise Effect on Sleep</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-green">{exerciseCorr.scoreA} avg on exercise nights ({exerciseCorr.countA})</span>
                  <span style={{ color: 'rgba(192,200,216,0.4)', fontSize: '0.8rem' }}>vs</span>
                  <span className="badge badge-lavender">{exerciseCorr.scoreB} avg on rest days ({exerciseCorr.countB})</span>
                </div>
              </div>
            )}
            {caffeineCorr && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(155,142,196,0.08)', borderRadius: 10, border: '1px solid rgba(155,142,196,0.15)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-soft-silver)', marginBottom: '0.4rem' }}>Caffeine Effect (≤1 cup vs 2+ cups)</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-green">{caffeineCorr.scoreA} avg with low caffeine ({caffeineCorr.countA})</span>
                  <span style={{ color: 'rgba(192,200,216,0.4)', fontSize: '0.8rem' }}>vs</span>
                  <span className="badge badge-red">{caffeineCorr.scoreB} avg with high caffeine ({caffeineCorr.countB})</span>
                </div>
              </div>
            )}
            {stressCorr && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(155,142,196,0.08)', borderRadius: 10, border: '1px solid rgba(155,142,196,0.15)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-soft-silver)', marginBottom: '0.4rem' }}>Stress Effect (low ≤4 vs high 7+)</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-green">{stressCorr.scoreA} avg with low stress ({stressCorr.countA})</span>
                  <span style={{ color: 'rgba(192,200,216,0.4)', fontSize: '0.8rem' }}>vs</span>
                  <span className="badge badge-red">{stressCorr.scoreB} avg with high stress ({stressCorr.countB})</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>History (Last 30 Days)</h3>
        {loading ? (
          <SkeletonCard height={200} />
        ) : history.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-text" style={{ fontSize: '1rem' }}>No factor history yet</div>
            <div className="empty-state-sub">Start logging daily factors to see patterns.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Caffeine</th>
                  <th>Alcohol</th>
                  <th>Stress</th>
                  <th>Exercise</th>
                  <th>Sleep Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((f) => {
                  const sleep = entryMap[f.date];
                  const d = new Date(f.date + 'T00:00:00');
                  return (
                    <tr key={f.id}>
                      <td>{formatDate(d)}</td>
                      <td>{f.caffeine_cups ?? '—'} cup{f.caffeine_cups !== 1 ? 's' : ''}</td>
                      <td>{f.alcohol_units ?? '—'}</td>
                      <td>
                        <span style={{ color: (f.stress_level || 5) > 7 ? 'var(--color-danger)' : (f.stress_level || 5) > 4 ? 'var(--color-soft-gold)' : 'var(--color-success)' }}>
                          {f.stress_level ?? '—'}/10
                        </span>
                      </td>
                      <td>
                        {f.exercised ? (
                          <span style={{ color: 'var(--color-success)' }}>
                            ✓{f.exercise_minutes ? ` ${f.exercise_minutes}m` : ''}
                            {f.exercise_type ? ` ${f.exercise_type}` : ''}
                          </span>
                        ) : <span style={{ color: 'rgba(192,200,216,0.4)' }}>—</span>}
                      </td>
                      <td>
                        {sleep ? (
                          <span className="badge badge-lavender">
                            {sleep.sleep_score != null ? sleep.sleep_score : formatDuration(sleep.duration_minutes)}
                          </span>
                        ) : <span style={{ color: 'rgba(192,200,216,0.3)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
