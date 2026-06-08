import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SkeletonGrid } from './LoadingSkeleton.jsx';

/**
 * Wraps a component (or Layout) and redirects to /login if the user is not authenticated.
 * Shows a loading skeleton while the auth state is being verified.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #080c18 0%, #0d1030 50%, #1a1040 100%)',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            color: '#c9a84c',
            fontSize: '1.8rem',
            fontWeight: 700,
          }}
        >
          🌙 SnuggleState Hush
        </div>
        <div style={{ width: '320px' }}>
          <SkeletonGrid />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
