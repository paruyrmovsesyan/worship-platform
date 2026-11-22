import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import { triggerHaptic } from '../utils/nativeFeatures';
import { Capacitor } from '@capacitor/core';
import { TabBar } from 'glisse';
import './MobileNav.css';

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { guardPath } = usePwaOfflineGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();

  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [optimisticTab, setOptimisticTab] = useState(null);
  const tabTransitionRef = useRef(null);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
        const type = e.target?.type?.toLowerCase();
        if (type !== 'checkbox' && type !== 'radio' && type !== 'button' && type !== 'submit') {
          setIsKeyboardOpen(true);
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
      intervalId = window.setInterval(() => {
        const currentPath = window.location.pathname;
        if (currentPath === '/chats' || currentPath.startsWith('/chat/')) return;
        fetchBadgeCount();
      }, 8000);
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

  const profilePath = user ? '/profile' : '/login?next=/profile';

  const getActiveValue = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path === '/songs' || path === '/transpose' || path.startsWith('/song/')) return '/songs';
    if (path === '/chats' || path.startsWith('/chat/')) return '/chats';
    if (path === '/profile' || path === '/login' || path === '/settings') return profilePath;
    return null;
  };

  const routeActiveValue = getActiveValue();
  const activeValue = optimisticTab && optimisticTab.fromPath === location.pathname
    ? optimisticTab.target
    : routeActiveValue;
  const chatBadge = user && chatBadgeCount > 0 ? (chatBadgeCount > 9 ? '9+' : chatBadgeCount) : null;

  const mainTabs = [
    {
      value: '/',
      label: t('nav.home', 'Գլխավոր'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      value: '/songs',
      label: t('nav.songs', 'Երգեր'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      ),
    },
    {
      value: '/chats',
      label: t('chats.chats', 'Չաթեր'),
      icon: (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          {chatBadge && <span className="nav-count-badge">{chatBadge}</span>}
        </>
      ),
    },
    {
      value: profilePath,
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
      ),
    },
  ];

  const switchNativeTab = useCallback((path) => {
    const targetPathname = path.split('?')[0];
    if (targetPathname === location.pathname || tabTransitionRef.current || window.__wpNativeTransitionInFlight) return;
    const performNavigation = () => navigate(path, { replace: true });
    if (!isNativeApp) {
      performNavigation();
      return;
    }

    const transitionToken = {};
    tabTransitionRef.current = transitionToken;
    window.__wpNativeTransitionInFlight = true;
    document.body.classList.add('native-transition-running', 'native-tab-switching');

    let coverLayer = null;
    const snapshot = window.__wpNativeRouteSnapshots?.get(targetPathname);
    if (snapshot) {
      window.__wpNativeRouteSnapshots.delete(targetPathname);
      snapshot.classList.remove('native-tab-transition', 'native-push-transition', 'native-pop-transition');
      snapshot.classList.add('native-tab-cover-content');
      const savedY = Number(snapshot.dataset.nativeScrollY || 0);
      snapshot.style.transform = savedY > 0 ? `translate3d(0, -${savedY}px, 0)` : 'translate3d(0, 0, 0)';
      snapshot.setAttribute('inert', '');
      coverLayer = document.createElement('div');
      coverLayer.className = 'native-tab-cover-layer';
      coverLayer.setAttribute('aria-hidden', 'true');
      coverLayer.appendChild(snapshot);
      document.body.appendChild(coverLayer);
    }

    let timeoutId = null;
    let completed = false;
    const finishTabSwitch = (event) => {
      if (completed || (event?.detail?.pathname && event.detail.pathname !== targetPathname)) return;
      completed = true;
      window.removeEventListener('wp-native-scroll-restored', finishTabSwitch);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (coverLayer) {
        coverLayer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
          .finished.then(() => coverLayer?.remove()).catch(() => coverLayer?.remove());
      }
      if (tabTransitionRef.current === transitionToken) tabTransitionRef.current = null;
      document.body.classList.remove('native-transition-running', 'native-tab-switching');
      window.__wpNativeTransitionInFlight = false;
      window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
    };

    window.addEventListener('wp-native-scroll-restored', finishTabSwitch);
    timeoutId = window.setTimeout(() => finishTabSwitch(), 250);
    window.__wpNativeRestoreScrollPath = targetPathname;
    flushSync(performNavigation);
  }, [isNativeApp, location.pathname, navigate]);

  useEffect(() => {
    if (!isNativeApp || !['/', '/songs', '/chats', '/profile', '/login'].includes(location.pathname)) {
      return undefined;
    }
    let start = null;
    const isHorizontalScroller = (target) => {
      for (let node = target; node && node !== document.body; node = node.parentElement) {
        if (!(node instanceof HTMLElement)) continue;
        const overflow = getComputedStyle(node).overflowX;
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth + 8) return true;
      }
      return false;
    };
    const onStart = (event) => {
      if (event.touches.length !== 1 || tabTransitionRef.current ||
        event.target.closest('input, textarea, select, button, a, [contenteditable], [data-no-swipe], .no-swipe-nav, .mobile-bottom-nav-wrap, .lg-tab-bar, .lg-segmented') ||
        isHorizontalScroller(event.target)) return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    };
    const onEnd = (event) => {
      if (!start || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const tabs = ['/', '/songs', '/chats', user ? '/profile' : '/login'];
      const index = tabs.indexOf(location.pathname);
      const target = tabs[index + (dx < 0 ? 1 : -1)];
      if (target && guardPath(target)) switchNativeTab(target);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isNativeApp, location.pathname, user, guardPath, switchNativeTab]);

  const handleTabChange = (nextPath) => {
    if (!nextPath || !guardPath(nextPath)) return;
    triggerHaptic('Light');
    if (location.pathname !== nextPath) {
      // Synchronously commit the new tab value before glisse's next animation
      // frame so its spring settles once on the target tab instead of bouncing
      // back to the previous tab and animating a second time.
      flushSync(() => {
        setOptimisticTab({ fromPath: location.pathname, target: nextPath });
      });
      if (isNativeApp) {
        switchNativeTab(nextPath);
      } else {
        navigate(nextPath);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (location.pathname.startsWith('/chat/') || isKeyboardOpen) {
    return null;
  }

  return createPortal(
    <div
      id="wpAppDock"
      className={`mobile-bottom-nav-wrap ${isKeyboardOpen ? 'keyboard-hidden' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <TabBar
        className="wp-glisse-tabbar"
        aria-label={t('nav.main', 'Main navigation')}
        items={mainTabs}
        value={activeValue}
        onValueChange={handleTabChange}
      />
    </div>,
    document.body,
  );
}
