import { useEffect } from 'react';

const EDGE_ZONE = 42;
const SWIPE_THRESHOLD = 56;
const VERTICAL_TOLERANCE = 1.35;
let homeGuardInstalledForDocument = false;

const isTextEntryTarget = (target) => {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], .no-swipe-nav'));
};

const isDetailInteractiveTarget = (target) => {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .no-swipe-nav'));
};

const getNavIndex = (pathname, routes) => routes.findIndex((route) => route.path === pathname);

const getFallbackBackPath = (pathname) => {
  if (pathname.startsWith('/song/') || pathname === '/favorites' || pathname === '/transpose') return '/songs';
  if (pathname.startsWith('/chat/') || pathname === '/chats') return '/friends';
  if (pathname.startsWith('/settings') || pathname === '/notifications') return '/profile';
  if (pathname.startsWith('/setlists/')) return '/setlists';
  if (pathname.startsWith('/news/')) return '/news';
  return '/';
};

export function usePwaSwipeNavigation({
  enabled,
  pathname,
  navigate,
  canAccessPath,
  onBlocked,
  user,
}) {
  useEffect(() => {
    if (!enabled || pathname !== '/') return undefined;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const state = window.history.state || {};
    const hasCurrentHomeGuard = state.wpHomeBackGuard && state.wpHomeBackGuardUrl === currentUrl;
    if (!homeGuardInstalledForDocument || !hasCurrentHomeGuard) {
      window.history.replaceState({ ...state, wpHomeBackGuardBase: true }, '', currentUrl);
      window.history.pushState({ ...state, wpHomeBackGuard: true, wpHomeBackGuardUrl: currentUrl }, '', currentUrl);
      homeGuardInstalledForDocument = true;
    }

    const onPopState = () => {
      if (window.location.pathname !== '/') {
        navigate('/', { replace: true });
      }
      window.history.pushState({
        ...(window.history.state || state),
        wpHomeBackGuard: true,
        wpHomeBackGuardUrl: currentUrl,
      }, '', currentUrl);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [enabled, navigate, pathname]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (pathname.startsWith('/login') || pathname.startsWith('/register')) return undefined;

    const routes = [
      { key: 'home', path: '/' },
      { key: 'songs', path: '/songs' },
      { key: 'friends', path: '/friends' },
      { key: 'profile', path: user ? '/profile' : '/login' },
    ];

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let horizontalIntent = false;
    let isPrimaryRoute = false;
    let navigationLocked = false;

    const getTargetRoute = (direction) => {
      const currentIndex = getNavIndex(pathname, routes);
      if (currentIndex < 0) return null;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= routes.length) return null;
      return routes[nextIndex];
    };

    const goToRoute = (route) => {
      if (!route) return false;
      if (typeof canAccessPath === 'function' && !canAccessPath(route.path)) {
        if (typeof onBlocked === 'function') onBlocked();
        return false;
      }
      navigate(route.path, { replace: true });
      return true;
    };

    const goBack = () => {
      const historyIndex = Number(window.history.state?.idx);
      if (Number.isFinite(historyIndex) && historyIndex > 0) {
        navigate(-1);
        return true;
      }

      const fallbackPath = getFallbackBackPath(pathname);
      if (typeof canAccessPath === 'function' && !canAccessPath(fallbackPath)) {
        if (typeof onBlocked === 'function') onBlocked();
        return false;
      }
      navigate(fallbackPath, { replace: true });
      return true;
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const width = window.innerWidth || document.documentElement.clientWidth || 0;
      const nearLeftEdge = touch.clientX <= EDGE_ZONE;
      const nearRightEdge = touch.clientX >= width - EDGE_ZONE;
      isPrimaryRoute = getNavIndex(pathname, routes) >= 0;

      if (isTextEntryTarget(event.target)) return;
      if (!isPrimaryRoute && isDetailInteractiveTarget(event.target)) return;

      tracking = isPrimaryRoute || nearLeftEdge;
      horizontalIntent = false;
      startX = touch.clientX;
      startY = touch.clientY;

      if (tracking && (nearLeftEdge || nearRightEdge) && event.cancelable) {
        event.preventDefault();
      }
    };

    const onTouchMove = (event) => {
      if (!tracking || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!horizontalIntent && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * VERTICAL_TOLERANCE) {
        horizontalIntent = true;
      }

      if (horizontalIntent && event.cancelable) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event) => {
      if (!tracking || navigationLocked) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      tracking = false;

      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * VERTICAL_TOLERANCE) {
        return;
      }

      if (!isPrimaryRoute) {
        if (dx > 0) {
          navigationLocked = goBack();
        }
        return;
      }

      const targetRoute = getTargetRoute(dx < 0 ? 1 : -1);
      if (!targetRoute) return;
      navigationLocked = goToRoute(targetRoute);
    };

    const onTouchCancel = () => {
      tracking = false;
      horizontalIntent = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [canAccessPath, enabled, navigate, onBlocked, pathname, user]);
}
