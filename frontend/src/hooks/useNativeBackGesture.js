import { useEffect } from 'react';
import { flushSync } from 'react-dom';

const EDGE_WIDTH = 32;
const MIN_SWIPE_DISTANCE = 44;
const DIRECTION_RATIO = 1.35;
const COMMIT_PROGRESS = 0.22;
const COMMIT_VELOCITY = 0.42;
const BACK_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const UNDERLAY_OFFSET = 0.18;

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

const getParentRoute = (pathname, user) => {
  const stored = window.__wpNativeParentRoutes?.get(pathname);
  if (stored?.pathname && stored.pathname !== pathname) return stored;
  return { pathname: fallbackPath(pathname, user), canUseHistoryBack: false };
};

const nativeMotionIsReduced = () => document.body.classList.contains('reduce-motion') ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const isBlockedTarget = target => Boolean(target?.closest?.(
  'input, textarea, select, [contenteditable="true"], .no-swipe-nav, [data-no-swipe]'
));

const isHorizontalScrollTarget = target => {
  for (let node = target; node && node !== document.body; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(node);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 8) {
      return true;
    }
  }
  return false;
};

const NATIVE_BACK_SELECTOR = [
  '[data-native-route-back="true"]',
  '.chat-btn-back',
  '.news-reader-back',
  '.news-back-btn',
  '.song-request-back-btn',
  '.user-profile-back-btn',
  '.notif-back-btn',
  '.sla-back-btn',
  '.sle-back-btn',
  '.sll-back',
  '.install-back-link',
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
    let gestureFrame = null;
    let routeAnimations = [];
    let ownsTransitionLock = false;

    const getActiveSurface = () => pathname.startsWith('/chat/')
      ? document.querySelector('body > .chat-page-container')
      : document.querySelector('main .route-animate');

    const clearRouteStyles = route => {
      if (!route) return;
      route.style.transform = '';
      route.classList.remove('native-route-interactive');
    };

    const createUnderlay = () => {
      if (underlayLayer) return underlayLayer;
      const parentPath = getParentRoute(pathname, user).pathname;
      const preparedCache = window.__wpNativePreparedPopLayers;
      let layer = preparedCache?.get(pathname) || null;
      if (layer) {
        preparedCache.delete(pathname);
        if (layer.dataset.nativeParentPath !== parentPath) {
          layer.remove();
          layer = null;
        }
      }

      if (!layer) {
        const snapshot = window.__wpNativeRouteSnapshots?.get(parentPath)?.cloneNode(true);
        if (!snapshot) return null;
        const snapshotScrollY = Number(snapshot.dataset.nativeScrollY || 0);
        snapshot.style.transform = snapshotScrollY > 0
          ? `translate3d(0, -${snapshotScrollY}px, 0)`
          : 'translate3d(0, 0, 0)';
        snapshot.classList.add('native-pop-underlay-content');
        snapshot.setAttribute('inert', '');
        layer = document.createElement('div');
        layer.className = 'native-pop-underlay-layer';
        layer.dataset.nativeParentPath = parentPath;
        layer.setAttribute('aria-hidden', 'true');
        layer.appendChild(snapshot);
      }

      document.body.appendChild(layer);
      underlayLayer = layer;
      underlayX = -window.innerWidth * UNDERLAY_OFFSET;
      layer.style.transform = `translate3d(${underlayX}px, 0, 0)`;
      return layer;
    };

    const retainUnderlay = underlay => {
      if (!underlay) return;
      if (!window.__wpNativePreparedPopLayers) window.__wpNativePreparedPopLayers = new Map();
      const cache = window.__wpNativePreparedPopLayers;
      cache.get(pathname)?.remove();
      underlay.getAnimations().forEach(animation => animation.cancel());
      underlay.style.transform = 'translate3d(-18vw, 0, 0)';
      underlay.remove();
      cache.set(pathname, underlay);
    };

    const prepareRoute = () => {
      if (activeRoute) return activeRoute;
      activeRoute = getActiveSurface();
      if (!activeRoute) return null;
      createUnderlay();
      activeRoute.classList.add('native-route-interactive');
      document.body.classList.add('native-back-interactive');
      document.body.classList.add('native-transition-running');
      window.__wpNativeTransitionInFlight = true;
      ownsTransitionLock = true;
      return activeRoute;
    };

    const releaseTransitionLock = () => {
      if (!ownsTransitionLock) return;
      ownsTransitionLock = false;
      document.body.classList.remove('native-transition-running');
      window.__wpNativeTransitionInFlight = false;
      window.dispatchEvent(new CustomEvent('wp-native-transition-idle'));
    };

    const finishCleanup = (route, underlay, preserveUnderlay = false) => {
      if (gestureFrame !== null) {
        window.cancelAnimationFrame(gestureFrame);
        gestureFrame = null;
      }
      routeAnimations.forEach(animation => animation.cancel());
      routeAnimations = [];
      clearRouteStyles(route);
      if (preserveUnderlay) retainUnderlay(underlay);
      else underlay?.remove();
      document.body.classList.remove('native-back-interactive');
      document.body.classList.remove('native-pop-switching');
      releaseTransitionLock();
    };

    const applyDragFrame = () => {
      gestureFrame = null;
      const route = prepareRoute();
      if (!route) return;
      const width = Math.max(window.innerWidth, 1);
      const progress = dragX / width;
      underlayX = -width * UNDERLAY_OFFSET * (1 - progress);
      route.style.transform = `translate3d(${dragX}px, 0, 0)`;
      if (underlayLayer) {
        underlayLayer.style.transform = `translate3d(${underlayX}px, 0, 0)`;
      }
    };

    const scheduleDragFrame = () => {
      if (gestureFrame === null) gestureFrame = window.requestAnimationFrame(applyDragFrame);
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
        tracking = false;
        settling = false;
        return;
      }

      if (gestureFrame !== null) {
        window.cancelAnimationFrame(gestureFrame);
        gestureFrame = null;
      }
      const duration = Math.max(100, Math.min(200, 120 + (initialX / Math.max(window.innerWidth, 1)) * 80));
      const routeAnimation = route.animate([
        { transform: `translate3d(${initialX}px, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ], { duration, easing: BACK_EASING, fill: 'both' });
      routeAnimations = [routeAnimation];
      if (underlay) {
        routeAnimations.push(underlay.animate([
          { transform: `translate3d(${initialUnderlayX}px, 0, 0)` },
          { transform: 'translate3d(-18vw, 0, 0)' },
        ], { duration, easing: BACK_EASING, fill: 'both' }));
      }
      Promise.allSettled(routeAnimations.map(animation => animation.finished)).then(() => {
        finishCleanup(route, underlay, true);
        settling = false;
      });
    };

    const commitBack = (initialX = 0) => {
      if (settling) return;
      if (window.__wpNativeTransitionInFlight && !activeRoute) return;
      const parentRoute = getParentRoute(pathname, user);
      const parentPath = parentRoute.pathname;
      const reducedMotion = nativeMotionIsReduced();
      const route = reducedMotion ? null : prepareRoute();
      const underlay = underlayLayer;
      if (!route && !reducedMotion) return;
      tracking = false;
      settling = true;
      window.__wpNativeTransitionInFlight = true;
      document.body.classList.add('native-transition-running');
      ownsTransitionLock = true;

      const switchToParent = () => {
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

        window.addEventListener('wp-native-scroll-restored', revealRestoredRoute);
        revealTimeout = window.setTimeout(() => revealRestoredRoute(), 1600);
        window.__wpNativePopTransitionPending = true;
        window.__wpNativeRestoreScrollPath = parentPath;
        window.__wpNativeParentRoutes?.delete(pathname);
        document.body.classList.add('native-pop-switching');
        flushSync(() => {
          const historyIndex = Number(window.history.state?.idx);
          if (parentRoute.canUseHistoryBack && Number.isFinite(historyIndex) && historyIndex > 0) {
            navigate(-1);
          } else {
            navigate(parentPath, { replace: true });
          }
        });
      };

      if (reducedMotion) {
        switchToParent();
        return;
      }

      if (gestureFrame !== null) {
        window.cancelAnimationFrame(gestureFrame);
        gestureFrame = null;
      }
      const width = Math.max(window.innerWidth, 1);
      const remaining = Math.max(0, width - initialX);
      const distanceDuration = 280 * (remaining / width);
      const velocityDuration = velocityX > 0.05 ? remaining / velocityX : distanceDuration;
      const duration = Math.max(110, Math.min(280, distanceDuration, velocityDuration));
      const routeAnimation = route.animate([
        { transform: `translate3d(${initialX}px, 0, 0)` },
        { transform: 'translate3d(100vw, 0, 0)' },
      ], {
        duration,
        easing: BACK_EASING,
        fill: 'both',
      });
      routeAnimations = [routeAnimation];
      if (underlay) {
        routeAnimations.push(underlay.animate([
          { transform: `translate3d(${underlayX}px, 0, 0)` },
          { transform: 'translate3d(0, 0, 0)' },
        ], { duration, easing: BACK_EASING, fill: 'both' }));
      }

      Promise.allSettled(routeAnimations.map(animation => animation.finished)).then(() => {
        // Commit the final compositor frame before cancelling the animations.
        // Otherwise WKWebView can briefly paint the pre-animation inline value.
        route.style.transform = 'translate3d(100vw, 0, 0)';
        if (underlay) underlay.style.transform = 'translate3d(0, 0, 0)';
        routeAnimations.forEach(animation => animation.cancel());
        routeAnimations = [];
        activeRoute = null;
        underlayLayer = null;
        switchToParent();
      });
    };

    const onTouchStart = event => {
      if (settling || window.__wpNativeTransitionInFlight || event.touches.length !== 1 ||
        isBlockedTarget(event.target) || isHorizontalScrollTarget(event.target)) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      lastMoveX = touch.clientX;
      lastMoveTime = event.timeStamp || performance.now();
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
      if (dx < Math.abs(dy) * 1.08) return;
      const now = event.timeStamp || performance.now();
      const instantVelocity = (touch.clientX - lastMoveX) / Math.max(now - lastMoveTime, 1);
      velocityX = velocityX * 0.65 + instantVelocity * 0.35;
      lastMoveX = touch.clientX;
      lastMoveTime = now;
      dragX = Math.min(dx, window.innerWidth);
      if (!nativeMotionIsReduced()) scheduleDragFrame();
      event.preventDefault();
    };

    const onTouchEnd = event => {
      if (!tracking || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      dragX = Math.max(0, Math.min(dx, window.innerWidth));
      if (activeRoute && gestureFrame !== null) {
        window.cancelAnimationFrame(gestureFrame);
        gestureFrame = null;
        applyDragFrame();
      }
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
      if (gestureFrame !== null) window.cancelAnimationFrame(gestureFrame);
      routeAnimations.forEach(animation => animation.cancel());
      if (activeRoute || underlayLayer) finishCleanup(activeRoute, underlayLayer);
      else if (!settling && ownsTransitionLock) releaseTransitionLock();
    };
  }, [enabled, navigate, pathname, user]);
}
