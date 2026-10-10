import { useEffect } from 'react';
import { flushSync } from 'react-dom';

const EDGE_WIDTH = 32;
const MIN_SWIPE_DISTANCE = 58;
const DIRECTION_RATIO = 1.35;
const COMMIT_PROGRESS = 0.28;

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

const NATIVE_BACK_SELECTOR = '[data-native-route-back="true"]';

export function useNativeBackGesture({ enabled, pathname, navigate, user }) {
  useEffect(() => {
    if (!enabled || isPrimaryTab(pathname)) return undefined;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let dragLayer = null;
    let dragX = 0;

    const createOutgoingLayer = () => {
      if (dragLayer) return dragLayer;
      const currentRoute = document.querySelector('main .route-animate');
      const routeSnapshot = currentRoute?.cloneNode(true);
      if (!routeSnapshot) return null;

      const layer = document.createElement('div');
      layer.className = 'native-pop-outgoing-layer is-interactive';
      layer.setAttribute('aria-hidden', 'true');
      routeSnapshot.classList.add('native-pop-outgoing-content');
      layer.appendChild(routeSnapshot);
      document.body.appendChild(layer);
      dragLayer = layer;
      return layer;
    };

    const reset = () => {
      tracking = false;
      dragX = 0;
    };

    const performLayeredBack = (interactiveLayer = null, initialX = 0) => {
      const outgoingLayer = interactiveLayer || createOutgoingLayer();
      dragLayer = null;

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

        if (outgoingLayer) {
          outgoingLayer.classList.remove('is-interactive');
          const animation = outgoingLayer.animate([
            { transform: `translate3d(${initialX}px, 0, 0)` },
            { transform: 'translate3d(100vw, 0, 0)' },
          ], {
            duration: Math.max(150, 300 * (1 - initialX / Math.max(window.innerWidth, 1))),
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
            fill: 'forwards',
          });
          animation.finished.catch(() => {}).finally(() => outgoingLayer.remove());
        }
        window.setTimeout(() => {
          outgoingLayer?.remove();
          document.body.classList.remove('native-pop-switching');
        }, 340);
      };
      window.requestAnimationFrame(revealWhenReady);
    };

    const cancelInteractiveBack = () => {
      const layer = dragLayer;
      const initialX = dragX;
      dragLayer = null;
      tracking = false;
      dragX = 0;
      if (!layer) return;
      const animation = layer.animate([
        { transform: `translate3d(${initialX}px, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ], {
        duration: 180,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      });
      animation.finished.catch(() => {}).finally(() => layer.remove());
    };

    const onTouchStart = (event) => {
      if (event.touches.length !== 1 || isBlockedTarget(event.target)) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchMove = (event) => {
      if (!tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = Math.max(0, touch.clientX - startX);
      const dy = touch.clientY - startY;
      if (Math.abs(dy) > dx * DIRECTION_RATIO) {
        cancelInteractiveBack();
        reset();
        return;
      }
      if (dx < 6) return;
      const layer = createOutgoingLayer();
      if (!layer) return;
      dragX = Math.min(dx, window.innerWidth);
      layer.style.transform = `translate3d(${dragX}px, 0, 0)`;
      layer.style.boxShadow = `${Math.max(-18, -18 + dragX / 24)}px 0 30px rgba(0,0,0,.28)`;
      event.preventDefault();
    };

    const onTouchEnd = (event) => {
      if (!tracking || event.changedTouches.length !== 1) return reset();
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const shouldCommit = dx >= MIN_SWIPE_DISTANCE &&
        dx >= Math.abs(dy) * DIRECTION_RATIO &&
        dx / Math.max(window.innerWidth, 1) >= COMMIT_PROGRESS;
      const layer = dragLayer;
      const currentX = dragX;
      reset();

      if (!shouldCommit) {
        dragLayer = layer;
        dragX = currentX;
        cancelInteractiveBack();
        return;
      }
      // A deterministic parent route avoids WKWebView's blank same-document
      // history snapshots and cannot accidentally traverse primary app tabs.
      performLayeredBack(layer, currentX);
    };

    const onBackRequest = () => performLayeredBack();

    const onNativeBackClick = (event) => {
      if (!event.target?.closest?.(NATIVE_BACK_SELECTOR)) return;
      event.preventDefault();
      event.stopPropagation();
      performLayeredBack();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', cancelInteractiveBack, { passive: true, capture: true });
    window.addEventListener('wp-native-page-back', onBackRequest);
    document.addEventListener('click', onNativeBackClick, true);

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', cancelInteractiveBack, true);
      dragLayer?.remove();
      window.removeEventListener('wp-native-page-back', onBackRequest);
      document.removeEventListener('click', onNativeBackClick, true);
    };
  }, [enabled, navigate, pathname, user]);
}
