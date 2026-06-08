import React from 'react';

/**
 * A single skeleton card placeholder
 */
export function SkeletonCard({ height = 120, style = {} }) {
  return (
    <div
      className="skeleton skeleton-card"
      style={{ height, borderRadius: 16, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * A single skeleton text line
 */
export function SkeletonText({ width = '100%', style = {} }) {
  return (
    <div
      className="skeleton skeleton-text"
      style={{ width, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * A grid of skeleton cards (default 3 cards)
 */
export function SkeletonGrid({ count = 3, height = 120 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
      }}
      aria-label="Loading…"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}

/**
 * A full skeleton for a stats card with label + value
 */
export function SkeletonStatCard() {
  return (
    <div
      className="card"
      style={{ minHeight: 110 }}
      aria-hidden="true"
    >
      <SkeletonText width="50%" style={{ marginBottom: '0.75rem' }} />
      <SkeletonText width="35%" style={{ height: '1.8em' }} />
      <SkeletonText width="65%" style={{ marginTop: '0.5rem', height: '0.75em' }} />
    </div>
  );
}

/**
 * A full page loading placeholder
 */
export function SkeletonPage() {
  return (
    <div className="fade-in" aria-busy="true" aria-label="Loading page">
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <SkeletonText width="40%" style={{ height: '1.8em', marginBottom: '0.5rem' }} />
        <SkeletonText width="60%" style={{ height: '0.9em' }} />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Main content card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <SkeletonText width="30%" style={{ height: '1.2em', marginBottom: '1rem' }} />
        <SkeletonText width="100%" />
        <SkeletonText width="90%" />
        <SkeletonText width="80%" />
        <SkeletonText width="70%" style={{ marginBottom: 0 }} />
      </div>

      <div className="card">
        <SkeletonText width="40%" style={{ height: '1.2em', marginBottom: '1rem' }} />
        <SkeletonCard height={200} />
      </div>
    </div>
  );
}
