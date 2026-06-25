import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-header" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="url(#sl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="sl" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9D72FF"/>
              <stop offset="1" stopColor="#00F0FF"/>
            </linearGradient>
          </defs>
        </svg>
        <span>Worship</span>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={`sidebar-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
          <span className="icon">⌂</span> {t('nav.home')}
        </Link>
        <Link to="/songs" className={`sidebar-link ${isActive('/songs') ? 'active' : ''}`}>
          <span className="icon">♪</span> {t('nav.songs')}
        </Link>
        <Link to="/setlists" className={`sidebar-link ${isActive('/setlists') ? 'active' : ''}`}>
          <span className="icon">📋</span> {t('nav.sets')}
        </Link>
        <Link to="/teams" className={`sidebar-link ${isActive('/teams') ? 'active' : ''}`}>
          <span className="icon">👥</span> {t('nav.teams')}
        </Link>
        <Link to="/community" className={`sidebar-link ${isActive('/community') ? 'active' : ''}`}>
          <span className="icon">🌐</span> {t('nav.community')}
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-lang" style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
          {['am', 'en', 'ru'].map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              style={{
                background: 'none', border: 'none', color: language === l ? '#00f0ff' : 'var(--color-text-tertiary)',
                fontSize: '12px', fontWeight: language === l ? '700' : '400', cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {l}
            </button>
          ))}
        </div>
        {user ? (
          <div className="sidebar-user">
            <Link to="/profile" className="user-name">
              <div className="avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
              <span>{user.name || user.email}</span>
            </Link>
            <button className="btn-logout" onClick={logout}>{t('nav.logout')}</button>
          </div>
        ) : (
          <div className="sidebar-auth">
            <Link to="/login" className="btn btn-secondary">{t('nav.login')}</Link>
            <Link to="/register" className="btn btn-primary">{t('nav.register')}</Link>
          </div>
        )}
      </div>
    </aside>
  );
}
