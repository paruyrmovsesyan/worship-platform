import React, { Suspense, useEffect, useLayoutEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, useNavigationType, Navigate } from 'react-router-dom';
import { lazyWithRetry } from './utils/lazyWithRetry';

const LegacySongRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) {
    return <Navigate to={`/song/${id}`} replace />;
  }
  return <Navigate to="/songs" replace />;
};

import MobileNav from './components/MobileNav';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Songs from './pages/Songs';
import SongView from './pages/SongView';
import Setlists from './pages/Setlists';
import SetlistEditor from './pages/SetlistEditor';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import RadioMiniPlayer from './components/RadioMiniPlayer';

// Lazy-loaded secondary & heavy routes for dramatically faster initial startup
const SetlistLive = lazyWithRetry(() => import('./pages/SetlistLive'), 'SetlistLive');
const SetlistPublicWeb = lazyWithRetry(() => import('./pages/SetlistPublicWeb'), 'SetlistPublicWeb');
const Register = lazyWithRetry(() => import('./pages/Register'), 'Register');
const News = lazyWithRetry(() => import('./pages/News'), 'News');
const NewsArticle = lazyWithRetry(() => import('./pages/NewsArticle'), 'NewsArticle');
const Friends = lazyWithRetry(() => import('./pages/Friends'), 'Friends');
const Chat = lazyWithRetry(() => import('./pages/Chat'), 'Chat');
const ChatsList = lazyWithRetry(() => import('./pages/ChatsList'), 'ChatsList');
const Community = lazyWithRetry(() => import('./pages/Community'), 'Community');
const Resources = lazyWithRetry(() => import('./pages/Resources'), 'Resources');
const Contact = lazyWithRetry(() => import('./pages/Contact'), 'Contact');
const About = lazyWithRetry(() => import('./pages/About'), 'About');
const Blog = lazyWithRetry(() => import('./pages/Blog'), 'Blog');
const Careers = lazyWithRetry(() => import('./pages/Careers'), 'Careers');
const Documentation = lazyWithRetry(() => import('./pages/Documentation'), 'Documentation');
const Tutorials = lazyWithRetry(() => import('./pages/Tutorials'), 'Tutorials');
const Support = lazyWithRetry(() => import('./pages/Support'), 'Support');
const Privacy = lazyWithRetry(() => import('./pages/Privacy'), 'Privacy');
const Terms = lazyWithRetry(() => import('./pages/Terms'), 'Terms');
const Cookies = lazyWithRetry(() => import('./pages/Cookies'), 'Cookies');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'Profile');
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'), 'UserProfile');
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'Settings');
const SongRequest = lazyWithRetry(() => import('./pages/SongRequest'), 'SongRequest');
const Notifications = lazyWithRetry(() => import('./pages/Notifications'), 'Notifications');
const TransposeTool = lazyWithRetry(() => import('./pages/TransposeTool'), 'TransposeTool');
const InstallApp = lazyWithRetry(() => import('./pages/InstallApp'), 'InstallApp');
const LiveProjection = lazyWithRetry(() => import('./pages/LiveProjection'), 'LiveProjection');
const ServicePlanner = lazyWithRetry(() => import('./pages/ServicePlanner'), 'ServicePlanner');
const WorshipStudioHub = lazyWithRetry(() => import('./pages/WorshipStudioHub'), 'WorshipStudioHub');
const Bible = lazyWithRetry(() => import('./pages/Bible'), 'Bible');
const ChurchHub = lazyWithRetry(() => import('./pages/ChurchHub'), 'ChurchHub');
const MediaHub = lazyWithRetry(() => import('./pages/MediaHub'), 'MediaHub');
const NotFound = lazyWithRetry(() => import('./pages/NotFound'), 'NotFound');
const ServerError = lazyWithRetry(() => import('./pages/ServerError'), 'ServerError');
const Forbidden = lazyWithRetry(() => import('./pages/Forbidden'), 'Forbidden');
import { Capacitor } from '@capacitor/core';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useIsNativeApp, useIsPWA } from './hooks/useIsPWA';
import ScrollToTop from './components/ScrollToTop';
import TopLoader from './components/TopLoader';
import PullToRefresh from './components/PullToRefresh';
import { usePwaOfflineGuard } from './hooks/usePwaOfflineGuard';
import { usePwaSwipeNavigation } from './hooks/usePwaSwipeNavigation';
import { useNativeBackGesture } from './hooks/useNativeBackGesture';
import { showPwaOfflineBlockedNotice } from './utils/pwaOfflineGuard';
import { useLanguage } from './context/LanguageContext';
import { applyAppTheme, getStoredAppTheme } from './utils/appTheme';
import { updateNativeStatusBar } from './utils/nativeFeatures';
import WebCommandPalette from './components/WebCommandPalette';
import CreateAccountReminder from './components/CreateAccountReminder';
import NativeAppLock from './components/NativeAppLock';
import NativePlatformServices from './components/NativePlatformServices';
import NativeRouteLoader from './components/NativeRouteLoader';
import NativeRuntimeGuard from './components/NativeRuntimeGuard';
import {
  AnnouncementRestrictedView,
  PlatformAnnouncementBanner,
} from './components/PlatformAnnouncementGuard';
import { matchesRestrictedPage, usePlatformAnnouncement } from './utils/featureFlags';
import { API_BASE_URL } from './utils/nativeConfig';

const NATIVE_PRIMARY_PATHS = new Set(['/', '/songs', '/chats', '/profile', '/login']);
const NATIVE_ROUTE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const NATIVE_ROUTE_DURATION = 260;

const nativeMotionIsReduced = () => document.body.classList.contains('reduce-motion') ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const createNativeSnapshotLayer = (pathname, layerClass, contentClass) => {
  const snapshots = window.__wpNativeRouteSnapshots;
  let snapshot = snapshots?.get(pathname);
  if (snapshot) {
    snapshots.delete(pathname);
  } else if (window.__wpNativePreparedPopLayers?.has(pathname)) {
    const prepared = window.__wpNativePreparedPopLayers.get(pathname);
    window.__wpNativePreparedPopLayers.delete(pathname);
    snapshot = prepared?.firstElementChild;
  }
  if (!snapshot) return null;

  // Move the prepared snapshot instead of cloning a long page during an
  // active transition frame. The destination captures a fresh copy later.
  snapshot.classList.remove('native-tab-transition', 'native-push-transition', 'native-pop-transition');
  snapshot.classList.add(contentClass);
  snapshot.style.visibility = '';
  const scrollY = Number(snapshot.dataset.nativeScrollY || 0);
  snapshot.style.transform = scrollY > 0 ? `translate3d(0, -${scrollY}px, 0)` : 'translate3d(0, 0, 0)';
  snapshot.setAttribute('inert', '');

  const layer = document.createElement('div');
  layer.className = layerClass;
  layer.dataset.nativeParentPath = pathname;
  layer.setAttribute('aria-hidden', 'true');
  layer.appendChild(snapshot);
  const nestedScrollY = Number(snapshot.dataset.nativeNestedScrollY || 0);
  if (nestedScrollY > 0) {
    const nestedScroller = snapshot.matches('.chat-page-container')
      ? snapshot.querySelector('.chat-messages-container')
      : null;
    if (nestedScroller) nestedScroller.scrollTop = nestedScrollY;
  }
  return layer;
};

const cacheNativePopLayer = (detailPath, parentPath, layer) => {
  if (!layer) return;
  if (!window.__wpNativePreparedPopLayers) window.__wpNativePreparedPopLayers = new Map();
  const cache = window.__wpNativePreparedPopLayers;
  cache.get(detailPath)?.remove();
  layer.remove();
  layer.className = 'native-pop-underlay-layer';
  layer.dataset.nativeParentPath = parentPath;
  layer.style.transform = 'translate3d(-18vw, 0, 0)';
  const content = layer.firstElementChild;
  content?.classList.remove('native-push-outgoing-content');
  content?.classList.add('native-pop-underlay-content');
  cache.set(detailPath, layer);
  while (cache.size > 4) {
    const oldestPath = cache.keys().next().value;
    cache.get(oldestPath)?.remove();
    cache.delete(oldestPath);
  }
};

function App() {
  const mediaQueryMatch = useMediaQuery('(max-width: 900px)');
  const isIOSMobile = /iPhone|iPod/.test(navigator.userAgent);
  const isAndroidMobile = /Android/i.test(navigator.userAgent);
  
  // Apply Global App Settings
  useEffect(() => {
    const theme = applyAppTheme(getStoredAppTheme(), { persist: false });
    if (localStorage.getItem('reduceMotion') === 'true') document.body.classList.add('reduce-motion');
    if (theme === 'dark' && localStorage.getItem('oledMode') === 'true') document.body.classList.add('oled-mode');
    if (localStorage.getItem('outlinedChords') === 'true') document.body.classList.add('outlined-chords');
    
    const cColor = localStorage.getItem('chordColor');
    if (cColor) {
      document.body.classList.add(`chord-color-${cColor}`);
    } else {
      document.body.classList.add('chord-color-white');
    }
  }, []);
  const isMobile = mediaQueryMatch || isIOSMobile || isAndroidMobile;
  const isPWA = useIsPWA();
  const isNativeApp = useIsNativeApp();
  const isAppMode = isPWA || isNativeApp;
  const runtimeSurface = isNativeApp
    ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
    : (isPWA ? 'pwa' : 'web');
  const location = useLocation();
  const platformAnnouncement = usePlatformAnnouncement(runtimeSurface, API_BASE_URL);
  const isRouteRestricted = matchesRestrictedPage(location.pathname, platformAnnouncement.restrictedPages);
  const { isOffline, canAccessPath } = usePwaOfflineGuard();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const transitionRef = React.useRef(null);
  const previousNativePathRef = React.useRef(location.pathname);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [nativeRefreshing, setNativeRefreshing] = React.useState(false);
  const [rememberPromptOpen, setRememberPromptOpen] = React.useState(false);
  const [rememberPromptSaving, setRememberPromptSaving] = React.useState(false);
  const [rememberPromptError, setRememberPromptError] = React.useState('');
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  useEffect(() => {
    document.body.classList.remove('mobile-theme', 'app-desktop-theme', 'website-theme', 'is-app', 'is-pwa', 'is-ios', 'is-android', 'is-native');
    
    if (isNativeApp) {
      document.body.classList.add('is-native', 'is-app', 'mobile-theme');
      document.body.classList.add(Capacitor.getPlatform() === 'ios' ? 'is-ios' : 'is-android');
    }

    if (isPWA) {
      document.body.classList.add('is-pwa', 'is-app');
      if (isIOSMobile) {
        document.body.classList.add('is-ios');
      } else {
        document.body.classList.add('is-android');
      }
      if (isMobile) {
        document.body.classList.add('mobile-theme');
      } else {
        document.body.classList.add('app-desktop-theme');
      }
    } else if (!isNativeApp) {
      document.body.classList.add('website-theme');
      if (isMobile) {
        document.body.classList.add('mobile-theme');
      }
    }
  }, [isMobile, isNativeApp, isPWA, isIOSMobile]);

  useEffect(() => {
    const syncThemeColor = () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      const storedTheme = localStorage.getItem('theme');
      const isLight = document.documentElement.dataset.theme === 'light' ||
        document.body.classList.contains('light-mode') ||
        storedTheme === 'light';
      const isEditorial = document.documentElement.dataset.themeStyle === 'editorial' ||
        document.body.classList.contains('editorial-theme') ||
        localStorage.getItem('themeStyle') === 'editorial';
      const isOled = document.body.classList.contains('oled-mode') || localStorage.getItem('oledMode') === 'true';

      const color = isNativeApp
        ? (isLight
            ? (isEditorial ? '#FAF7F1' : '#F4F7FB')
            : (isOled ? '#000000' : (isEditorial ? '#141519' : '#05050A')))
        : (isLight ? '#F7F8FC' : (isOled ? '#000000' : '#05050A'));

      if (meta) {
        meta.setAttribute('content', color);
      }
      document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
      if (isNativeApp) {
        updateNativeStatusBar(!isLight);
      }
    };

    syncThemeColor();
    const observer = new MutationObserver(syncThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-theme-style'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', syncThemeColor);
    window.addEventListener('wp-theme-change', syncThemeColor);
    window.addEventListener('wp-theme-style-change', syncThemeColor);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncThemeColor);
      window.removeEventListener('wp-theme-change', syncThemeColor);
      window.removeEventListener('wp-theme-style-change', syncThemeColor);
    };
  }, [isNativeApp]);

  // Listen for push notification navigation from service worker
  useEffect(() => {
    if (!isPWA) return undefined;

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'PUSH_NAVIGATE' && event.data.path) {
        navigate(event.data.path);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, [isPWA, navigate]);

  useEffect(() => {
    if (!isPWA || !isOffline) return;
    if (canAccessPath(location.pathname)) return;

    showPwaOfflineBlockedNotice();
    navigate('/', { replace: true });
  }, [isPWA, isOffline, location.pathname, canAccessPath, navigate]);

  const clearSessionLoginPromptParam = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('session_login')) return;
    params.delete('session_login');
    const nextUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash || ''}`;
    navigate(nextUrl, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useLayoutEffect(() => {
    const route = transitionRef.current;
    if (!route) return undefined;
    const previousPath = previousNativePathRef.current;
    const currentPath = location.pathname;
    const previousIsPrimary = NATIVE_PRIMARY_PATHS.has(previousPath);
    const currentIsPrimary = NATIVE_PRIMARY_PATHS.has(currentPath);
    const isExplicitPop = window.__wpNativeTransitionDirection === 'pop';
    window.__wpNativeTransitionDirection = null;

    const getRouteDepth = (path) => {
      if (NATIVE_PRIMARY_PATHS.has(path)) return 1;
      if (['/setlists', '/friends', '/news', '/favorites', '/settings', '/notifications', '/transpose'].includes(path)) return 2;
      if (path.startsWith('/song/') || path.startsWith('/setlists/') || path.startsWith('/chat/') || path.startsWith('/news/') || path.startsWith('/user/') || path.startsWith('/profile/')) return 3;
      return 2;
    };

    let nativeTransition = 'native-push-transition';
    const hasSharedElementTransition = isNativeApp && window.__wpNativeSharedTransitionPending;
    const hasInteractivePopTransition = isNativeApp && window.__wpNativePopTransitionPending;
    let outgoingLayer = null;
    let frame = null;
    let transitionTimer = null;
    let cancelled = false;
    let animatedSurface = route;
    let routeAnimations = [];
    let ownsTransitionLock = false;
    let pushFinished = false;
    let popFinished = false;

    if (previousPath === currentPath) {
      nativeTransition = 'native-tab-transition';
    } else if (hasInteractivePopTransition) {
      nativeTransition = 'native-pop-transition';
    } else if (hasSharedElementTransition) {
      nativeTransition = 'native-tab-transition';
      window.__wpNativeSharedTransitionPending = false;
    } else if (previousIsPrimary && currentIsPrimary) {
      nativeTransition = 'native-tab-transition';
    } else if (navigationType === 'POP' || isExplicitPop || getRouteDepth(previousPath) > getRouteDepth(currentPath)) {
      nativeTransition = 'native-pop-transition';
    } else if (!previousIsPrimary && currentIsPrimary) {
      nativeTransition = 'native-pop-transition';
    }

    if (isNativeApp && nativeTransition === 'native-push-transition' && previousPath !== currentPath) {
      if (!window.__wpNativeParentRoutes) window.__wpNativeParentRoutes = new Map();
      window.__wpNativeParentRoutes.set(currentPath, {
        pathname: previousPath,
        canUseHistoryBack: navigationType === 'PUSH',
      });
    }

    route.classList.remove(
      'route-animate', 'native-tab-transition',
      'native-push-transition', 'native-pop-transition'
    );
    if (!isNativeApp) {
      void route.offsetWidth;
    }
    route.classList.add('route-animate');

    if (isNativeApp && nativeTransition === 'native-push-transition') {
      window.__wpNativeTransitionInFlight = true;
      document.body.classList.add('native-transition-running');
      ownsTransitionLock = true;
      outgoingLayer = createNativeSnapshotLayer(
        previousPath,
        'native-push-outgoing-layer',
        'native-push-outgoing-content',
      );
      if (outgoingLayer) {
        document.body.appendChild(outgoingLayer);
        document.body.classList.add('native-push-switching');
      }

      const usesPortalSurface = currentPath.startsWith('/chat/');
      if (usesPortalSurface) document.body.classList.add('native-push-awaiting-portal');
      const startedAt = performance.now();
      const beginPush = () => {
        if (cancelled) return;
        const portalSurface = usesPortalSurface
          ? document.querySelector('body > .chat-page-container')
          : null;
        const surfaceReady = usesPortalSurface
          ? Boolean(portalSurface)
          : Boolean(route.firstElementChild && !route.querySelector('.route-lazy-fallback'));
        if (!surfaceReady && performance.now() - startedAt < 1200) {
          frame = window.requestAnimationFrame(beginPush);
          return;
        }
        animatedSurface = portalSurface || (surfaceReady ? route : null);
        document.body.classList.remove('native-push-awaiting-portal');
        if (!animatedSurface) {
          outgoingLayer?.remove();
          outgoingLayer = null;
          document.body.classList.remove('native-push-switching');
          if (ownsTransitionLock) {
            ownsTransitionLock = false;
            document.body.classList.remove('native-transition-running');
            window.__wpNativeTransitionInFlight = false;
            window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
          }
          return;
        }

        animatedSurface.classList.add('native-route-surface');

        const finishPush = () => {
          if (cancelled || pushFinished) return;
          pushFinished = true;
          if (transitionTimer !== null) {
            window.clearTimeout(transitionTimer);
            transitionTimer = null;
          }
          routeAnimations.forEach(animation => animation.cancel());
          routeAnimations = [];
          animatedSurface?.classList.remove('native-route-surface');
          if (animatedSurface) animatedSurface.style.transform = '';
          document.body.classList.remove('native-push-switching');
          if (ownsTransitionLock) {
            ownsTransitionLock = false;
            document.body.classList.remove('native-transition-running');
            window.__wpNativeTransitionInFlight = false;
            window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
          }
          if (outgoingLayer) {
            cacheNativePopLayer(currentPath, previousPath, outgoingLayer);
            outgoingLayer = null;
          }
        };

        if (nativeMotionIsReduced()) {
          finishPush();
          return;
        }

        const incomingAnimation = animatedSurface.animate([
          { transform: 'translate3d(100vw, 0, 0)' },
          { transform: 'translate3d(0, 0, 0)' },
        ], {
          duration: NATIVE_ROUTE_DURATION,
          easing: NATIVE_ROUTE_EASING,
          fill: 'both',
        });
        routeAnimations.push(incomingAnimation);
        if (outgoingLayer) {
          const outgoingAnimation = outgoingLayer.animate([
            { transform: 'translate3d(0, 0, 0)' },
            { transform: 'translate3d(-20vw, 0, 0)' },
          ], {
            duration: NATIVE_ROUTE_DURATION,
            easing: NATIVE_ROUTE_EASING,
            fill: 'both',
          });
          routeAnimations.push(outgoingAnimation);
        }
        transitionTimer = window.setTimeout(finishPush, NATIVE_ROUTE_DURATION + 40);
        Promise.allSettled(routeAnimations.map(animation => animation.finished)).then(finishPush);
      };
      beginPush();
    } else if (isNativeApp && nativeTransition === 'native-pop-transition') {
      if (hasInteractivePopTransition) {
        window.__wpNativePopTransitionPending = false;
        document.body.classList.remove('native-pop-switching', 'native-transition-running', 'native-back-interactive');
        window.__wpNativeTransitionInFlight = false;
        window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
      } else {
        window.__wpNativeTransitionInFlight = true;
        document.body.classList.add('native-transition-running', 'native-pop-switching');
        ownsTransitionLock = true;
        outgoingLayer = createNativeSnapshotLayer(
          previousPath,
          'native-pop-outgoing-layer',
          'native-pop-outgoing-content',
        );
        if (outgoingLayer) {
          document.body.appendChild(outgoingLayer);
        }

        const usesPortalSurface = currentPath.startsWith('/chat/');
        const startedAt = performance.now();
        const beginPop = () => {
          if (cancelled) return;
          const portalSurface = usesPortalSurface
            ? document.querySelector('body > .chat-page-container')
            : null;
          const surfaceReady = usesPortalSurface
            ? Boolean(portalSurface)
            : Boolean(route.firstElementChild && !route.querySelector('.route-lazy-fallback'));
          if (!surfaceReady && performance.now() - startedAt < 1200) {
            frame = window.requestAnimationFrame(beginPop);
            return;
          }
          animatedSurface = portalSurface || (surfaceReady ? route : null);
          if (!animatedSurface) {
            outgoingLayer?.remove();
            outgoingLayer = null;
            document.body.classList.remove('native-pop-switching', 'native-transition-running');
            if (ownsTransitionLock) {
              ownsTransitionLock = false;
              window.__wpNativeTransitionInFlight = false;
              window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
            }
            return;
          }

          animatedSurface.classList.add('native-route-surface');

          const finishPop = () => {
            if (cancelled || popFinished) return;
            popFinished = true;
            if (transitionTimer !== null) {
              window.clearTimeout(transitionTimer);
              transitionTimer = null;
            }
            routeAnimations.forEach(animation => animation.cancel());
            routeAnimations = [];
            animatedSurface?.classList.remove('native-route-surface');
            if (animatedSurface) animatedSurface.style.transform = '';
            outgoingLayer?.remove();
            outgoingLayer = null;
            document.body.classList.remove('native-pop-switching', 'native-transition-running');
            if (ownsTransitionLock) {
              ownsTransitionLock = false;
              window.__wpNativeTransitionInFlight = false;
              window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
            }
          };

          if (nativeMotionIsReduced()) {
            finishPop();
            return;
          }

          const incomingAnimation = animatedSurface.animate([
            { transform: 'translate3d(-20vw, 0, 0)' },
            { transform: 'translate3d(0, 0, 0)' },
          ], {
            duration: NATIVE_ROUTE_DURATION,
            easing: NATIVE_ROUTE_EASING,
            fill: 'both',
          });
          routeAnimations.push(incomingAnimation);

          if (outgoingLayer) {
            const outgoingAnimation = outgoingLayer.animate([
              { transform: 'translate3d(0, 0, 0)' },
              { transform: 'translate3d(100vw, 0, 0)' },
            ], {
              duration: NATIVE_ROUTE_DURATION,
              easing: NATIVE_ROUTE_EASING,
              fill: 'both',
            });
            routeAnimations.push(outgoingAnimation);
          }
          transitionTimer = window.setTimeout(finishPop, NATIVE_ROUTE_DURATION + 40);
          Promise.allSettled(routeAnimations.map(a => a.finished)).then(finishPop);
        };
        beginPop();
      }
    } else if (isNativeApp) {
      route.classList.add(nativeTransition);
    }

    previousNativePathRef.current = currentPath;
    return () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      routeAnimations.forEach(animation => animation.cancel());
      routeAnimations = [];
      animatedSurface?.classList.remove('native-route-surface');
      if (animatedSurface) animatedSurface.style.transform = '';
      outgoingLayer?.remove();
      document.body.classList.remove(
        'native-push-switching',
        'native-pop-switching',
        'native-push-awaiting-portal',
      );
      if (ownsTransitionLock) {
        ownsTransitionLock = false;
        document.body.classList.remove('native-transition-running');
        window.__wpNativeTransitionInFlight = false;
      }
    };
  }, [isNativeApp, location.pathname, navigationType]);

  useLayoutEffect(() => {
    if (!isNativeApp) return undefined;
    let cancelled = false;
    let frame = null;
    let captureTimer = null;
    let observer = null;
    let waitingForTransition = false;
    let scrollSurface = null;
    const startedAt = performance.now();

    const getSnapshotSurface = () => location.pathname.startsWith('/chat/')
      ? document.querySelector('body > .chat-page-container')
      : transitionRef.current;

    const captureRoute = () => {
      if (cancelled) return;
      if (window.__wpNativeTransitionInFlight) {
        if (!waitingForTransition) {
          waitingForTransition = true;
          window.addEventListener('wp-native-transition-idle', scheduleCapture, { once: true });
        }
        return;
      }
      const route = getSnapshotSurface();
      const routeIsReady = location.pathname.startsWith('/chat/')
        ? Boolean(route)
        : Boolean(route?.firstElementChild && !route.querySelector('.route-lazy-fallback'));
      if (!routeIsReady) return;
      if (!window.__wpNativeRouteSnapshots) window.__wpNativeRouteSnapshots = new Map();
      const snapshot = route.cloneNode(true);
      snapshot.classList.remove('native-tab-transition', 'native-push-transition', 'native-pop-transition', 'native-route-surface');
      snapshot.style.visibility = '';
      snapshot.style.transform = '';
      const scrollY = Number(window.__wpNativeScrollPositions?.get(location.pathname) || window.scrollY || 0);
      snapshot.dataset.nativeScrollY = String(scrollY);
      if (location.pathname.startsWith('/chat/')) {
        snapshot.dataset.nativeNestedScrollY = String(route.querySelector('.chat-messages-container')?.scrollTop || 0);
      }
      window.__wpNativeRouteSnapshots.get(location.pathname)?.remove();
      window.__wpNativeRouteSnapshots.delete(location.pathname);
      window.__wpNativeRouteSnapshots.set(location.pathname, snapshot);
      while (window.__wpNativeRouteSnapshots.size > 8) {
        const oldestPath = window.__wpNativeRouteSnapshots.keys().next().value;
        window.__wpNativeRouteSnapshots.get(oldestPath)?.remove();
        window.__wpNativeRouteSnapshots.delete(oldestPath);
      }
    };

    const scheduleCapture = () => {
      waitingForTransition = false;
      if (captureTimer !== null) window.clearTimeout(captureTimer);
      captureTimer = window.setTimeout(captureRoute, 120);
    };

    const recordNestedScroll = () => {
      if (!location.pathname.startsWith('/chat/')) return;
      const snapshot = window.__wpNativeRouteSnapshots?.get(location.pathname);
      if (snapshot && scrollSurface) {
        snapshot.dataset.nativeNestedScrollY = String(scrollSurface.scrollTop || 0);
      }
    };

    frame = window.requestAnimationFrame(() => {
      const startCapture = () => {
        if (cancelled) return;
        const currentRoute = getSnapshotSurface();
        const routeIsReady = location.pathname.startsWith('/chat/')
          ? Boolean(currentRoute)
          : Boolean(currentRoute?.firstElementChild && !currentRoute.querySelector('.route-lazy-fallback'));
        if (!routeIsReady && performance.now() - startedAt < 5000) {
          frame = window.requestAnimationFrame(startCapture);
          return;
        }
        if (!routeIsReady) return;
        captureRoute();
        observer = new MutationObserver(scheduleCapture);
        observer.observe(currentRoute, { childList: true, subtree: true, characterData: true });
        scrollSurface = location.pathname.startsWith('/chat/')
          ? currentRoute.querySelector('.chat-messages-container')
          : null;
        scrollSurface?.addEventListener('scroll', recordNestedScroll, { passive: true });
      };
      startCapture();
    });

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (captureTimer !== null) window.clearTimeout(captureTimer);
      observer?.disconnect();
      scrollSurface?.removeEventListener('scroll', recordNestedScroll);
      if (waitingForTransition) {
        window.removeEventListener('wp-native-transition-idle', scheduleCapture);
      }
      // Never clone a potentially long route in the navigation layout frame.
      // The latest settled snapshot remains preferable to a dropped frame.
      cancelled = true;
    };
  }, [isNativeApp, location.pathname]);

  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(location.search);
    const shouldPromptRemember = params.get('session_login') === '1';

    if (!shouldPromptRemember) {
      if (rememberPromptOpen) {
        setRememberPromptOpen(false);
      }
      return;
    }

    if (user) {
      setRememberPromptError('');
      setRememberPromptOpen(true);
    }
  }, [authLoading, location.search, rememberPromptOpen, user]);

  const handleRememberPromptClose = React.useCallback(() => {
    setRememberPromptError('');
    setRememberPromptSaving(false);
    setRememberPromptOpen(false);
    clearSessionLoginPromptParam();
  }, [clearSessionLoginPromptParam]);

  const handleRememberPromptConfirm = React.useCallback(async () => {
    setRememberPromptSaving(true);
    setRememberPromptError('');
    try {
      const source = isAppMode ? 'pwa' : 'web';
      const response = await fetch('/account_api.php?action=enable_remember_me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remember_me: true, source }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || t('auth.saveLoginError'));
      }

      handleRememberPromptClose();
    } catch (error) {
      setRememberPromptSaving(false);
      setRememberPromptError(error?.message || t('auth.saveLoginError'));
    }
  }, [handleRememberPromptClose, isAppMode, t]);

  const handleSoftRefresh = async () => {
    if (isNativeApp) {
      setNativeRefreshing(true);
      // Never remount the native route tree here. WebKit can race React's DOM
      // cleanup during a keyed remount and throw NotFoundError, leaving the
      // content area empty while the persistent navigation stays visible.
      window.dispatchEvent(new CustomEvent('wp-native-refresh', {
        detail: { pathname: location.pathname, requestedAt: Date.now() },
      }));
      return;
    }
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (!nativeRefreshing) return undefined;

    const startedAt = Date.now();
    const finishWhenReady = window.setInterval(() => {
      const hasRenderedPage = Boolean(transitionRef.current?.firstElementChild);
      const minimumTimePassed = Date.now() - startedAt >= 650;
      const timedOut = Date.now() - startedAt >= 8_000;
      if ((hasRenderedPage && minimumTimePassed) || timedOut) {
        window.clearInterval(finishWhenReady);
        setNativeRefreshing(false);
      }
    }, 100);

    return () => window.clearInterval(finishWhenReady);
  }, [nativeRefreshing, refreshKey]);

  const renderNav = () => {
    const isChatPage = location.pathname.startsWith('/chat/');
    const isProjectionPage = location.pathname.startsWith('/projection');
    if (isProjectionPage) return null;
    if (isAppMode) {
      return isMobile ? (isChatPage ? null : <MobileNav />) : <Sidebar />;
    }
    return <Navbar />;
  };

  const isChatPage = location.pathname.startsWith('/chat/');
  const isProjectionPage = location.pathname.startsWith('/projection');

  usePwaSwipeNavigation({
    enabled: isPWA && isMobile && !isChatPage,
    pathname: location.pathname,
    navigate,
    canAccessPath,
    onBlocked: showPwaOfflineBlockedNotice,
    user,
  });

  useNativeBackGesture({
    enabled: isNativeApp && isMobile,
    pathname: location.pathname,
    navigate,
    user,
  });

  return (
    <PullToRefresh onRefresh={handleSoftRefresh} disabled={isChatPage}>
    <div className={`app-container ${isAppMode && !isMobile ? 'with-sidebar' : ''}`}>
      {isNativeApp ? null : <TopLoader />}
      {isNativeApp ? (
        <>
          <NativeAppLock />
          <NativePlatformServices />
          <NativeRouteLoader refreshing={nativeRefreshing} />
          <NativeRuntimeGuard />
        </>
      ) : null}
      <ScrollToTop />
      {renderNav()}
      <main
        className={isAppMode && !isMobile && !isProjectionPage ? 'main-with-sidebar' : ''}
        style={{
          padding: isProjectionPage ? 0 : undefined,
        }}
      >
        {!(isAppMode && isMobile && location.pathname === '/') && !isProjectionPage && (
          <PlatformAnnouncementBanner
            announcement={platformAnnouncement.announcement}
            dismissed={platformAnnouncement.dismissed}
            onDismiss={platformAnnouncement.dismiss}
            navigate={navigate}
            language={language}
          />
        )}
        <div ref={transitionRef} className="route-animate">
          <ErrorBoundary>
            {isRouteRestricted ? (
              <AnnouncementRestrictedView
                announcement={platformAnnouncement.announcement}
                onBackHome={() => navigate('/')}
                onRecheck={platformAnnouncement.recheck}
                language={language}
              />
            ) : (
            <Suspense
              fallback={
                <div className="route-lazy-fallback" aria-busy="true">
                  <div className="route-lazy-glass-hero" />
                  <div className="route-lazy-glass-grid">
                    <div className="route-lazy-glass-card" />
                    <div className="route-lazy-glass-card" />
                    <div className="route-lazy-glass-card" />
                  </div>
                </div>
              }
            >
            <Routes key={refreshKey}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/transpose" element={<TransposeTool />} />
              <Route path="/install" element={<InstallApp />} />
              <Route path="/song/:id" element={<SongView />} />
              <Route path="/setlists" element={<Setlists />} />
              <Route path="/setlists/public" element={<SetlistPublicWeb />} />
              <Route path="/setlist_public.html" element={<SetlistPublicWeb />} />
              <Route path="/setlists/:id/edit" element={<SetlistEditor />} />
              <Route path="/setlists/:id/live" element={<SetlistLive />} />
              <Route path="/setlists/:id" element={<SetlistEditor />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/chats" element={<ChatsList />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/community" element={<Community />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/tutorials" element={<Tutorials />} />
              <Route path="/support" element={<Support />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/song-request" element={<SongRequest />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/projection/:songId" element={<LiveProjection />} />
              <Route path="/projection/live/:sessionId" element={<LiveProjection />} />
              <Route path="/service-planner" element={<ServicePlanner />} />
              <Route path="/studio" element={<WorshipStudioHub />} />
              <Route path="/tools" element={<WorshipStudioHub />} />
              <Route path="/bible" element={<Bible />} />
              <Route path="/church" element={<ChurchHub />} />
              <Route path="/media" element={<MediaHub />} />

              {/* Explicit Error Pages */}
              <Route path="/500" element={<ServerError />} />
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />

              {/* Legacy URL Redirects */}
              <Route path="/main.html" element={<Navigate to="/songs" replace />} />
              <Route path="/favorites.html" element={<Navigate to="/favorites" replace />} />
              <Route path="/news.html" element={<Navigate to="/news" replace />} />
              <Route path="/setlists.html" element={<Navigate to="/setlists" replace />} />
              <Route path="/account.html" element={<Navigate to="/profile" replace />} />
              <Route path="/loginuser.php" element={<Navigate to="/login" replace />} />
              <Route path="/registeruser.php" element={<Navigate to="/register" replace />} />
              <Route path="/song_view.html" element={<LegacySongRedirect />} />

              {/* Catch-all 404 Not Found Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            )}
          </ErrorBoundary>
        </div>
      </main>
      <RadioMiniPlayer />
      {rememberPromptOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          background: 'rgba(5, 8, 18, 0.74)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: 'min(100%, 420px)',
            background: '#151622',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            boxShadow: '0 28px 70px rgba(0,0,0,0.4)',
            padding: '24px',
            color: '#fff',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.25 }}>{t('auth.saveLoginTitle')}</h3>
            <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('auth.saveLoginDesc')}
            </p>
            {rememberPromptError ? (
              <div style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 82, 82, 0.12)',
                color: '#ff9d9d',
                fontSize: '0.95rem',
              }}>
                {rememberPromptError}
              </div>
            ) : null}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '22px',
              flexWrap: 'wrap',
            }}>
              <button
                type="button"
                onClick={handleRememberPromptClose}
                disabled={rememberPromptSaving}
                style={{
                  minWidth: '112px',
                  height: '46px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: '#fff',
                  padding: '0 18px',
                  cursor: rememberPromptSaving ? 'default' : 'pointer',
                }}
              >
                {t('auth.saveLoginSkip')}
              </button>
              <button
                type="button"
                onClick={handleRememberPromptConfirm}
                disabled={rememberPromptSaving}
                style={{
                  minWidth: '148px',
                  height: '46px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4c4cff 0%, #23c8ff 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0 18px',
                  cursor: rememberPromptSaving ? 'default' : 'pointer',
                }}
              >
                {rememberPromptSaving ? t('auth.pleaseWait') : t('auth.saveLoginConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateAccountReminder />
      {isAppMode ? null : <Footer />}
      {isAppMode ? null : <WebCommandPalette />}
    </div>
    </PullToRefresh>
  );
}

export default App;
