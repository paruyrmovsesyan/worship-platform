import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const getScrollY = () => Math.max(
  window.scrollY || 0,
  window.pageYOffset || 0,
  document.scrollingElement?.scrollTop || 0,
  document.documentElement?.scrollTop || 0,
  document.body?.scrollTop || 0,
);

const scrollImmediately = top => {
  window.scrollTo({ top, left: 0, behavior: 'instant' });
  if (document.scrollingElement) document.scrollingElement.scrollTop = top;
  if (document.documentElement) document.documentElement.scrollTop = top;
  if (document.body) document.body.scrollTop = top;
};

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNativeApp) return undefined;
    if (!window.__wpNativeScrollPositions) window.__wpNativeScrollPositions = new Map();
    const recordPosition = () => {
      const scrollY = getScrollY();
      window.__wpNativeScrollPositions.set(pathname, scrollY);
      const snapshot = window.__wpNativeRouteSnapshots?.get(pathname);
      if (snapshot) snapshot.dataset.nativeScrollY = String(scrollY);
    };
    window.addEventListener('scroll', recordPosition, { passive: true });
    return () => window.removeEventListener('scroll', recordPosition);
  }, [isNativeApp, pathname]);

  useLayoutEffect(() => {
    if (!isNativeApp) {
      if (pathname === '/songs') {
        try {
          if (sessionStorage.getItem('songs_app_restore_pending') === '1') return undefined;
        } catch {}
      }
      window.scrollTo(0, 0);
      return undefined;
    }

    const shouldRestore = window.__wpNativeRestoreScrollPath === pathname;
    window.__wpNativeRestoreScrollPath = null;
    if (!shouldRestore) {
      scrollImmediately(0);
      return undefined;
    }

    const targetY = Number(window.__wpNativeScrollPositions?.get(pathname) || 0);
    let cancelled = false;
    let frame = null;
    const startedAt = performance.now();
    const restore = () => {
      if (cancelled) return;
      scrollImmediately(targetY);
      const maxScroll = Math.max(0, (document.scrollingElement?.scrollHeight || 0) - window.innerHeight);
      if (targetY > maxScroll + 1 && performance.now() - startedAt < 1200) {
        frame = window.requestAnimationFrame(restore);
      }
    };
    frame = window.requestAnimationFrame(restore);
    return () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [isNativeApp, pathname]);

  return null;
}
