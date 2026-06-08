import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Dashboard', exact: true },
  { to: '/sleep', icon: '🌙', label: 'Sleep Log' },
  { to: '/checkin', icon: '☀️', label: 'Morning Check-in' },
  { to: '/factors', icon: '📊', label: 'Factors' },
  { to: '/insights', icon: '✨', label: 'AI Insights' },
  { to: '/streaks', icon: '🔥', label: 'Streaks' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Home', exact: true },
  { to: '/sleep', icon: '🌙', label: 'Sleep' },
  { to: '/checkin', icon: '☀️', label: 'Check-in' },
  { to: '/insights', icon: '✨', label: 'Insights' },
  { to: '/streaks', icon: '🔥', label: 'Streaks' },
];

function getNavClass({ isActive }) {
  return isActive ? 'nav-item active' : 'nav-item';
}

function getBottomNavClass({ isActive }) {
  return isActive ? 'bottom-nav-item active' : 'bottom-nav-item';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🌙</span>
          SnuggleState Hush
        </div>
        <div className="sidebar-tagline">Your personal sleep sanctuary</div>

        <nav>
          <ul className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.exact}
                  className={getNavClass}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to sign out">
            <div className="sidebar-user-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-sub">Sign out</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={getBottomNavClass}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
