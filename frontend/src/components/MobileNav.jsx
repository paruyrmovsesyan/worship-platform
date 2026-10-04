import { useEffect, useState, useRef, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import './MobileNav.css';

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { guardPath } = usePwaOfflineGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(null);

  const dockRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isScrubbingRef = useRef(false);
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
        const type = e.target?.type?.toLowerCase();
        if (type !== 'checkbox' && type !== 'radio' && type !== 'button' && type !== 'submit') {
          setIsKeyboardOpen(true);
          setShowQuickMenu(false);
          document.body.classList.add('keyboard-open');
        }
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && !document.activeElement?.isContentEditable) {
          setIsKeyboardOpen(false);
          document.body.classList.remove('keyboard-open');
        }
      }, 100);
    };

    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.8;
        setIsKeyboardOpen(isShrunk);
        if (isShrunk) {
          setShowQuickMenu(false);
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
      }
    };
  }, []);

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    const fetchBadgeCount = async () => {
      if (!user) {
        if (!cancelled) setChatBadgeCount(0);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
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
      } catch {
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
      window.addEventListener('wp-friendship-updated', fetchBadgeCount);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelled = true;
        if (intervalId) window.clearInterval(intervalId);
        window.removeEventListener('focus', fetchBadgeCount);
        window.removeEventListener('wp-friendship-updated', fetchBadgeCount);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user]);

  const triggerHaptic = (style = 'Light') => {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
        Haptics.impact({ style: ImpactStyle[style] || ImpactStyle.Light }).catch(() => {});
      }).catch(() => {});
    }
  };

  const getActiveIndex = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/songs' || path === '/transpose' || path.startsWith('/song/')) return 1;
    if (path === '/chats' || path.startsWith('/chat/')) return 2;
    if (path === '/profile' || path === '/login' || path === '/settings') return 3;
    return 0;
  };

  const activeIndex = getActiveIndex();
  const displayIndex = scrubIndex !== null ? scrubIndex : activeIndex;

  const mainTabs = [
    {
      path: '/',
      label: t('nav.home', 'Գլխավոր'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    {
      path: '/songs',
      label: t('nav.songs', 'Երգեր'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      )
    },
    {
      path: '/chats',
      label: t('chats.chats', 'Չաթեր'),
      badge: user && chatBadgeCount > 0 ? (chatBadgeCount > 9 ? '9+' : chatBadgeCount) : null,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      )
    },
    {
      path: user ? '/profile' : '/login',
      label: user ? t('profile.title', 'Պրոֆիլ') : t('nav.login', 'Մուտք'),
      icon: user ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
      )
    }
  ];

  const quickPages = user ? [
    { path: '/', label: t('nav.home', 'Գլխավոր'), icon: '🏠' },
    { path: '/songs', label: t('nav.songs', 'Երգեր'), icon: '🎼' },
    { path: '/chats', label: t('chats.chats', 'Չաթեր'), icon: '💬' },
    { path: '/favorites', label: t('favorites.title', 'Սիրվածներ'), icon: '⭐' },
    { path: '/profile', label: t('profile.title', 'Պրոֆիլ'), icon: '👤' },
    { path: '/settings', label: t('profile.accountSettings', 'Կարգավորումներ'), icon: '⚙️' },
  ] : [
    { path: '/', label: t('nav.home', 'Գլխավոր'), icon: '🏠' },
    { path: '/songs', label: t('nav.songs', 'Երգեր'), icon: '🎼' },
    { path: '/login', label: t('nav.login', 'Մուտք'), icon: '🔑' },
    { path: '/register', label: t('auth.register', 'Գրանցվել'), icon: '✨' },
  ];

  const handleNavClick = (path, e) => {
    if (isScrubbingRef.current) {
      e?.preventDefault?.();
      return;
    }
    if (!guardPath(path)) {
      e?.preventDefault?.();
      return;
    }
    triggerHaptic('Light');
  };

  const navigateTo = (path) => {
    if (!guardPath(path)) return;
    triggerHaptic('Medium');
    startTransition(() => {
      navigate(path);
    });
    setShowQuickMenu(false);
  };

  // Press-and-hold (long press) and scrub (drag across tabs) handlers
  const onTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isScrubbingRef.current = false;

    // Start 320ms long-press timer to open quick page switcher
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('Medium');
      setShowQuickMenu(true);
    }, 320);
  };

  const onTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // If moved horizontally, cancel long-press and start interactive scrubbing
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      isScrubbingRef.current = true;
    }

    if (isScrubbingRef.current && dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
      const newIndex = Math.min(3, Math.floor(ratio * 4));

      if (newIndex !== scrubIndex) {
        setScrubIndex(newIndex);
        triggerHaptic('Light');
      }
    }
  };

  const onTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isScrubbingRef.current && scrubIndex !== null) {
      const targetTab = mainTabs[scrubIndex];
      if (targetTab && guardPath(targetTab.path)) {
        triggerHaptic('Light');
        startTransition(() => {
          navigate(targetTab.path);
        });
      }
    }

    setScrubIndex(null);
    setTimeout(() => {
      isScrubbingRef.current = false;
    }, 50);
  };

  const onTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setScrubIndex(null);
    isScrubbingRef.current = false;
  };

  if (isKeyboardOpen) {
    return null;
  }

  return createPortal(
    <>
      {/* iOS Liquid Glass Quick Page Switcher Menu on Long-Press */}
      {showQuickMenu && (
        <>
          <div
            className="nav-quick-menu-backdrop"
            onClick={() => setShowQuickMenu(false)}
            aria-hidden="true"
          />
          <div className="nav-quick-menu animate-pop-in" role="dialog" aria-modal="true">
            <div className="nav-quick-menu-header">
              <span className="nav-quick-menu-title">{t('nav.quickSwitch', 'Արագ անցում')}</span>
              <button
                type="button"
                className="nav-quick-menu-close"
                onClick={() => setShowQuickMenu(false)}
                aria-label="Փակել"
              >
                ✕
              </button>
            </div>
            <div className="nav-quick-menu-grid">
              {quickPages.map((page) => {
                const isCurrent = location.pathname === page.path;
                return (
                  <button
                    key={page.path}
                    type="button"
                    className={`nav-quick-menu-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => navigateTo(page.path)}
                  >
                    <span className="nav-quick-menu-icon">{page.icon}</span>
                    <span className="nav-quick-menu-label">{page.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* iOS Liquid Glass Bottom Dock */}
      <nav
        id="wpAppDock"
        ref={dockRef}
        className={`mobile-bottom-nav ${isKeyboardOpen ? 'keyboard-hidden' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div
          className="nav-liquid-indicator"
          style={{
            transform: `translate3d(${displayIndex * 100}%, 0, 0)`
          }}
          aria-hidden="true"
        />

        {mainTabs.map((tab, idx) => {
          const isCurrent = activeIndex === idx;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              onClick={(e) => handleNavClick(tab.path, e)}
              className={isCurrent ? 'nav-item active' : 'nav-item'}
            >
              <span className="nav-icon-wrap">
                {tab.icon}
                {tab.badge && (
                  <span className="nav-count-badge">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="nav-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>,
    document.body
  );
}
