import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const ERROR_ENDPOINT = 'https://worship.pmstudio.am/error_api.php';
const CONFIG_ENDPOINT = 'https://worship.pmstudio.am/mobile_config_api.php';
const NATIVE_QUEUE_KEY = '__wp_native_error_queue';

let isInitialized = false;
const nativeBreadcrumbs = [];
const MAX_NATIVE_BREADCRUMBS = 12;

function addNativeBreadcrumb(category, message) {
  try {
    nativeBreadcrumbs.push({
      t: new Date().toISOString().substring(11, 19),
      type: 'native',
      category: category || 'app',
      message: String(message || '').slice(0, 160),
    });
    if (nativeBreadcrumbs.length > MAX_NATIVE_BREADCRUMBS) {
      nativeBreadcrumbs.shift();
    }
  } catch (_) {}
}

function getUserMeta() {
  let userId = null;
  let userEmail = null;
  try {
    const rawUser = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('worship_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed) {
        userId = parsed.id || parsed.user_id || null;
        userEmail = parsed.email || null;
      }
    }
  } catch (_) {}
  return { userId, userEmail };
}

function queueNativeOfflineError(payload) {
  try {
    const raw = localStorage.getItem(NATIVE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    if (queue.length > 10) queue.shift();
    localStorage.setItem(NATIVE_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

async function flushNativeOfflineErrors() {
  if (navigator.onLine === false) return;
  try {
    const raw = localStorage.getItem(NATIVE_QUEUE_KEY);
    if (!raw) return;
    localStorage.removeItem(NATIVE_QUEUE_KEY);
    const queue = JSON.parse(raw);
    if (Array.isArray(queue) && queue.length > 0) {
      for (const item of queue) {
        await reportMobileError(item, true);
      }
    }
  } catch (_) {}
}

/**
 * Initializes automatic error reporting for iOS and Android native apps.
 */
export function initNativeCrashReporter() {
  if (isInitialized || !Capacitor.isNativePlatform()) return;
  isInitialized = true;

  const platform = Capacitor.getPlatform(); // 'ios' or 'android'
  addNativeBreadcrumb('lifecycle', `Native app started (${platform})`);

  // Listen to App lifecycle state changes
  try {
    App.addListener('appStateChange', (state) => {
      addNativeBreadcrumb('lifecycle', `State changed: ${state.isActive ? 'active' : 'background'}`);
      if (state.isActive) {
        flushNativeOfflineErrors();
      }
    });
  } catch (_) {}

  // Flush queued errors on reconnect
  window.addEventListener('online', flushNativeOfflineErrors);
  setTimeout(flushNativeOfflineErrors, 3000);

  // Global window error listener
  window.addEventListener('error', (event) => {
    try {
      if (event.message === 'Script error.' && !event.filename) return;

      const targetTag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
      if (targetTag === 'audio' || targetTag === 'video' || targetTag === 'source') return;

      const error = event.error || {};
      const errMsg = event.message || error.message || 'Unknown native error';
      addNativeBreadcrumb('crash', errMsg);

      reportMobileError({
        level: 'fatal',
        environment: platform,
        message: errMsg,
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
      const message = typeof reason === 'string' ? reason : (reason.message || 'Unhandled Promise Rejection');
      addNativeBreadcrumb('promise', message);

      reportMobileError({
        level: 'promise',
        environment: platform,
        message,
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
export async function reportMobileError(data, isFlushing = false) {
  try {
    const platform = Capacitor.getPlatform();
    let appInfo = null;
    try {
      appInfo = await App.getInfo();
    } catch (_) {}

    const { userId, userEmail } = getUserMeta();

    const payload = {
      level: data.level || 'error',
      environment: platform || 'app',
      platform,
      is_native: true,
      message: data.message || 'Unknown mobile error',
      file: data.file || null,
      line: data.line || null,
      url: data.url || (typeof window !== 'undefined' ? window.location.href : null),
      stack_trace: data.stack_trace || null,
      user_id: data.user_id || userId,
      user_email: data.user_email || userEmail,
      user_agent: navigator.userAgent,
      breadcrumbs: data.breadcrumbs || nativeBreadcrumbs.slice(),
      device_info: {
        platform,
        native: true,
        version: appInfo?.version || '1.0',
        build: appInfo?.build || '1',
        screen: `${window.screen.width}x${window.screen.height}`,
        online: navigator.onLine !== false,
      },
    };

    if (navigator.onLine === false && !isFlushing) {
      queueNativeOfflineError(payload);
      return;
    }

    const res = await fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok && !isFlushing) {
      queueNativeOfflineError(payload);
    }
  } catch (_) {
    if (!isFlushing) {
      queueNativeOfflineError(data);
    }
  }
}

const NATIVE_DEVICE_ID_KEY = 'wp_native_device_id_v1';

function getOrCreateNativeDeviceId(platform) {
  try {
    let id = localStorage.getItem(NATIVE_DEVICE_ID_KEY);
    if (id && id.length >= 8) return id;
    const rand = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
    id = `${platform}_${rand}`;
    localStorage.setItem(NATIVE_DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `${platform}_anon`;
  }
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

    const deviceId = getOrCreateNativeDeviceId(platform);
    const { userId, userEmail } = getUserMeta();
    const params = new URLSearchParams({
      platform,
      version: String(appInfo.version || '1.0'),
      build: String(appInfo.build || '1'),
      device_id: deviceId,
      _t: String(Date.now()),
    });
    if (userId) params.set('user_id', String(userId));
    if (userEmail) params.set('user_email', String(userEmail));

    const res = await fetch(`${CONFIG_ENDPOINT}?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}
