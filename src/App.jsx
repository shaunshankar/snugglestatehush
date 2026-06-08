import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Auth from './pages/Auth.jsx';
import { SkeletonGrid } from './components/LoadingSkeleton.jsx';

// Lazy load page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const SleepLog = lazy(() => import('./pages/SleepLog.jsx'));
const MorningCheckin = lazy(() => import('./pages/MorningCheckin.jsx'));
const FactorTracker = lazy(() => import('./pages/FactorTracker.jsx'));
const AIInsights = lazy(() => import('./pages/AIInsights.jsx'));
const Streaks = lazy(() => import('./pages/Streaks.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function PageLoader() {
  return (
    <div style={{ padding: '2rem' }}>
      <SkeletonGrid />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth signup />} />

        {/* Protected routes wrapped in Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/sleep"
            element={
              <Suspense fallback={<PageLoader />}>
                <SleepLog />
              </Suspense>
            }
          />
          <Route
            path="/checkin"
            element={
              <Suspense fallback={<PageLoader />}>
                <MorningCheckin />
              </Suspense>
            }
          />
          <Route
            path="/factors"
            element={
              <Suspense fallback={<PageLoader />}>
                <FactorTracker />
              </Suspense>
            }
          />
          <Route
            path="/insights"
            element={
              <Suspense fallback={<PageLoader />}>
                <AIInsights />
              </Suspense>
            }
          />
          <Route
            path="/streaks"
            element={
              <Suspense fallback={<PageLoader />}>
                <Streaks />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
