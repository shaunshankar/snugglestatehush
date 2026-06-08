import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function Section({ title, icon, children }) {
  return (
    <div className="settings-section">
      <div className="card">
        <h3 className="settings-section-title">{icon} {title}</h3>
        {children}
      </div>
    </div>
  );
}

function StatusMsg({ success, error }) {
  if (success) return <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>✓ {success}</div>;
  if (error) return <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>;
  return null;
}

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile section
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password section
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(null);
  const [pwError, setPwError] = useState(null);

  // Goals section
  const [goalsForm, setGoalsForm] = useState({
    target_bedtime: user?.target_bedtime ? user.target_bedtime.slice(0, 5) : '22:30',
    target_duration_hours: user?.target_duration_hours || 8,
  });
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsSuccess, setGoalsSuccess] = useState(null);
  const [goalsError, setGoalsError] = useState(null);

  // Delete account section
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '' });
      setGoalsForm({
        target_bedtime: user.target_bedtime ? user.target_bedtime.slice(0, 5) : '22:30',
        target_duration_hours: user.target_duration_hours || 8,
      });
    }
  }, [user]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await api.put('/api/users/profile', { name: profileForm.name.trim() });
      updateUser({ ...user, name: profileForm.name.trim(), ...(res.user || {}) });
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(null);
    try {
      await api.put('/api/users/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess('Password changed successfully.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSaveGoals(e) {
    e.preventDefault();
    setGoalsSaving(true);
    setGoalsError(null);
    setGoalsSuccess(null);
    try {
      const payload = {
        target_bedtime: `${goalsForm.target_bedtime}:00`,
        target_duration_hours: Number(goalsForm.target_duration_hours),
      };
      await api.put('/api/users/goals', payload);
      updateUser({ ...user, ...payload });
      setGoalsSuccess('Sleep goals saved.');
    } catch (err) {
      setGoalsError(err.message);
    } finally {
      setGoalsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete('/api/users/account');
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings ⚙️</h1>
        <p className="page-subtitle">Manage your account and sleep preferences.</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon="👤">
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ name: e.target.value })}
              placeholder="Your name"
              maxLength={80}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6 }}
            />
            <div className="form-hint">Email cannot be changed.</div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
          <StatusMsg success={profileSuccess} error={profileError} />
        </form>
      </Section>

      {/* Security */}
      <Section title="Security" icon="🔒">
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwSaving}>
            {pwSaving ? 'Saving…' : 'Change Password'}
          </button>
          <StatusMsg success={pwSuccess} error={pwError} />
        </form>
      </Section>

      {/* Sleep Goals */}
      <Section title="Sleep Goals" icon="🎯">
        <p style={{ fontSize: '0.875rem', color: 'var(--color-soft-silver)', marginBottom: '1rem' }}>
          These goals are used for streak calculation and dashboard targets.
        </p>
        <form onSubmit={handleSaveGoals}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Target Bedtime</label>
              <input
                type="time"
                className="form-input"
                value={goalsForm.target_bedtime}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_bedtime: e.target.value })}
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
                value={goalsForm.target_duration_hours}
                onChange={(e) => setGoalsForm({ ...goalsForm, target_duration_hours: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={goalsSaving}>
            {goalsSaving ? 'Saving…' : 'Save Goals'}
          </button>
          <StatusMsg success={goalsSuccess} error={goalsError} />
        </form>
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone" icon="⚠️">
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 12,
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.4rem' }}>Delete Account</div>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-soft-silver)' }}>
            Permanently delete your account and all sleep data. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete My Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-danger)' }}>
                Type <strong>DELETE</strong> to confirm you want to permanently delete your account.
              </div>
              <input
                type="text"
                className="form-input"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                style={{ borderColor: 'var(--color-danger-border)', maxWidth: 300 }}
              />
              {deleteError && <div className="error-msg">{deleteError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteInput !== 'DELETE'}
                >
                  {deleting ? 'Deleting…' : 'Confirm Delete Account'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(null); }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
