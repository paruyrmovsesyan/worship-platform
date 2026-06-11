import { useState, useEffect } from 'react';

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if it's running as a standalone PWA
    const checkIsPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone 
        || document.referrer.includes('android-app://');
      
      setIsPWA(isStandalone);
    };

    checkIsPWA();

    // Listen for changes (e.g. if a user installs it and it opens standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e) => setIsPWA(e.matches);
    
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
