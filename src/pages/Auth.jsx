import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';

export default function Auth({ signup: signupProp = false }) {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [isSignup, setIsSignup] = useState(signupProp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup extra fields
  const [name, setName] = useState('');
  const [targetBedtime, setTargetBedtime] = useState('22:30');
  const [targetDurationHours, setTargetDurationHours] = useState(8);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Sync mode with prop
  useEffect(() => {
    setIsSignup(signupProp);
  }, [signupProp]);

  function switchMode() {
    setIsSignup((prev) => !prev);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  }

  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (isSignup) {
      if (!name.trim()) return 'Name is required.';
      if (name.trim().length < 2) return 'Name must be at least 2 characters.';
      if (targetDurationHours < 1 || targetDurationHours > 12)
        return 'Target sleep duration must be between 1 and 12 hours.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      let data;
      if (isSignup) {
        data = await api.post('/api/auth/signup', {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          target_bedtime: targetBedtime + ':00',
          target_duration_hours: Number(targetDurationHours),
        });
      } else {
        data = await api.post('/api/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });
      }

      login(data.token, data.user);
      // Navigation is handled by the useEffect that watches isAuthenticated
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        {/* Branding */}
        <div>
          <span className="auth-logo-icon">🌙</span>
          <div className="auth-logo">SnuggleState Hush</div>
          <p className="auth-tagline">Your personal sleep sanctuary</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Signup-only fields */}
          {isSignup && (
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="auth-name">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="auth-email">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={isSignup ? 'email' : 'username'}
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          {/* Signup sleep goals */}
          {isSignup && (
            <>
              <div className="auth-divider">Sleep goals</div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="auth-bedtime">
                    Target Bedtime
                  </label>
                  <input
                    id="auth-bedtime"
                    type="time"
                    className="form-input"
                    value={targetBedtime}
                    onChange={(e) => setTargetBedtime(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="auth-duration">
                    Sleep Goal (hours)
                  </label>
                  <input
                    id="auth-duration"
                    type="number"
                    className="form-input"
                    min="1"
                    max="12"
                    step="0.5"
                    value={targetDurationHours}
                    onChange={(e) => setTargetDurationHours(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                You can adjust these anytime in Settings.
              </p>
            </>
          )}

          <div style={{ marginTop: '1.75rem' }}>
            <button
              type="submit"
              className="btn btn-gold btn-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-sm loading-spinner spin" />
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </>
              ) : isSignup ? (
                '✨ Create My Account'
              ) : (
                '🌙 Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Mode toggle */}
        <div className="auth-toggle">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={switchMode}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New to SnuggleState Hush?{' '}
              <button type="button" onClick={switchMode}>
                Create an account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
