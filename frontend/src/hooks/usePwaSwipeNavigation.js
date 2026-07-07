import { useEffect } from 'react';

const EDGE_ZONE = 42;
const SWIPE_THRESHOLD = 72;
const VERTICAL_TOLERANCE = 1.35;

const isInteractiveTarget = (target) => {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"], .no-swipe-nav'));
};

const getNavIndex = (pathname, routes) => {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/song/') || pathname.startsWith('/songs') || pathname.startsWith('/favorites')) {
    return routes.findIndex((route) => route.key === 'songs');
  }
  if (pathname.startsWith('/friends') || pathname.startsWith('/chats') || pathname.startsWith('/chat/')) {
    return routes.findIndex((route) => route.key === 'friends');
  }
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
    return routes.findIndex((route) => route.key === 'profile');
  }
  return routes.findIndex((route) => route.path === pathname);
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
    if (!state.wpHomeBackGuard) {
      window.history.replaceState({ ...state, wpHomeBackGuardBase: true }, '', currentUrl);
      window.history.pushState({ wpHomeBackGuard: true }, '', currentUrl);
    }

    const onPopState = () => {
      if (window.location.pathname !== '/') return;
      window.history.pushState({ wpHomeBackGuard: true }, '', currentUrl);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [enabled, pathname]);

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

    const getTargetRoute = (direction) => {
      const currentIndex = getNavIndex(pathname, routes);
      if (currentIndex < 0) return null;
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= routes.length) return null;
      return routes[nextIndex];
    };

    const goToRoute = (route) => {
      if (!route) return;
      if (typeof canAccessPath === 'function' && !canAccessPath(route.path)) {
        if (typeof onBlocked === 'function') onBlocked();
        return;
      }
      navigate(route.path, { replace: true });
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      if (isInteractiveTarget(event.target)) return;

      const touch = event.touches[0];
      const width = window.innerWidth || document.documentElement.clientWidth || 0;
      const nearEdge = touch.clientX <= EDGE_ZONE || touch.clientX >= width - EDGE_ZONE;

      tracking = nearEdge;
      horizontalIntent = false;
      startX = touch.clientX;
      startY = touch.clientY;
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
      if (!tracking) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      tracking = false;

      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * VERTICAL_TOLERANCE) {
        return;
      }

      goToRoute(getTargetRoute(dx < 0 ? 1 : -1));
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [canAccessPath, enabled, navigate, onBlocked, pathname, user]);
}
