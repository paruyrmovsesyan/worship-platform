/**
 * Web & PWA Superpowers and Enhancements
 * Multi-Tab Sync, App Badging, Screen Wake Lock, and Offline Storage Management
 * Only active on Web and PWA environments.
 */

// ── 1. Multi-Tab Real-time Broadcast Bus ──
let multiTabChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    multiTabChannel = new BroadcastChannel('wp_multitab_bus');
  }
} catch (_) {}

export function broadcastTabMessage(action, payload = {}) {
  try {
    const message = { action, payload, timestamp: Date.now() };
    if (multiTabChannel) {
      multiTabChannel.postMessage(message);
    } else {
      localStorage.setItem('__wp_tab_event', JSON.stringify(message));
    }
  } catch (_) {}
}

export function subscribeToTabMessages(onMessage) {
  if (typeof window === 'undefined') return () => {};

  if (multiTabChannel) {
    const handler = (event) => {
      if (event && event.data) onMessage(event.data);
    };
    multiTabChannel.addEventListener('message', handler);
    return () => multiTabChannel.removeEventListener('message', handler);
  }

  const storageHandler = (e) => {
    if (e.key === '__wp_tab_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onMessage(parsed);
      } catch (_) {}
    }
  };
  window.addEventListener('storage', storageHandler);
  return () => window.removeEventListener('storage', storageHandler);
}

// ── 2. Web App Badging API ──
export function updateAppBadge(count) {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    const num = Number(count) || 0;
    if (num > 0) {
      navigator.setAppBadge(num).catch(() => {});
    } else {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }
}

// ── 3. Screen Wake Lock (Keep Awake for live stage performance) ──
let activeWakeLock = null;

export async function requestKeepAwake() {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }
  if (document.visibilityState !== 'visible') {
    return false;
  }
  try {
    if (activeWakeLock && !activeWakeLock.released) {
      return true;
    }
    activeWakeLock = await navigator.wakeLock.request('screen');
    activeWakeLock.addEventListener('release', () => {
      activeWakeLock = null;
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function releaseKeepAwake() {
  if (activeWakeLock) {
    try {
      await activeWakeLock.release();
    } catch (_) {}
    activeWakeLock = null;
  }
}

export function isKeepAwakeActive() {
  return !!(activeWakeLock && !activeWakeLock.released);
}

// ── 4. Offline Storage Management & Analytics ──
export async function getOfflineStorageStats() {
  let songsCount = 0;
  let quotaUsedMB = '0.0';
  let quotaTotalMB = '0';
  let quotaPercentage = 0;
  let lastSyncedAt = null;

  try {
    lastSyncedAt = localStorage.getItem('wp_last_sync_at') || null;
  } catch (_) {}

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const totalBytes = estimate.quota || 1;
      quotaUsedMB = (usedBytes / (1024 * 1024)).toFixed(1);
      quotaTotalMB = (totalBytes / (1024 * 1024)).toFixed(0);
      quotaPercentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
    } catch (_) {}
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('data')) {
          const cache = await caches.open(name);
          const response = await cache.match('/__offline__/songs');
          if (response) {
            const data = await response.clone().json();
            if (Array.isArray(data)) {
              songsCount = data.length;
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  return {
    songsCount,
    quotaUsedMB,
    quotaTotalMB,
    quotaPercentage,
    lastSyncedAt,
  };
}

export async function triggerManualOfflineSync(onProgress) {
  if (typeof window === 'undefined') return { ok: false };
  if (!navigator.onLine) {
    return { ok: false, error: 'Offline' };
  }

  if (onProgress) onProgress(15, 'Ներբեռնվում է երգերի գրադարանը...');

  try {
    const res = await fetch('/api.php', { cache: 'no-store' });
    if (!res.ok) throw new Error('API fetch error');
    const data = await res.clone().json();
    const count = Array.isArray(data) ? data.length : 0;

    if (onProgress) onProgress(65, 'Պահպանվում է օֆֆլայն քեշում...');

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const activeDataCacheName = cacheNames.find(c => c.includes('data')) || 'worship-v535-data';
      const cache = await caches.open(activeDataCacheName);
      await cache.put('/api.php', res.clone());
      await cache.put('/__offline__/songs', res.clone());
    }

    const now = new Date().toISOString();
    try {
      localStorage.setItem('wp_last_sync_at', now);
    } catch (_) {}

    // Tell active service worker to sync the rest
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_OFFLINE_LIBRARY',
        force: true,
      });
    }

    if (onProgress) onProgress(100, 'Ամբողջ գրադարանը հաջողությամբ պահպանված է օֆֆլայն։');
    return { ok: true, count, syncedAt: now };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
