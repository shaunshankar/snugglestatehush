import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { formatDate, toISODate } from '../utils/dateUtils.js';
import { SkeletonCard, SkeletonText } from '../components/LoadingSkeleton.jsx';

function DotsLoader() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--color-accent-lavender)',
            animation: 'pulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

const ICONS = ['🌙', '✨', '💡', '📊', '🎯', '💤', '🧘'];

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/insights');
      const data = res.insights || res;
      if (data && (data.summary || data.insights || Array.isArray(data))) {
        if (Array.isArray(data)) {
          setInsights({ insights: data });
        } else {
          setInsights(data);
        }
        setLastUpdated(res.updated_at || res.created_at || data.updated_at || data.created_at || null);
      } else {
        setInsights(null);
      }
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('No insights')) {
        setInsights(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInsights(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post('/api/insights', {});
      const data = res.insights || res;
      if (Array.isArray(data)) {
        setInsights({ insights: data });
      } else {
        setInsights(data);
      }
      setLastUpdated(res.updated_at || res.created_at || new Date().toISOString());
    } catch (err) {
      if (err.message?.toLowerCase().includes('not enough') || err.message?.toLowerCase().includes('insufficient')) {
        setError('not_enough_data');
      } else {
        setError(err.message);
      }
    } finally {
      setGenerating(false);
    }
  }

  const insightItems = insights?.insights || (Array.isArray(insights) ? insights : null);
  const summary = insights?.summary;
  const weeklyTip = insights?.weekly_tip || insights?.tip;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">AI Insights ✨</h1>
            <p className="page-subtitle">
              Personalised sleep analysis powered by AI
              {lastUpdated && (
                <span style={{ color: 'rgba(192,200,216,0.5)', marginLeft: '0.5rem' }}>
                  · Last updated: {formatDate(new Date(lastUpdated))}
                </span>
              )}
            </p>
          </div>
          <button
            className="btn btn-gold"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <><span>Analysing </span><DotsLoader /></>
            ) : insights ? (
              '↻ Regenerate Insights'
            ) : (
              '✨ Generate Insights'
            )}
          </button>
        </div>
      </div>

      {generating && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem', borderColor: 'rgba(155,142,196,0.3)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
          <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', marginBottom: '0.5rem', color: 'var(--color-warm-cream)' }}>
            Analysing your sleep patterns <DotsLoader />
          </h3>
          <p style={{ color: 'var(--color-soft-silver)', fontSize: '0.9rem' }}>
            Claude is reviewing your sleep data, check-ins, and lifestyle factors to provide personalised recommendations.
          </p>
        </div>
      )}

      {!generating && error === 'not_enough_data' && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="empty-state">
            <span className="empty-state-icon">📊</span>
            <div className="empty-state-text">Not enough data yet</div>
            <div className="empty-state-sub">
              Log at least a week of sleep data to get meaningful AI insights. Keep tracking and come back soon!
            </div>
          </div>
        </div>
      )}

      {!generating && error && error !== 'not_enough_data' && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>
      )}

      {loading && !generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="insight-card">
              <SkeletonText width="50%" style={{ height: '1.1em', marginBottom: '0.75rem' }} />
              <SkeletonText width="100%" />
              <SkeletonText width="90%" />
              <SkeletonText width="75%" style={{ marginBottom: 0 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && !generating && !insights && !error && (
        <div className="card fade-in">
          <div className="empty-state">
            <span className="empty-state-icon">🌙</span>
            <div className="empty-state-text">Get personalised sleep insights</div>
            <div className="empty-state-sub">
              Powered by Claude — our AI analyses your sleep patterns, morning check-ins, and lifestyle factors to give you actionable recommendations tailored just for you.
            </div>
            <button className="btn btn-gold" onClick={handleGenerate} disabled={generating}>
              Generate My Insights
            </button>
          </div>
        </div>
      )}

      {!loading && !generating && insights && (
        <div className="fade-in">
          {/* Summary Card */}
          {summary && (
            <div
              className="insight-card"
              style={{
                background: 'rgba(26,16,64,0.8)',
                borderLeft: '3px solid var(--color-accent-lavender)',
                marginBottom: '1rem',
              }}
            >
              <div className="insight-card-header">
                <span className="insight-icon">📋</span>
                <span className="insight-title" style={{ color: 'var(--color-accent-lavender)' }}>Sleep Summary</span>
              </div>
              <div className="insight-detail">{summary}</div>
            </div>
          )}

          {/* Weekly Tip */}
          {weeklyTip && (
            <div
              className="insight-card"
              style={{
                background: 'rgba(201,168,76,0.08)',
                borderLeft: '3px solid var(--color-soft-gold)',
                borderColor: 'rgba(201,168,76,0.3)',
                marginBottom: '1rem',
              }}
            >
              <div className="insight-card-header">
                <span className="insight-icon">💡</span>
                <span className="insight-title">This Week's Tip</span>
              </div>
              <div className="insight-detail">{weeklyTip}</div>
            </div>
          )}

          {/* Individual Insights */}
          {insightItems && insightItems.length > 0 && (
            <div>
              {insightItems.map((item, i) => {
                const icon = ICONS[i % ICONS.length];
                const title = item.title || item.heading || `Insight ${i + 1}`;
                const detail = item.detail || item.content || item.description || item.body || (typeof item === 'string' ? item : '');
                return (
                  <div key={i} className="insight-card fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="insight-card-header">
                      <span className="insight-icon">{icon}</span>
                      <span className="insight-title">{title}</span>
                    </div>
                    {detail && <div className="insight-detail">{detail}</div>}
                    {item.recommendation && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(155,142,196,0.1)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--color-accent-lavender)' }}>
                        → {item.recommendation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback: raw string insight */}
          {!insightItems && !summary && typeof insights === 'string' && (
            <div className="insight-card">
              <div className="insight-card-header">
                <span className="insight-icon">🌙</span>
                <span className="insight-title">Your Sleep Analysis</span>
              </div>
              <div className="insight-detail" style={{ whiteSpace: 'pre-wrap' }}>{insights}</div>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-xs text-silver">Powered by Claude claude-sonnet-4-6</span>
            <span className="badge badge-lavender">AI</span>
          </div>
        </div>
      )}
    </div>
  );
}
