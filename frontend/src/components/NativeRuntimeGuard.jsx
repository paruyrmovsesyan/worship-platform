import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

const HEARTBEAT_INTERVAL_MS = 4_000;

export default function NativeRuntimeGuard() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const pingNativeHost = () => {
      try {
        window.webkit?.messageHandlers?.nativeRuntime?.postMessage('heartbeat');
      } catch (_) {}
    };

    const restoreDocument = () => {
      document.documentElement.style.removeProperty('opacity');
      document.body.style.removeProperty('opacity');
      document.body.style.removeProperty('pointer-events');
      window.getSelection?.()?.removeAllRanges?.();
      pingNativeHost();
    };

    pingNativeHost();
    // Explicitly hide the launch screen once React and the native guard are
    // mounted. This also completes pull-to-refresh reloads deterministically.
    window.requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});
    });
    const heartbeat = window.setInterval(pingNativeHost, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', restoreDocument);
    window.addEventListener('pageshow', restoreDocument);
    window.addEventListener('wp-native-resume', restoreDocument);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', restoreDocument);
      window.removeEventListener('pageshow', restoreDocument);
      window.removeEventListener('wp-native-resume', restoreDocument);
    };
  }, []);

  return null;
}
