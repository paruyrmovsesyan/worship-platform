import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
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
        <img src="/user_uploaded_logo.png" alt="Worship Logo" className="brand-logo-img" />
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
        <Link to="/friends" className={`sidebar-link ${isActive('/friends') ? 'active' : ''}`}>
          <span className="icon">💬</span> {t('nav.friends', 'Ընկերներ / Չաթ')}
        </Link>
        <Link to="/community" className={`sidebar-link ${isActive('/community') ? 'active' : ''}`}>
          <span className="icon">🌐</span> {t('nav.community')}
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-lang" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <LanguageSwitcher />
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
