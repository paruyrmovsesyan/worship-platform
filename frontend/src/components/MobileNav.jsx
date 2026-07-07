import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import './MobileNav.css';

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { guardPath } = usePwaOfflineGuard();
  const [chatBadgeCount, setChatBadgeCount] = useState(0);

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    const fetchBadgeCount = async () => {
      if (!user) {
        if (!cancelled) setChatBadgeCount(0);
        return;
      }

      try {
        const res = await fetch(`/chat_api.php?action=badge_summary&t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!cancelled && data.ok) {
          setChatBadgeCount(Number(data.total || 0));
        }
      } catch (error) {
        if (!cancelled) {
          setChatBadgeCount(0);
        }
      }
    };

    fetchBadgeCount();

    if (user) {
      intervalId = window.setInterval(fetchBadgeCount, 8000);
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchBadgeCount();
        }
      };
      window.addEventListener('focus', fetchBadgeCount);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelled = true;
        if (intervalId) window.clearInterval(intervalId);
        window.removeEventListener('focus', fetchBadgeCount);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user]);

  return (
    <nav id="wpAppDock" className="mobile-bottom-nav">
      <NavLink to="/" end onClick={(e) => { if (!guardPath('/')) e.preventDefault(); }} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>{t('nav.home')}</span>
      </NavLink>

      <NavLink to="/songs" onClick={(e) => { if (!guardPath('/songs')) e.preventDefault(); }} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>{t('nav.songs')}</span>
      </NavLink>

      <NavLink to="/friends" onClick={(e) => { if (!guardPath('/friends')) e.preventDefault(); }} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          {user && chatBadgeCount > 0 && (
            <span className="nav-count-badge">
              {chatBadgeCount > 9 ? '9+' : chatBadgeCount}
            </span>
          )}
        </span>
        <span>{t('friends.tabs.chats')}</span>
      </NavLink>

      {user ? (
        <NavLink to="/profile" onClick={(e) => { if (!guardPath('/profile')) e.preventDefault(); }} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{t('profile.title')}</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <span>{t('nav.login')}</span>
        </NavLink>
      )}
    </nav>
  );
}
