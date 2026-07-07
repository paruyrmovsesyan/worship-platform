import { useEffect, useState } from 'react';
import { useIsPWA } from './useIsPWA';
import { isPwaOfflineRouteAllowed, showPwaOfflineBlockedNotice } from '../utils/pwaOfflineGuard';

export function usePwaOfflineGuard() {
  const isPWA = useIsPWA();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const canAccessPath = (path) => !isPWA || !isOffline || isPwaOfflineRouteAllowed(path);

  const guardPath = (path, onAllowed) => {
    if (canAccessPath(path)) {
      if (typeof onAllowed === 'function') onAllowed();
      return true;
    }

    showPwaOfflineBlockedNotice();
    return false;
  };

  return {
    isPWA,
    isOffline,
    canAccessPath,
    guardPath,
  };
}
