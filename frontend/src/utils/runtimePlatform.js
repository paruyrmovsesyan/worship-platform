import { Capacitor } from '@capacitor/core';

function hasNativeBundleMarker() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('wp-native-bundle')
    || document.querySelector('meta[name="worship-runtime"]')?.content === 'native';
}

// The marker is injected into the packaged iOS/Android HTML at build time.
// Keep this value immutable so a call can never switch renderer mid-session.
export const IS_NATIVE_RUNTIME = (
  (typeof window !== 'undefined' && window.__WORSHIP_RUNTIME__ === 'native')
  || hasNativeBundleMarker()
  || Capacitor.isNativePlatform()
);

export const NATIVE_PLATFORM = IS_NATIVE_RUNTIME ? Capacitor.getPlatform() : 'web';
