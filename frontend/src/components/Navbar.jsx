import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useIsPWA } from '../hooks/useIsPWA';
import LanguageSwitcher from './LanguageSwitcher';
import './Navbar.css';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPWA = useIsPWA();

  const [scrolled, setScrolled]       = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownTimeoutRef = useRef(null);

  // Magic Pill sliding animation state
  const [hoverStyle, setHoverStyle] = useState({ opacity: 0, width: 0, transform: 'translateX(0px)' });
  const navMenuRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetch('/user_notifications_api.php?action=get_unread_count')
        .then(r => r.json())
        .then(d => { if(d.ok) setUnreadCount(d.count); })
        .catch(console.error);
    }
  }, [user, location.pathname]);

  // Calculate position of the pill
  const updatePillPosition = (element) => {
    if (!element || !navMenuRef.current) return;
    const navRect = navMenuRef.current.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();
    
    setHoverStyle({
      opacity: 1,
      width: itemRect.width,
      transform: `translateX(${itemRect.left - navRect.left}px)`
    });
  };

  const handleMenuEnter = (e, menuName) => {
    updatePillPosition(e.currentTarget);
    if (menuName) onMenuEnter(menuName);
  };

  const handleMenuLeaveWrapper = (e) => {
    // Hide pill when leaving the entire menu container
    setHoverStyle(prev => ({ ...prev, opacity: 0 }));
  };

  const searchRef = useRef(null);
  const formRef   = useRef(null);
  const hideTimeout = useRef(null);

  const onMenuEnter = (menu) => {
    clearTimeout(hideTimeout.current);
    setActiveDropdown(menu);
  };

  const onMenuLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  /* Close search when clicking outside */
  useEffect(() => {
    const handler = (e) => {
      if (formRef.current && !formRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const submitSearch = (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/songs?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') submitSearch(e);
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
  };

  const isActive = (path) => location.pathname === path;

  const navSections = [
    {
      title: null,
      items: [
        {
          to: '/', label: t('nav.home'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        }
      ]
    },
    {
      title: t('megaMenu.features', 'Հնարավորություններ'),
      items: [
        {
          to: '/songs', label: t('nav.songs'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        },
        {
          to: '/transpose', label: t('nav.transposer'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M7 4 4 7l3 3M20 17H4m13-3 3 3-3 3"/></svg>
        },
        {
          to: '/setlists', label: t('nav.sets'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        },
        {
          to: '/friends', label: t('nav.friends'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        }
      ]
    },
    {
      title: t('megaMenu.materials', 'Նյութեր & Կապ'),
      items: [
        {
          to: '/news', label: t('nav.news'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>
        },
        {
          to: '/resources', label: t('nav.resources'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        },
        {
          to: '/community', label: t('nav.community'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        },
        {
          to: '/contact', label: t('megaMenu.contacts', 'Կապ'),
          icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        }
      ]
    }
  ];

  // Mobile drawer rendered via Portal at document.body — escapes backdrop-filter stacking context
  const mobileDrawer = createPortal(
    <div className={`mobile-menu-portal ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
      <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      <div className="menu-drawer" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="menu-drawer-header">
          <div className="menu-drawer-logo">
            <img src="/user_uploaded_logo.png" alt="Worship Logo" className="brand-logo-img" />
            <span>Worship Platform</span>
          </div>
          <button className="menu-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Auth */}
        {user ? (
          <div className="menu-user-section">
            <div className="menu-user-avatar">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</div>
            <div className="menu-user-info">
              <span className="menu-user-name">{user.name || user.username || user.email}</span>
              <span className="menu-user-role">Worship Member</span>
            </div>
          </div>
        ) : (
          <div className="menu-auth-section">
            <Link to="/register" className="menu-btn-register" onClick={() => setMenuOpen(false)}>
              {t('nav.register')}
            </Link>
            <Link to="/login" className="menu-btn-login" onClick={() => setMenuOpen(false)}>
              {t('nav.login')}
            </Link>
          </div>
        )}

        {/* Nav links */}
        <nav className="menu-nav-links">
          {navSections.map((sec, idx) => (
            <div key={idx} className="menu-nav-section">
              {sec.title && <span className="menu-section-title">{sec.title}</span>}
              {sec.items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`menu-nav-link ${isActive(item.to) ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="menu-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="menu-nav-arrow">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="menu-drawer-footer">
          {user && (
            <button className="menu-btn-logout" onClick={() => { logout(); setMenuOpen(false); }}>
              {t('nav.logout')}
            </button>
          )}
          <div className="menu-lang" style={{ display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher />
          </div>
        </div>

      </div>
    </div>,
    document.body
  );

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">

          {/* ── LOGO ── */}
          <div className="navbar-logo" onClick={() => navigate('/')}>
            <img src="/user_uploaded_logo.png" alt="Worship Logo" className="brand-logo-img" />
            Worship Platform
          </div>

          {/* ── NAV LINKS (Desktop only) ── */}
          <div className="navbar-menu hide-mobile" ref={navMenuRef} onMouseLeave={handleMenuLeaveWrapper}>
            <div className="nav-hover-pill" style={hoverStyle}></div>

            <Link 
              to="/" 
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
              onMouseEnter={(e) => handleMenuEnter(e, null)}
            >
              {t('nav.home')}
            </Link>
            
            <div 
              className={`nav-item has-dropdown ${activeDropdown === 'solutions' ? 'active-dropdown' : ''} ${isActive('/songs') || isActive('/transpose') || isActive('/setlists') || isActive('/friends') ? 'active' : ''}`}
              onMouseEnter={(e) => handleMenuEnter(e, 'solutions')}
              onMouseLeave={onMenuLeave}
            >
              <span>{t('megaMenu.features')}</span>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              
              <div className={`mega-menu ${activeDropdown === 'solutions' ? 'show' : ''}`}>
                <div className="mega-menu-inner">
                  <div className="mega-menu-cols">
                    <div className="mega-col">
                      <h4>{t('megaMenu.music')}</h4>
                      <div className="mega-col-links">
                        <Link to="/songs">{t('nav.songs')}</Link>
                        <Link to="/transpose">{t('nav.transposer')}</Link>
                        <Link to="/setlists">{t('nav.sets')}</Link>
                      </div>
                    </div>
                    <div className="mega-col">
                      <h4>{t('megaMenu.management')}</h4>
                      <div className="mega-col-links">
                        <Link to="/friends">{t('nav.friends')}</Link>
                      </div>
                    </div>
                  </div>
                  <div className="mega-featured">
                    <h4>{t('megaMenu.latestArrival')}</h4>
                    <p>{t('megaMenu.discoverSongs')}</p>
                    <Link to="/news" className="mega-btn">{t('megaMenu.readArticle')}</Link>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`nav-item has-dropdown ${activeDropdown === 'resources' ? 'active-dropdown' : ''} ${isActive('/news') || isActive('/resources') || isActive('/community') ? 'active' : ''}`}
              onMouseEnter={(e) => handleMenuEnter(e, 'resources')}
              onMouseLeave={onMenuLeave}
            >
              <span>{t('megaMenu.materials')}</span>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>

              <div className={`mega-menu ${activeDropdown === 'resources' ? 'show' : ''}`}>
                <div className="mega-menu-inner">
                  <div className="mega-menu-cols">
                    <div className="mega-col">
                      <h4>{t('megaMenu.info')}</h4>
                      <div className="mega-col-links">
                        <Link to="/news">{t('nav.news')}</Link>
                        <Link to="/resources">{t('nav.resources')}</Link>
                      </div>
                    </div>
                  </div>
                  <div className="mega-featured">
                    <h4>{t('nav.community')}</h4>
                    <p>{t('megaMenu.communityDesc')}</p>
                    <Link to="/community" className="mega-btn">{t('megaMenu.joinNow')}</Link>
                  </div>
                </div>
              </div>
            </div>
            <Link 
              to="/contact" 
              className={`nav-item ${isActive('/contact') ? 'active' : ''}`}
              onMouseEnter={(e) => handleMenuEnter(e, null)}
            >
              {t('megaMenu.contacts')}
            </Link>
          </div>

          {/* ── RIGHT SIDE ── */}
          <div className="navbar-right">

            {/* Search Pill (Command Palette Trigger) */}
            <button
              type="button"
              className="nav-search-pill hide-mobile"
              aria-label="Search"
              onClick={() => window.dispatchEvent(new CustomEvent('worship:open-command-palette'))}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="search-placeholder">{t('nav.search', 'Որոնել...')}</span>
              <span className="search-kbd">{navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K'}</span>
            </button>

            {/* Notifications Bell */}
            {user && isPWA && (
              <button 
                className="notification-bell-btn hide-mobile" 
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-primary)', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', borderRadius: '50%',
                  marginRight: '8px', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    background: 'var(--color-danger)', color: '#fff',
                    fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%', border: '2px solid var(--color-surface)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth buttons */}
            {user ? (
              <div className="nav-profile-wrapper hide-mobile" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`nav-profile-chip ${profileDropdownOpen ? 'active' : ''}`}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                >
                  <div className="nav-profile-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <span className="nav-profile-name">{user.name || user.username || user.email}</span>
                  <svg className={`nav-profile-arrow ${profileDropdownOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="nav-profile-dropdown">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar-large">
                        {user.name ? user.name.charAt(0).toUpperCase() : (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
                      </div>
                      <div className="dropdown-user-info">
                        <strong className="dropdown-name">{user.name || user.username || 'User'}</strong>
                        <span className="dropdown-email">{user.email}</span>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div className="dropdown-menu-list">
                      <Link to="/profile" className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>{t('profile.title', 'Անձնական էջ')}</span>
                      </Link>
                      <Link to="/settings" className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.1a2 2 0 0 1-1.41-.59l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2 18.59v-.1a2 2 0 0 1 .59-1.41l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.41 2h.1a2 2 0 0 1 1.41.59l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 5.41v.1a2 2 0 0 1-.59 1.41l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.39.66.6 1a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.82.33c-.21.34-.37.69-.6 1z"></path></svg>
                        <span>{t('profile.accountSettings', 'Կարգավորումներ')}</span>
                      </Link>
                      <Link to="/chats" className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span>{t('chats.chats', 'Չաթեր')}</span>
                      </Link>
                      <Link to="/setlists" className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>
                        <span>{t('nav.setlists', 'Երգացանկեր')}</span>
                      </Link>
                      <Link to="/favorites" className="dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        <span>{t('nav.favorites', 'Նախընտրածներ')}</span>
                      </Link>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button type="button" className="dropdown-item danger" onClick={() => { setProfileDropdownOpen(false); logout(); }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      <span>{t('nav.logout', 'Դուրս գալ')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="navbar-auth-btns hide-mobile">
                <Link to="/login" className="nav-login-link">{t('nav.login')}</Link>
                <Link to="/register" className="btn-get-started">{t('nav.register')}</Link>
              </div>
            )}

            <div className="lang-toggle hide-mobile" style={{ marginLeft: '12px' }}>
              <LanguageSwitcher />
            </div>

            {/* ── HAMBURGER (Mobile only) ── */}
            <button className="navbar-hamburger mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile menu — rendered via React Portal at document.body level */}
      {mobileDrawer}
    </>
  );
}
