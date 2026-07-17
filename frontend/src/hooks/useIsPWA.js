import { useState, useEffect } from 'react';

const PWA_SESSION_KEY = 'wp_active_app_source';

function getStoredAppSource() {
  try {
    const source = window.sessionStorage.getItem(PWA_SESSION_KEY);
    return source === 'pwa' || source === 'admin-app' ? source : '';
  } catch {
    return '';
  }
}

function storeAppSource(source) {
  try {
    if (source === 'pwa' || source === 'admin-app') {
      window.sessionStorage.setItem(PWA_SESSION_KEY, source);
    }
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

function detectPwaMode() {
  if (typeof window === 'undefined') return false;

  const source = new URLSearchParams(window.location.search).get('source');
  const displayMode = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
    .some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
  const nativeApp = displayMode || window.navigator.standalone === true || document.referrer.includes('android-app://');

  if (source === 'pwa' || source === 'admin-app') {
    storeAppSource(source);
    return true;
  }

  if (nativeApp) {
    storeAppSource('pwa');
    return true;
  }

  return getStoredAppSource() !== '' ||
    document.documentElement.classList.contains('wp-standalone-app') ||
    document.body?.classList.contains('wp-standalone-app');
}

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(detectPwaMode);

  useEffect(() => {
    const checkIsPWA = () => setIsPWA(detectPwaMode());

    checkIsPWA();

    // Listen for changes (e.g. if a user installs it and it opens standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = () => checkIsPWA();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler); // Safari fallback
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return isPWA;
}
