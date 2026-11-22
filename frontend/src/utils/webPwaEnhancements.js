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
  let setlistsCount = 0;
  let bibleChaptersCount = 0;
  let quotaUsedMB = '0.0';
  let quotaTotalMB = '0';
  let quotaPercentage = 0;
  let lastSyncedAt = null;

  try {
    lastSyncedAt = localStorage.getItem('wp_last_sync_at') || null;
    const rawSetlists = localStorage.getItem('wp_setlists_index_cache');
    if (rawSetlists) {
      const parsed = JSON.parse(rawSetlists);
      if (Array.isArray(parsed)) setlistsCount = parsed.length;
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wp_bible_ch_')) bibleChaptersCount += 1;
    }
    const rawSongs = localStorage.getItem('wp_songs_cache');
    if (rawSongs) {
      const parsed = JSON.parse(rawSongs);
      if (Array.isArray(parsed)) songsCount = parsed.length;
    }
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
            if (Array.isArray(data) && data.length > songsCount) {
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
    setlistsCount,
    bibleChaptersCount,
    quotaUsedMB,
    quotaTotalMB,
    quotaPercentage,
    lastSyncedAt,
  };
}

export async function triggerManualOfflineSync(onProgress, options = {}) {
  const { includeSetlists = true, includeBible = true } = options;
  if (typeof window === 'undefined') return { ok: false };
  if (!navigator.onLine) {
    return { ok: false, error: 'Ինտերնետ կապ չկա' };
  }

  if (onProgress) onProgress(8, 'Ներբեռնվում է երգերի գրադարանը...');

  try {
    const res = await fetch('/api.php', { cache: 'no-store' });
    if (!res.ok) throw new Error('API fetch error');
    const data = await res.clone().json();
    const songsCount = Array.isArray(data) ? data.length : 0;

    try {
      if (Array.isArray(data)) {
        localStorage.setItem('wp_songs_cache', JSON.stringify(data));
      }
    } catch (_) {}

    if (onProgress) onProgress(32, `Պահպանվեց ${songsCount} երգ, բեռնվում են երգացանկերը...`);

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const activeDataCacheName = cacheNames.find(c => c.includes('data')) || 'worship-v617-data';
      const cache = await caches.open(activeDataCacheName);
      await cache.put('/api.php', res.clone());
      await cache.put('/__offline__/songs', res.clone());
    }

    let setlistsCount = 0;
    if (includeSetlists) {
      try {
        const [slRes, favRes] = await Promise.all([
          fetch('/setlists_api.php?action=get_setlists', { credentials: 'same-origin', cache: 'no-store' }).catch(() => null),
          fetch('/user_favorites_api.php?action=get_favorites', { credentials: 'same-origin', cache: 'no-store' }).catch(() => null),
        ]);
        if (favRes && favRes.ok) {
          const favs = await favRes.json().catch(() => null);
          if (Array.isArray(favs)) {
            try { localStorage.setItem('wp_user_favorites_cache', JSON.stringify(favs)); } catch (_) {}
          }
        }
        if (slRes && slRes.ok) {
          const slData = await slRes.json().catch(() => null);
          const list = Array.isArray(slData) ? slData : (Array.isArray(slData?.setlists) ? slData.setlists : []);
          setlistsCount = list.length;
          try { localStorage.setItem('wp_setlists_index_cache', JSON.stringify(list)); } catch (_) {}

          const topSetlists = list.slice(0, 10);
          for (let i = 0; i < topSetlists.length; i += 1) {
            const sl = topSetlists[i];
            if (!sl?.id) continue;
            try {
              const itemsRes = await fetch(`/setlists_api.php?action=get_setlist_items&setlist_id=${sl.id}`, {
                credentials: 'same-origin',
                cache: 'no-store',
              });
              if (itemsRes.ok) {
                const detail = await itemsRes.json().catch(() => null);
                if (detail && !detail.error) {
                  try { localStorage.setItem(`wp_setlist_cache_${sl.id}`, JSON.stringify(detail)); } catch (_) {}
                }
              }
            } catch (_) {}
            if (onProgress) {
              const pct = 35 + Math.round(((i + 1) / Math.max(1, topSetlists.length)) * 25);
              onProgress(pct, `Պահպանվում են երգացանկերը (${i + 1}/${topSetlists.length})...`);
            }
          }
        }
      } catch (_) {}
    }

    let bibleCount = 0;
    if (includeBible) {
      let tr = 'ararat_new';
      try {
        const lastRead = JSON.parse(localStorage.getItem('wp_bible_last_read_v1') || 'null');
        if (lastRead?.translation) tr = lastRead.translation;
      } catch (_) {}

      const coreChapters = [
        [19, 1], [19, 23], [19, 27], [19, 46], [19, 51], [19, 91], [19, 103], [19, 121], [19, 139], [19, 150],
        [43, 1], [43, 3], [43, 14], [43, 15], [43, 17],
        [45, 8], [46, 13], [50, 4],
      ];

      for (let i = 0; i < coreChapters.length; i += 1) {
        const [bId, chNum] = coreChapters[i];
        const key = `wp_bible_ch_${tr}_${bId}_${chNum}`;
        try {
          if (!localStorage.getItem(key)) {
            const bRes = await fetch(`/bible_api.php?action=chapter&tr=${encodeURIComponent(tr)}&book=${bId}&chapter=${chNum}`);
            const bData = await bRes.json().catch(() => null);
            if (bData?.ok && Array.isArray(bData.verses)) {
              localStorage.setItem(key, JSON.stringify({ verses: bData.verses, savedAt: Date.now() }));
            }
          }
          bibleCount += 1;
        } catch (_) {}
        if (onProgress) {
          const pct = 62 + Math.round(((i + 1) / coreChapters.length) * 32);
          onProgress(pct, `Պահպանվում է Աստվածաշունչը (${i + 1}/${coreChapters.length})...`);
        }
      }
    }

    const now = new Date().toISOString();
    try {
      localStorage.setItem('wp_last_sync_at', now);
    } catch (_) {}

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_OFFLINE_LIBRARY',
        force: true,
      });
    }

    if (onProgress) onProgress(100, 'Ամբողջ օֆլայն փաթեթը պատրաստ է։');
    return { ok: true, count: songsCount, setlistsCount, bibleCount, syncedAt: now };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
