import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const ERROR_ENDPOINT = 'https://worship.pmstudio.am/error_api.php';
const CONFIG_ENDPOINT = 'https://worship.pmstudio.am/mobile_config_api.php';

let isInitialized = false;

/**
 * Initializes automatic error reporting for iOS and Android native apps.
 */
export function initNativeCrashReporter() {
  if (isInitialized || !Capacitor.isNativePlatform()) return;
  isInitialized = true;

  const platform = Capacitor.getPlatform(); // 'ios' or 'android'

  // Global window error listener
  window.addEventListener('error', (event) => {
    try {
      const error = event.error || {};
      reportMobileError({
        level: 'fatal',
        environment: platform,
        message: event.message || error.message || 'Unknown window error',
        file: event.filename || (error.stack ? error.stack.split('\n')[1] : null),
        line: event.lineno || null,
        url: window.location.href,
        stack_trace: error.stack || null,
      });
    } catch (_) {}
  });

  // Global unhandled promise rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason || {};
      reportMobileError({
        level: 'promise',
        environment: platform,
        message: typeof reason === 'string' ? reason : (reason.message || 'Unhandled Promise Rejection'),
        file: reason.stack ? reason.stack.split('\n')[1] : null,
        url: window.location.href,
        stack_trace: reason.stack || null,
      });
    } catch (_) {}
  });
}

/**
 * Sends a captured error directly to the Worship Admin Error Monitor.
 */
export async function reportMobileError(data) {
  try {
    const platform = Capacitor.getPlatform();
    let appInfo = null;
    try {
      appInfo = await App.getInfo();
    } catch (_) {}

    const payload = {
      level: data.level || 'error',
      environment: platform || 'app',
      message: data.message || 'Unknown mobile error',
      file: data.file || null,
      line: data.line || null,
      url: data.url || (typeof window !== 'undefined' ? window.location.href : null),
      stack_trace: data.stack_trace || null,
      user_agent: navigator.userAgent,
      device_info: {
        platform,
        version: appInfo?.version || '1.0',
        build: appInfo?.build || '1',
        screen: `${window.screen.width}x${window.screen.height}`,
      },
    };

    fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Checks server mobile configuration (Force Update, Maintenance, Announcements).
 */
export async function fetchMobileAppStatus() {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const platform = Capacitor.getPlatform();
    let appInfo = { version: '1.0', build: '1' };
    try {
      appInfo = await App.getInfo();
    } catch (_) {}

    const res = await fetch(`${CONFIG_ENDPOINT}?platform=${platform}&version=${appInfo.version}&build=${appInfo.build}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}
