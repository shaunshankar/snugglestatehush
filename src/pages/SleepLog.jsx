import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { formatDate, formatTime, formatDuration, toISODate } from '../utils/dateUtils.js';
import SleepChart from '../components/SleepChart.jsx';
import { SkeletonCard } from '../components/LoadingSkeleton.jsx';

function calcDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 1440;
  return mins;
}

const EMPTY_FORM = {
  date: toISODate(new Date()),
  bedtime: '',
  wake_time: '',
  rest_quality_rating: 7,
  source: 'manual',
  notes: '',
};

function SleepEntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(
    entry
      ? {
          date: entry.date || toISODate(new Date()),
          bedtime: entry.bedtime ? entry.bedtime.slice(11, 16) : '',
          wake_time: entry.wake_time ? entry.wake_time.slice(11, 16) : '',
          rest_quality_rating: entry.rest_quality_rating || 7,
          source: entry.source || 'manual',
          notes: entry.notes || '',
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const duration = calcDuration(form.bedtime, form.wake_time);

  async function handleSave() {
    if (!form.date || !form.bedtime || !form.wake_time) {
      setError('Date, bedtime and wake time are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date: form.date,
        bedtime: `${form.date}T${form.bedtime}:00`,
        wake_time: `${form.date}T${form.wake_time}:00`,
        duration_minutes: duration,
        rest_quality_rating: form.rest_quality_rating,
        source: form.source,
        notes: form.notes,
      };
      // If wake is before or equal to bed, treat wake as next day
      const [bh, bm] = form.bedtime.split(':').map(Number);
      const [wh, wm] = form.wake_time.split(':').map(Number);
      if (wh * 60 + wm <= bh * 60 + bm) {
        const wakeDate = new Date(form.date + 'T00:00:00');
        wakeDate.setDate(wakeDate.getDate() + 1);
        payload.wake_time = `${toISODate(wakeDate)}T${form.wake_time}:00`;
      }

      if (entry?.id) {
        await api.put(`/api/sleep/${entry.id}`, payload);
      } else {
        await api.post('/api/sleep', payload);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{entry ? 'Edit Sleep Entry' : 'Add Sleep Entry'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bedtime</label>
            <input
              type="time"
              className="form-input"
              value={form.bedtime}
              onChange={(e) => setForm({ ...form, bedtime: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wake Time</label>
            <input
              type="time"
              className="form-input"
              value={form.wake_time}
              onChange={(e) => setForm({ ...form, wake_time: e.target.value })}
            />
          </div>
        </div>

        {duration != null && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(155,142,196,0.1)', borderRadius: 8, border: '1px solid rgba(155,142,196,0.2)' }}>
            <span className="text-sm text-silver">Duration: </span>
            <span className="text-sm" style={{ color: 'var(--color-soft-gold)', fontWeight: 600 }}>{formatDuration(duration)}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Rest Quality: {form.rest_quality_rating}/10</label>
          <input
            type="range"
            className="slider"
            min="1"
            max="10"
            value={form.rest_quality_rating}
            onChange={(e) => setForm({ ...form, rest_quality_rating: Number(e.target.value) })}
          />
          <div className="slider-labels">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Source</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['manual', 'apple_health'].map((s) => (
              <button
                key={s}
                className={`pill-btn${form.source === s ? ' selected' : ''}`}
                onClick={() => setForm({ ...form, source: s })}
                type="button"
              >
                {s === 'manual' ? 'Manual' : 'Apple Health'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            value={form.notes}
            placeholder="Any notes about your sleep..."
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ entries }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState(null);

  const entryMap = {};
  for (const e of entries) {
    if (e.date) entryMap[e.date] = e;
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = firstDay.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelected(null);
  }

  const COLOR_MAP = {
    green: { bg: 'rgba(72,187,120,0.25)', border: 'rgba(72,187,120,0.5)', text: '#68d391' },
    amber: { bg: 'rgba(201,168,76,0.25)', border: 'rgba(201,168,76,0.5)', text: '#c9a84c' },
    red: { bg: 'rgba(200,80,80,0.25)', border: 'rgba(200,80,80,0.5)', text: '#ff8080' },
    empty: { bg: 'rgba(192,200,216,0.05)', border: 'rgba(192,200,216,0.1)', text: 'rgba(192,200,216,0.3)' },
  };

  function getColor(day) {
    if (!day) return null;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const e = entryMap[iso];
    if (!e) return 'empty';
    const hours = (e.duration_minutes || 0) / 60;
    if (hours >= 7 || (e.sleep_score && e.sleep_score >= 70)) return 'green';
    if (hours >= 6 || (e.sleep_score && e.sleep_score >= 50)) return 'amber';
    if (e.duration_minutes) return 'red';
    return 'empty';
  }

  const isToday = (day) => {
    if (!day) return false;
    const t = new Date();
    return day === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
  };

  const selectedISO = selected
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : null;
  const selectedEntry = selectedISO ? entryMap[selectedISO] : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth}>‹</button>
        <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.1rem', color: 'var(--color-warm-cream)' }}>{monthName}</span>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '0.5rem' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(192,200,216,0.5)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, i) => {
          const colorKey = getColor(day);
          const c = day ? COLOR_MAP[colorKey] : null;
          const todayStyle = isToday(day) ? { outline: '2px solid var(--color-accent-lavender)', outlineOffset: '1px' } : {};
          return (
            <div
              key={i}
              onClick={() => day && setSelected(day === selected ? null : day)}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                background: c ? c.bg : 'transparent',
                border: c ? `1px solid ${c.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: day ? 'pointer' : 'default',
                fontSize: '0.8rem',
                fontWeight: day === selected ? 700 : 400,
                color: c ? c.text : 'transparent',
                transition: 'all 0.15s',
                ...todayStyle,
              }}
            >
              {day || ''}
            </div>
          );
        })}
      </div>

      {selectedEntry && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', marginBottom: '0.5rem', color: 'var(--color-warm-cream)' }}>
            {new Date(selectedISO + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div><div className="card-label">Duration</div><div className="text-gold" style={{ fontWeight: 600 }}>{formatDuration(selectedEntry.duration_minutes)}</div></div>
            <div><div className="card-label">Bedtime</div><div>{formatTime(selectedEntry.bedtime)}</div></div>
            <div><div className="card-label">Wake Time</div><div>{formatTime(selectedEntry.wake_time)}</div></div>
            {selectedEntry.sleep_score != null && <div><div className="card-label">Score</div><div>{selectedEntry.sleep_score}</div></div>}
          </div>
          {selectedEntry.notes && <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{selectedEntry.notes}</p>}
        </div>
      )}
      {selected && !selectedEntry && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-soft-silver)', fontSize: '0.875rem' }}>
          No sleep data for this day.
        </div>
      )}
    </div>
  );
}

export default function SleepLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // CSV Import state
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef(null);

  async function loadEntries() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/sleep');
      setEntries(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEntries(); }, []);

  const sorted = [...entries].sort((a, b) => (b.date > a.date ? 1 : -1));

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await api.delete(`/api/sleep/${id}`);
      setDeleteConfirm(null);
      loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportError(null);
    setImportPreview(null);
    setImportSuccess(null);
    try {
      const csvText = await file.text();
      const res = await api.post('/api/sleep/import', { csvText, preview: true });
      setImportPreview(res.entries || []);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!importPreview) return;
    setConfirming(true);
    setImportError(null);
    try {
      await api.post('/api/sleep/import', { entries: importPreview, confirmed: true });
      setImportSuccess(`Successfully imported ${importPreview.length} entries.`);
      setImportPreview(null);
      loadEntries();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Sleep Log</h1>
            {!loading && (
              <p className="page-subtitle">
                <span className="badge badge-lavender">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
              </p>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => { setEditEntry(null); setShowModal(true); }}>
            + Add Sleep Entry
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Tab Bar */}
      <div className="tab-bar">
        {['list', 'calendar', 'chart'].map((tab) => (
          <button
            key={tab}
            className={`tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'list' ? 'List' : tab === 'calendar' ? 'Calendar' : 'Chart'}
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {activeTab === 'list' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...Array(5)].map((_, i) => <SkeletonCard key={i} height={90} />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">🌙</span>
                <div className="empty-state-text">No sleep entries yet</div>
                <div className="empty-state-sub">Start tracking your sleep to see insights and patterns.</div>
                <button className="btn btn-primary" onClick={() => { setEditEntry(null); setShowModal(true); }}>Log My First Night</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sorted.map((entry) => {
                const isDeleting = deleteConfirm === entry.id;
                const d = new Date(entry.date + 'T00:00:00');
                return (
                  <div key={entry.id} className="sleep-entry-row" style={{ cursor: 'default' }}>
                    <div className="sleep-entry-date" style={{ flexShrink: 0 }}>
                      <div className="sleep-entry-date-day">{d.getDate()}</div>
                      <div className="sleep-entry-date-month">
                        {d.toLocaleDateString('en-AU', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-soft-silver)', marginTop: '2px' }}>{d.getFullYear()}</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-soft-gold)' }}>{formatDuration(entry.duration_minutes)}</span>
                        {entry.sleep_score != null && (
                          <span className="badge badge-lavender">Score: {entry.sleep_score}</span>
                        )}
                        {entry.rest_quality_rating != null && (
                          <span className="badge badge-gold">Rest: {entry.rest_quality_rating}/10</span>
                        )}
                        <span className={`source-badge ${entry.source === 'apple_health' ? 'apple' : 'manual'}`}>
                          {entry.source === 'apple_health' ? '🍎 Apple Health' : '✍️ Manual'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-soft-silver)' }}>
                        {formatTime(entry.bedtime)} – {formatTime(entry.wake_time)}
                      </div>
                      {entry.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'rgba(192,200,216,0.6)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {entry.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                      {isDeleting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="text-xs text-silver">Delete?</span>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting}
                          >
                            {deleting ? '…' : 'Yes'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditEntry(entry); setShowModal(true); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(entry.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="card">
          <CalendarView entries={entries} />
        </div>
      )}

      {/* CHART VIEW */}
      {activeTab === 'chart' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Sleep Duration — Last 30 Days</h3>
          {loading ? <SkeletonCard height={220} /> : <SleepChart entries={entries} />}
        </div>
      )}

      {/* CSV Import Section */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Import from Apple Health</h3>
        <p className="card-subtitle">Upload a CSV export from Apple Health to bulk import your sleep data.</p>

        {importSuccess && <div className="alert alert-success">{importSuccess}</div>}
        {importError && <div className="alert alert-error">{importError}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {!importPreview && (
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
          >
            {importLoading ? (
              <><span className="loading-spinner-sm spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(155,142,196,0.3)', borderTopColor: 'var(--color-accent-lavender)', borderRadius: '50%', marginRight: 6 }} />Parsing…</>
            ) : (
              '📂 Choose CSV File'
            )}
          </button>
        )}

        {importPreview && importPreview.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--color-soft-silver)' }}>
              Found <strong style={{ color: 'var(--color-soft-gold)' }}>{importPreview.length}</strong> entries to import:
            </div>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bedtime</th>
                    <th>Wake Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      <td>{row.date || '—'}</td>
                      <td>{row.bedtime ? formatTime(row.bedtime) : '—'}</td>
                      <td>{row.wake_time ? formatTime(row.wake_time) : '—'}</td>
                      <td>{row.duration_minutes ? formatDuration(row.duration_minutes) : '—'}</td>
                    </tr>
                  ))}
                  {importPreview.length > 20 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'rgba(192,200,216,0.5)', fontStyle: 'italic' }}>
                        + {importPreview.length - 20} more entries
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={confirming}
              >
                {confirming ? 'Importing…' : `Import ${importPreview.length} Entries`}
              </button>
              <button className="btn btn-secondary" onClick={() => setImportPreview(null)} disabled={confirming}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {importPreview && importPreview.length === 0 && (
          <div style={{ marginTop: '0.75rem', color: 'var(--color-soft-silver)', fontSize: '0.875rem' }}>
            No valid entries found in the file.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <SleepEntryModal
          entry={editEntry}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSave={() => { setShowModal(false); setEditEntry(null); loadEntries(); }}
        />
      )}
    </div>
  );
}
