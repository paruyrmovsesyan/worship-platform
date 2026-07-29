import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import './Sidebar.css';

export default function Sidebar() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { guardPath } = usePwaOfflineGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = async () => {
    if (!navigator.onLine) {
      window.WP?.showOfflineBlockedNotice?.(t('nav.retryOnline'));
      return;
    }

    setIsRefreshing(true);
    try {
      const registration = await navigator.serviceWorker?.ready;
      await registration?.update?.();
      await fetch('/status.php', { cache: 'no-store' });
    } catch {
      // Reload still gives the service worker a chance to serve the current shell.
    }
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-header" onClick={() => guardPath('/', () => navigate('/'))}>
        <img src="/user_uploaded_logo.png" alt="Worship Logo" className="brand-logo-img" />
        <span>Worship</span>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" onClick={(e) => { if (!guardPath('/')) e.preventDefault(); }} className={`sidebar-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
          <span className="icon">⌂</span> {t('nav.home')}
        </Link>
        <Link to="/songs" onClick={(e) => { if (!guardPath('/songs')) e.preventDefault(); }} className={`sidebar-link ${isActive('/songs') ? 'active' : ''}`}>
          <span className="icon">♪</span> {t('nav.songs')}
        </Link>
        <Link to="/transpose" onClick={(e) => { if (!guardPath('/transpose')) e.preventDefault(); }} className={`sidebar-link ${isActive('/transpose') ? 'active' : ''}`}>
          <span className="icon">↕</span> {t('nav.transposer')}
        </Link>
        <Link to="/setlists" onClick={(e) => { if (!guardPath('/setlists')) e.preventDefault(); }} className={`sidebar-link ${isActive('/setlists') ? 'active' : ''}`}>
          <span className="icon">📋</span> {t('nav.sets')}
        </Link>
        <Link to="/friends" onClick={(e) => { if (!guardPath('/friends')) e.preventDefault(); }} className={`sidebar-link ${isActive('/friends') ? 'active' : ''}`}>
          <span className="icon">💬</span> {t('nav.friends', 'Ընկերներ / Չաթ')}
        </Link>
        <Link to="/community" onClick={(e) => { if (!guardPath('/community')) e.preventDefault(); }} className={`sidebar-link ${isActive('/community') ? 'active' : ''}`}>
          <span className="icon">🌐</span> {t('nav.community')}
        </Link>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-refresh"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={isOnline ? t('nav.refresh') : t('nav.retry')}
        >
          <span className={`sidebar-refresh-icon ${isRefreshing ? 'spinning' : ''}`} aria-hidden="true">↻</span>
          <span className="sidebar-refresh-copy">
            <strong>{isRefreshing ? t('nav.refreshing') : (isOnline ? t('nav.refresh') : t('nav.retry'))}</strong>
            <small className={isOnline ? 'online' : 'offline'}>{isOnline ? t('nav.online') : t('nav.offline')}</small>
          </span>
        </button>
        <div className="sidebar-lang" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <LanguageSwitcher />
        </div>
        {user ? (
          <div className="sidebar-user">
            <Link to="/profile" onClick={(e) => { if (!guardPath('/profile')) e.preventDefault(); }} className="user-name">
              <div className="avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
              <span>{user.name || user.email}</span>
            </Link>
            <button className="btn-logout" onClick={logout}>{t('nav.logout')}</button>
          </div>
        ) : (
          <div className="sidebar-auth" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/settings" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>{t('settings.title', 'Կարգավորումներ')}</span>
            </Link>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/login" className="btn btn-secondary" style={{ flex: 1 }}>{t('nav.login')}</Link>
              <Link to="/register" className="btn btn-primary" style={{ flex: 1 }}>{t('nav.register')}</Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
