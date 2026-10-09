import { useEffect } from 'react';
import { flushSync } from 'react-dom';

const EDGE_WIDTH = 32;
const MIN_SWIPE_DISTANCE = 58;
const DIRECTION_RATIO = 1.35;

const isPrimaryTab = (pathname) => pathname === '/' ||
  pathname === '/songs' ||
  pathname === '/chats' ||
  pathname === '/profile' ||
  pathname === '/login';

const fallbackPath = (pathname, user) => {
  if (pathname.startsWith('/chat/')) return '/chats';
  if (pathname.startsWith('/song/') || pathname === '/favorites' || pathname === '/transpose') return '/songs';
  if (pathname.startsWith('/setlists/')) return '/setlists';
  if (pathname.startsWith('/news/')) return '/news';
  if (pathname.startsWith('/settings') || pathname === '/notifications') return user ? '/profile' : '/';
  if (pathname.startsWith('/profile/') || pathname.startsWith('/user/')) return '/friends';
  return '/';
};

const isBlockedTarget = (target) => Boolean(target?.closest?.(
  'input, textarea, select, [contenteditable="true"], .no-swipe-nav, [data-no-swipe]'
));

export function useNativeBackGesture({ enabled, pathname, navigate, user }) {
  useEffect(() => {
    if (!enabled || isPrimaryTab(pathname)) return undefined;

    let tracking = false;
    let startX = 0;
    let startY = 0;

    const reset = () => {
      tracking = false;
    };

    const performLayeredBack = () => {
      const currentRoute = document.querySelector('main .route-animate');
      // Chat and a few native detail screens are fixed-position children, so
      // their route wrapper has a zero-height rectangle. Clone the actual
      // fullscreen surface or the transition layer would be visually empty.
      const visualSource = currentRoute?.querySelector('.chat-page-container') || currentRoute;
      const rect = visualSource?.getBoundingClientRect();
      const outgoingLayer = visualSource?.cloneNode(true);

      if (outgoingLayer && rect) {
        outgoingLayer.setAttribute('aria-hidden', 'true');
        outgoingLayer.className = 'native-pop-outgoing-layer';
        Object.assign(outgoingLayer.style, {
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        document.body.appendChild(outgoingLayer);
      }

      document.body.classList.add('native-pop-switching');
      flushSync(() => navigate(fallbackPath(pathname, user), { replace: true }));

      const startedAt = performance.now();
      const revealWhenReady = () => {
        const nextRoute = document.querySelector('main .route-animate');
        const ready = Boolean(nextRoute?.firstElementChild);
        const timedOut = performance.now() - startedAt > 4_000;
        if (!ready && !timedOut) {
          window.requestAnimationFrame(revealWhenReady);
          return;
        }

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => outgoingLayer?.classList.add('is-leaving'));
        });
        window.setTimeout(() => {
          outgoingLayer?.remove();
          document.body.classList.remove('native-pop-switching');
        }, 380);
      };
      window.requestAnimationFrame(revealWhenReady);
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1 || isBlockedTarget(event.target)) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchEnd = (event) => {
      if (!tracking || event.changedTouches.length !== 1) return reset();
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      reset();

      if (dx < MIN_SWIPE_DISTANCE || dx < Math.abs(dy) * DIRECTION_RATIO) return;
      // A deterministic parent route avoids WKWebView's blank same-document
      // history snapshots and cannot accidentally traverse primary app tabs.
      performLayeredBack();
    };

    const onBackRequest = () => performLayeredBack();

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', reset, { passive: true, capture: true });
    window.addEventListener('wp-native-page-back', onBackRequest);

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', reset, true);
      window.removeEventListener('wp-native-page-back', onBackRequest);
    };
  }, [enabled, navigate, pathname, user]);
}
