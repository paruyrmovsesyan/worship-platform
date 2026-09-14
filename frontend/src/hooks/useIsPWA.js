import { useState, useEffect } from 'react';

const LEGACY_PWA_SESSION_KEY = 'wp_active_app_source';

function clearLegacyAppSource() {
  try {
    window.sessionStorage.removeItem(LEGACY_PWA_SESSION_KEY);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

function detectPwaMode() {
  if (typeof window === 'undefined') return false;

  const browserMode = window.matchMedia('(display-mode: browser)').matches;
  const nativeApp = !browserMode && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );

  if (nativeApp) {
    return true;
  }

  clearLegacyAppSource();
  return false;
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
