import { useEffect } from 'react';
import { flushSync } from 'react-dom';

const EDGE_WIDTH = 32;
const MIN_SWIPE_DISTANCE = 44;
const DIRECTION_RATIO = 1.35;
const COMMIT_PROGRESS = 0.22;
const COMMIT_VELOCITY = 0.42;

const isPrimaryTab = pathname => pathname === '/' ||
  pathname === '/songs' || pathname === '/chats' ||
  pathname === '/profile' || pathname === '/login';

const fallbackPath = (pathname, user) => {
  if (pathname.startsWith('/chat/')) return '/chats';
  if (pathname.startsWith('/song/') || pathname === '/favorites' || pathname === '/transpose') return '/songs';
  if (pathname.startsWith('/setlists/')) return '/setlists';
  if (pathname.startsWith('/news/')) return '/news';
  if (pathname.startsWith('/settings') || pathname === '/notifications') return user ? '/profile' : '/';
  if (pathname.startsWith('/profile/') || pathname.startsWith('/user/')) return '/friends';
  return '/';
};

const isBlockedTarget = target => Boolean(target?.closest?.(
  'input, textarea, select, [contenteditable="true"], .no-swipe-nav, [data-no-swipe]'
));

const NATIVE_BACK_SELECTOR = [
  '[data-native-route-back="true"]',
  '.chat-btn-back',
  '.news-reader-back',
  '.song-request-back-btn',
  '.user-profile-back-btn',
  '.notif-back-btn',
].join(', ');

export function useNativeBackGesture({ enabled, pathname, navigate, user }) {
  useEffect(() => {
    if (!enabled || isPrimaryTab(pathname)) return undefined;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let dragX = 0;
    let activeRoute = null;
    let underlayLayer = null;
    let underlayX = 0;
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let velocityX = 0;
    let settling = false;

    const getActiveSurface = () => pathname.startsWith('/chat/')
      ? document.querySelector('body > .chat-page-container')
      : document.querySelector('main .route-animate');

    const clearRouteStyles = route => {
      if (!route) return;
      route.style.transform = '';
      route.style.willChange = '';
      route.style.position = '';
      route.style.zIndex = '';
    };

    const createUnderlay = () => {
      if (underlayLayer) return underlayLayer;
      const parentPath = fallbackPath(pathname, user);
      const snapshot = window.__wpNativeRouteSnapshots?.get(parentPath)?.cloneNode(true);
      if (!snapshot) return null;
      const snapshotScrollY = Number(snapshot.dataset.nativeScrollY || 0);
      if (snapshotScrollY > 0) {
        snapshot.style.transform = `translate3d(0, -${snapshotScrollY}px, 0)`;
      }
      const layer = document.createElement('div');
      layer.className = 'native-pop-underlay-layer';
      layer.setAttribute('aria-hidden', 'true');
      snapshot.classList.add('native-pop-underlay-content');
      layer.appendChild(snapshot);
      document.body.appendChild(layer);
      underlayLayer = layer;
      underlayX = -window.innerWidth * 0.18;
      layer.style.transform = `translate3d(${underlayX}px, 0, 0)`;
      return layer;
    };

    const prepareRoute = () => {
      if (activeRoute) return activeRoute;
      activeRoute = getActiveSurface();
      if (!activeRoute) return null;
      createUnderlay();
      activeRoute.style.willChange = 'transform';
      activeRoute.style.position = 'relative';
      activeRoute.style.zIndex = '9000';
      document.body.classList.add('native-back-interactive');
      return activeRoute;
    };

    const finishCleanup = (route, underlay) => {
      clearRouteStyles(route);
      underlay?.remove();
      document.body.classList.remove('native-back-interactive');
      document.body.classList.remove('native-pop-switching');
    };

    const cancelBack = () => {
      const route = activeRoute;
      const underlay = underlayLayer;
      const initialX = dragX;
      const initialUnderlayX = underlayX;
      tracking = false;
      settling = true;
      activeRoute = null;
      underlayLayer = null;
      dragX = 0;
      if (!route) {
        finishCleanup(route, underlay);
        settling = false;
        return;
      }

      const routeAnimation = route.animate([
        { transform: `translate3d(${initialX}px, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ], { duration: 180, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
      underlay?.animate([
        { transform: `translate3d(${initialUnderlayX}px, 0, 0)` },
        { transform: 'translate3d(-18vw, 0, 0)' },
      ], { duration: 180, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
      routeAnimation.finished.catch(() => {}).finally(() => {
        finishCleanup(route, underlay);
        settling = false;
      });
    };

    const commitBack = (initialX = 0) => {
      if (settling) return;
      const route = prepareRoute();
      const underlay = underlayLayer;
      if (!route) return;
      tracking = false;
      settling = true;
      const duration = Math.max(140, 280 * (1 - initialX / Math.max(window.innerWidth, 1)));
      const routeAnimation = route.animate([
        { transform: `translate3d(${initialX}px, 0, 0)` },
        { transform: 'translate3d(100vw, 0, 0)' },
      ], {
        duration,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
        fill: 'forwards',
      });
      underlay?.animate([
        { transform: `translate3d(${underlayX}px, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ], { duration, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' });

      routeAnimation.finished.catch(() => {}).finally(() => {
        routeAnimation.cancel();
        clearRouteStyles(route);
        activeRoute = null;
        underlayLayer = null;
        const parentPath = fallbackPath(pathname, user);
        let revealTimeout = null;
        let revealed = false;
        const revealRestoredRoute = event => {
          if (revealed || (event?.detail?.pathname && event.detail.pathname !== parentPath)) return;
          revealed = true;
          window.removeEventListener('wp-native-scroll-restored', revealRestoredRoute);
          if (revealTimeout !== null) window.clearTimeout(revealTimeout);
          finishCleanup(null, underlay);
          settling = false;
        };

        // Subscribe before navigating: ScrollToTop restores during the
        // destination route's layout phase and can signal synchronously.
        window.addEventListener('wp-native-scroll-restored', revealRestoredRoute);
        revealTimeout = window.setTimeout(() => revealRestoredRoute(), 1500);
        window.__wpNativePopTransitionPending = true;
        window.__wpNativeRestoreScrollPath = parentPath;
        document.body.classList.add('native-pop-switching');
        flushSync(() => navigate(parentPath, { replace: true }));
      });
    };

    const onTouchStart = event => {
      if (settling || event.touches.length !== 1 || isBlockedTarget(event.target)) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      lastMoveX = touch.clientX;
      lastMoveTime = performance.now();
      velocityX = 0;
    };

    const onTouchMove = event => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = Math.max(0, touch.clientX - startX);
      const dy = touch.clientY - startY;
      if (Math.abs(dy) > dx * DIRECTION_RATIO) {
        cancelBack();
        return;
      }
      if (dx < 6) return;
      const route = prepareRoute();
      if (!route) return;
      const now = performance.now();
      velocityX = (touch.clientX - lastMoveX) / Math.max(now - lastMoveTime, 1);
      lastMoveX = touch.clientX;
      lastMoveTime = now;
      dragX = Math.min(dx, window.innerWidth);
      route.style.transform = `translate3d(${dragX}px, 0, 0)`;
      if (underlayLayer) {
        const progress = dragX / Math.max(window.innerWidth, 1);
        underlayX = -window.innerWidth * 0.18 * (1 - progress);
        underlayLayer.style.transform = `translate3d(${underlayX}px, 0, 0)`;
      }
      event.preventDefault();
    };

    const onTouchEnd = event => {
      if (!tracking || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const shouldCommit = dx >= MIN_SWIPE_DISTANCE &&
        dx >= Math.abs(dy) * DIRECTION_RATIO &&
        (dx / Math.max(window.innerWidth, 1) >= COMMIT_PROGRESS || velocityX >= COMMIT_VELOCITY);
      if (shouldCommit) commitBack(dragX);
      else cancelBack();
    };

    const onBackRequest = () => commitBack(0);
    const onNativeBackClick = event => {
      if (!event.target?.closest?.(NATIVE_BACK_SELECTOR)) return;
      event.preventDefault();
      event.stopPropagation();
      commitBack(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', cancelBack, { passive: true, capture: true });
    window.addEventListener('wp-native-page-back', onBackRequest);
    document.addEventListener('click', onNativeBackClick, true);

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', cancelBack, true);
      window.removeEventListener('wp-native-page-back', onBackRequest);
      document.removeEventListener('click', onNativeBackClick, true);
      clearRouteStyles(activeRoute);
      underlayLayer?.remove();
      document.body.classList.remove('native-back-interactive');
    };
  }, [enabled, navigate, pathname, user]);
}
