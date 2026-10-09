import { useEffect, useState, useRef, useTransition } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import { triggerHaptic } from '../utils/nativeFeatures';
import { Capacitor } from '@capacitor/core';
import './MobileNav.css';

// Glass bubble vertical expansion sizes (matching native iOS App Store tab lens)
// X scale remains 1.0 so the lens never exceeds dock left/right borders and stays 100% centered
// Y scale expands vertically above and below dock
const LENS_SCALE_Y = 1.28;
const DRAG_SCALE_Y = 1.18;

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { guardPath } = usePwaOfflineGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const isNativeApp = Capacitor.isNativePlatform();

  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isLongPressReady, setIsLongPressReady] = useState(false);
  const [pressedIndex, setPressedIndex] = useState(null);
  const [scrubPosition, setScrubPosition] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const dockRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isScrubbingRef = useRef(false);
  const isLongPressReadyRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const lastHoveredIndexRef = useRef(null);

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

  const getActiveIndex = () => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/songs' || path === '/transpose' || path.startsWith('/song/')) return 1;
    if (path === '/chats' || path.startsWith('/chat/')) return 2;
    if (path === '/profile' || path === '/login' || path === '/settings') return 3;
    return 0;
  };

  const activeIndex = getActiveIndex();

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

  // Helper to compute dock pill position from touch X
  // Ensure the indicator NEVER crosses the dock's left or right borders
  const computePillFromTouch = (clientX) => {
    if (!dockRef.current) return { clampedPillLeft: 0, currentTab: 0 };
    const rect = dockRef.current.getBoundingClientRect();
    const padding = 5;
    const innerWidth = rect.width - padding * 2;
    const tabWidth = innerWidth / 4;

    const fingerRelativeX = clientX - rect.left - padding;
    const currentTab = Math.max(0, Math.min(3, Math.floor(fingerRelativeX / tabWidth)));

    const minLeft = 0;
    const maxLeft = innerWidth - tabWidth;

    const targetPillLeft = fingerRelativeX - tabWidth / 2;
    const clampedPillLeft = Math.max(minLeft, Math.min(maxLeft, targetPillLeft));

    return { clampedPillLeft, currentTab };
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const switchNativeTab = (path) => {
    const performNavigation = () => navigate(path, { replace: true });
    if (!isNativeApp) {
      performNavigation();
      return;
    }

    // Use a short full-viewport crossfade. A positional slide between root
    // tabs feels like history navigation and combining it with the incoming
    // route animation caused a heavy double animation in WKWebView.
    const currentRoute = document.querySelector('main .route-animate');
    const routeSnapshot = currentRoute?.cloneNode(true);
    let outgoingLayer = null;

    if (routeSnapshot) {
      outgoingLayer = document.createElement('div');
      outgoingLayer.setAttribute('aria-hidden', 'true');
      outgoingLayer.className = 'native-tab-outgoing-layer';
      routeSnapshot.classList.add('native-tab-outgoing-content');
      outgoingLayer.appendChild(routeSnapshot);
      document.body.appendChild(outgoingLayer);
    }

    document.body.classList.add('native-tab-switching');
    flushSync(performNavigation);

    const startedAt = performance.now();
    const revealWhenReady = () => {
      const nextRoute = document.querySelector('main .route-animate');
      const contentReady = Boolean(nextRoute?.firstElementChild);
      const timedOut = performance.now() - startedAt > 4_000;

      if (!contentReady && !timedOut) {
        window.requestAnimationFrame(revealWhenReady);
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => outgoingLayer?.classList.add('is-leaving'));
      });
      window.setTimeout(() => {
        outgoingLayer?.remove();
        document.body.classList.remove('native-tab-switching');
      }, 190);
    };
    window.requestAnimationFrame(revealWhenReady);
  };

  const handleNavClick = (path, e) => {
    e?.preventDefault?.();
    if (isScrubbingRef.current || isLongPressReadyRef.current) {
      return;
    }
    if (!guardPath(path)) {
      return;
    }
    triggerHaptic('Light');
    if (location.pathname !== path) {
      if (isNativeApp) {
        // Native bottom navigation behaves as independent persistent tabs.
        switchNativeTab(path);
      } else {
        startTransition(() => navigate(path));
      }
    }
  };

  // Touch scrubbing and Long Press across bottom dock tabs (iOS Stock Style)
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isScrubbingRef.current = false;
    isLongPressReadyRef.current = false;

    // Detect which tab was pressed down
    const { currentTab } = computePillFromTouch(touch.clientX);
    setPressedIndex(currentTab);

    clearLongPressTimer();

    // Start iOS long-press timer (~280ms): lens expands on that tab
    // We do NOT set scrubPosition here to avoid any offset jumps: it stays anchored to currentTab
    longPressTimerRef.current = setTimeout(() => {
      isLongPressReadyRef.current = true;
      setIsLongPressReady(true);
      setHoveredIndex(currentTab);
      lastHoveredIndexRef.current = currentTab;
      triggerHaptic('Medium');
    }, 280);
  };

  const onTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // If user moved finger noticeably before long press timer fired, treat as scrubbing gesture
    if (!isLongPressReadyRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      clearLongPressTimer();
    }

    // If user dragged far vertically away (> 75px up or down), cancel gracefully
    if (isScrubbingRef.current && (dy < -75 || dy > 55)) {
      clearLongPressTimer();
      isScrubbingRef.current = false;
      isLongPressReadyRef.current = false;
      setIsScrubbing(false);
      setIsLongPressReady(false);
      setPressedIndex(null);
      setScrubPosition(null);
      setHoveredIndex(null);
      return;
    }

    // Activate scrubbing after horizontal drag threshold
    if (!isScrubbingRef.current && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      clearLongPressTimer();
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      triggerHaptic('Light');
    }

    if (isScrubbingRef.current && dockRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const { clampedPillLeft, currentTab } = computePillFromTouch(touch.clientX);

      setScrubPosition(clampedPillLeft);

      if (currentTab !== lastHoveredIndexRef.current) {
        lastHoveredIndexRef.current = currentTab;
        setHoveredIndex(currentTab);
        triggerHaptic('Light');
      }
    }
  };

  const onTouchEnd = () => {
    clearLongPressTimer();

    if (isScrubbingRef.current || isLongPressReadyRef.current) {
      const finalTabIdx = lastHoveredIndexRef.current !== null
        ? lastHoveredIndexRef.current
        : (pressedIndex !== null ? pressedIndex : activeIndex);
      const targetTab = mainTabs[finalTabIdx];

      setIsScrubbing(false);
      setIsLongPressReady(false);
      setPressedIndex(null);
      setScrubPosition(null);
      setHoveredIndex(null);

      if (targetTab && guardPath(targetTab.path)) {
        triggerHaptic('Medium');
        if (isNativeApp) {
          switchNativeTab(targetTab.path);
        } else {
          startTransition(() => navigate(targetTab.path));
        }
      }

      setTimeout(() => {
        isScrubbingRef.current = false;
        isLongPressReadyRef.current = false;
        lastHoveredIndexRef.current = null;
      }, 60);
    } else {
      setIsScrubbing(false);
      setIsLongPressReady(false);
      setPressedIndex(null);
      setScrubPosition(null);
      setHoveredIndex(null);
    }
  };

  const onTouchCancel = () => {
    clearLongPressTimer();
    isScrubbingRef.current = false;
    isLongPressReadyRef.current = false;
    setIsScrubbing(false);
    setIsLongPressReady(false);
    setPressedIndex(null);
    setScrubPosition(null);
    setHoveredIndex(null);
    lastHoveredIndexRef.current = null;
  };

  // A conversation owns the entire viewport and its composer must always sit
  // directly above the device safe area. Never leave the app dock mounted
  // behind it, even during route-transition frames.
  if (location.pathname.startsWith('/chat/') || isKeyboardOpen) {
    return null;
  }

  return createPortal(
    <>
      {/* iOS Liquid Glass Bottom Dock */}
      <nav
        id="wpAppDock"
        ref={dockRef}
        className={`mobile-bottom-nav ${isKeyboardOpen ? 'keyboard-hidden' : ''} ${isScrubbing ? 'is-scrubbing' : ''} ${isLongPressReady ? 'is-long-press' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className={`nav-liquid-indicator ${isScrubbing ? 'is-dragging' : ''} ${isLongPressReady ? 'is-lens' : ''}`}
          style={{
            transform: isScrubbing && scrubPosition !== null
              ? `translate3d(${scrubPosition}px, 0, 0)`
              : `translate3d(${(isLongPressReady && hoveredIndex !== null ? hoveredIndex : activeIndex) * 100}%, 0, 0)`,
            transformOrigin: 'center center',
            scale: isScrubbing
              ? `1 ${DRAG_SCALE_Y}`
              : isLongPressReady
                ? `1 ${LENS_SCALE_Y}`
                : '1 1'
          }}
          aria-hidden="true"
        />

        {mainTabs.map((tab, idx) => {
          const isCurrent = activeIndex === idx;
          const isHovered = (isScrubbing || isLongPressReady) && (hoveredIndex === idx || (hoveredIndex === null && pressedIndex === idx));

          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-label={tab.label}
              onClick={(e) => handleNavClick(tab.path, e)}
              onContextMenu={(e) => e.preventDefault()}
              className={`nav-item ${isCurrent && !isScrubbing ? 'active' : ''} ${isHovered ? 'scrub-hovered active' : ''}`}
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
            </button>
          );
        })}
      </nav>
    </>,
    document.body
  );
}
