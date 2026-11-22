import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  canCacheNativeRequest,
  normalizeNativeCacheUrl,
  readNativeResponseCache,
  writeNativeResponseCache,
} from './nativeOffline';
import { API_BASE_URL } from './nativeConfig';

const MAX_RAM_ENTRIES = 160;
const ramCache = new Map(); // normalizedUrl -> { body, status, headers, cachedAt, pathname }
const pathInvalidatedAt = new Map(); // pathname -> timestamp (invalidates stale Disk cache after mutations)
const inflightGets = new Map(); // normalizedUrl -> Promise<{ body, status, headers }>
const backgroundRevalidating = new Set();

const LOCAL_BUNDLE_PREFIXES = ['/assets/', '/favicon', '/apple-touch-icon', '/sounds/', '/icons/'];

function isLocalBundlePath(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/') || rawUrl.startsWith('//')) return false;
  return LOCAL_BUNDLE_PREFIXES.some((prefix) => rawUrl.startsWith(prefix));
}

function getCacheTtlPolicy(url) {
  try {
    const pathname = new URL(url, API_BASE_URL).pathname;
    if (pathname === '/bible_api.php') {
      return { freshMs: 30 * 60_000, swrMs: 7 * 24 * 60 * 60_000 };
    }
    if (pathname === '/api.php') {
      return { freshMs: 2 * 60_000, swrMs: 24 * 60 * 60_000 };
    }
    if (pathname === '/news_api.php' || pathname === '/media_api.php' || pathname === '/worship_roles_api.php') {
      return { freshMs: 2 * 60_000, swrMs: 12 * 60 * 60_000 };
    }
    if (pathname === '/church_api.php' || pathname === '/today_api.php' || pathname === '/service_planner_api.php') {
      return { freshMs: 60_000, swrMs: 6 * 60 * 60_000 };
    }
    if (pathname === '/account_api.php') {
      return { freshMs: 30_000, swrMs: 60 * 60_000 };
    }
    return { freshMs: 30_000, swrMs: 6 * 60 * 60_000 };
  } catch {
    return { freshMs: 30_000, swrMs: 6 * 60 * 60_000 };
  }
}

function putRamCache(cacheKey, pathname, entry) {
  if (ramCache.has(cacheKey)) {
    ramCache.delete(cacheKey);
  }
  ramCache.set(cacheKey, { ...entry, pathname });
  while (ramCache.size > MAX_RAM_ENTRIES) {
    const oldestKey = ramCache.keys().next().value;
    ramCache.delete(oldestKey);
  }
}

export function invalidateNativeCacheForUrl(url) {
  try {
    const pathname = new URL(url, API_BASE_URL).pathname;
    const related = new Set([pathname]);
    if (pathname === '/favorites_api.php' || pathname === '/user_favorites_api.php') {
      related.add('/favorites_api.php');
      related.add('/user_favorites_api.php');
      related.add('/api.php');
    }
    if (pathname === '/setlists_api.php') {
      related.add('/setlists_api.php');
    }
    if (pathname === '/account_api.php' || pathname === '/auth_api.php') {
      related.add('/account_api.php');
      related.add('/setlists_api.php');
      related.add('/favorites_api.php');
      related.add('/user_favorites_api.php');
      related.add('/friends_api.php');
    }
    const now = Date.now();
    for (const relPath of related) {
      pathInvalidatedAt.set(relPath, now);
    }
    for (const [key, value] of ramCache.entries()) {
      if (related.has(value.pathname)) {
        ramCache.delete(key);
      }
    }
  } catch {
    ramCache.clear();
  }
}

function buildResponse(payload, cacheStatus = 'MISS') {
  const responseHeaders = new Headers(payload.headers || {});
  if (cacheStatus) {
    responseHeaders.set('X-Worship-Native-Cache', cacheStatus);
  }
  return new Response(payload.body || '', {
    status: payload.status || 200,
    statusText: (payload.status || 200) === 200 ? 'OK' : '',
    headers: responseHeaders,
  });
}

/**
 * Universal Native Network Bridge:
 * In Native App (iOS/Android):
 *   Uses CapacitorHttp native mobile HTTP layer with 2-tier RAM + Disk
 *   Stale-While-Revalidate caching and in-flight deduplication so pages open
 *   instantly from local cache instead of blocking on remote HTTP round-trips.
 * In Web / PWA:
 *   Leaves standard window.fetch 100% untouched.
 */
export function setupNativeNetwork() {
  if (!Capacitor.isNativePlatform()) return;

  const originalFetch = window.fetch;

  const performNetworkRequest = async (url, method, headers, data, cacheKey, pathname, isCacheable) => {
    const response = await CapacitorHttp.request({
      url,
      method,
      headers,
      data,
      webFetchExtra: {
        credentials: 'include',
      },
    });

    let responseBody = response.data;
    if (typeof responseBody === 'object' && responseBody !== null) {
      responseBody = JSON.stringify(responseBody);
    } else if (responseBody === undefined || responseBody === null) {
      responseBody = '';
    } else {
      responseBody = String(responseBody);
    }

    const payload = {
      body: responseBody,
      status: response.status || 200,
      headers: response.headers || {},
      cachedAt: Date.now(),
    };

    if (isCacheable && payload.status >= 200 && payload.status < 300) {
      putRamCache(cacheKey, pathname, payload);
      writeNativeResponseCache(cacheKey, payload).catch(() => {});
    }

    return payload;
  };

  window.fetch = async function (input, init = {}) {
    let rawUrl = '';
    if (typeof input === 'string') {
      rawUrl = input;
    } else if (input instanceof Request) {
      rawUrl = input.url;
    } else if (input && typeof input.toString === 'function') {
      rawUrl = input.toString();
    }

    // Never redirect local bundled static assets to the remote production server
    if (isLocalBundlePath(rawUrl)) {
      return originalFetch.call(this, input, init);
    }

    let url = rawUrl;
    if (url.startsWith('/') && !url.startsWith('//')) {
      url = `${API_BASE_URL}${url}`;
    } else if (!/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url, window.location.href);
        if (parsed.origin === window.location.origin) {
          if (isLocalBundlePath(parsed.pathname)) {
            return originalFetch.call(this, input, init);
          }
          url = `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // Fallback
      }
    }

    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    const headers = {};
    if (input instanceof Request && input.headers) {
      input.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else if (typeof init.headers === 'object') {
        Object.assign(headers, init.headers);
      }
    }

    headers['X-Worship-Native'] = '1';
    headers['X-Worship-Platform'] = Capacitor.getPlatform();

    // Any mutating request immediately invalidates related GET caches
    if (method !== 'GET' && method !== 'HEAD') {
      invalidateNativeCacheForUrl(url);
    }

    let data = init.body;
    if (data === undefined && input instanceof Request) {
      try {
        data = await input.clone().text();
      } catch {
        // Keep original body
      }
    }

    if (typeof data === 'string' && (headers['Content-Type'] || headers['content-type'] || '').includes('application/json')) {
      try {
        data = JSON.parse(data);
      } catch {
        // Leave non-JSON payloads untouched
      }
    }

    const isCacheable = canCacheNativeRequest(url, method);
    const bypassCache =
      init.cache === 'reload' ||
      headers['X-Bypass-Native-Cache'] === '1' ||
      (window.__wpNativeBypassCacheUntil && Date.now() < window.__wpNativeBypassCacheUntil);

    if (isCacheable) {
      const cacheKey = normalizeNativeCacheUrl(url);
      let pathname = '';
      try {
        pathname = new URL(url, API_BASE_URL).pathname;
      } catch {}
      const { freshMs, swrMs } = getCacheTtlPolicy(url);

      const triggerBackgroundRevalidate = () => {
        if (backgroundRevalidating.has(cacheKey) || inflightGets.has(cacheKey)) return;
        backgroundRevalidating.add(cacheKey);
        performNetworkRequest(url, method, headers, data, cacheKey, pathname, true)
          .catch(() => {})
          .finally(() => {
            backgroundRevalidating.delete(cacheKey);
          });
      };

      if (!bypassCache) {
        // Tier 1: Instant 0ms RAM cache hit
        const ramHit = ramCache.get(cacheKey);
        if (ramHit) {
          const age = Date.now() - Number(ramHit.cachedAt || 0);
          if (age < freshMs) {
            return buildResponse(ramHit, 'RAM-FRESH');
          }
          if (age < swrMs) {
            triggerBackgroundRevalidate();
            return buildResponse(ramHit, 'RAM-SWR');
          }
        }

        // Tier 2: Fast local Disk cache hit (~5-15ms) with silent SWR
        const diskHit = await readNativeResponseCache(cacheKey);
        const invalidatedAt = pathInvalidatedAt.get(pathname) || 0;
        if (diskHit && typeof diskHit.body === 'string' && Number(diskHit.cachedAt || 0) > invalidatedAt) {
          const age = Date.now() - Number(diskHit.cachedAt || 0);
          putRamCache(cacheKey, pathname, diskHit);
          if (age < swrMs) {
            if (age >= freshMs) {
              triggerBackgroundRevalidate();
            }
            return buildResponse(diskHit, 'DISK-SWR');
          }
        }
      }

      // Tier 3: Deduplicate concurrent identical GET requests
      if (inflightGets.has(cacheKey)) {
        try {
          const shared = await inflightGets.get(cacheKey);
          return buildResponse(shared, 'DEDUP');
        } catch {
          // Fall through to fresh attempt
        }
      }

      const promise = performNetworkRequest(url, method, headers, data, cacheKey, pathname, true);
      inflightGets.set(cacheKey, promise);
      try {
        const payload = await promise;
        return buildResponse(payload, 'NETWORK');
      } catch (err) {
        console.warn('[NativeHttp] Native request failed, falling back to cache/fetch:', err);
        const fallback = ramCache.get(cacheKey) || (await readNativeResponseCache(cacheKey));
        if (fallback) {
          return buildResponse(fallback, 'OFFLINE-FALLBACK');
        }
        return originalFetch.call(this, input, init);
      } finally {
        inflightGets.delete(cacheKey);
      }
    }

    // Non-cacheable request (mutations, live chat, calls, status checks)
    try {
      const payload = await performNetworkRequest(url, method, headers, data, '', '', false);
      if (method !== 'GET' && method !== 'HEAD') {
        invalidateNativeCacheForUrl(url);
      }
      return buildResponse(payload, 'LIVE');
    } catch (err) {
      console.warn('[NativeHttp] Native request failed, falling back to original fetch:', err);
      return originalFetch.call(this, input, init);
    }
  };
}

let prewarmedOnce = false;

/**
 * Silently warms core read-only API caches in RAM + Disk right after native boot
 * so tapping Songs, Setlists, Favorites, or News renders instantaneously.
 */
export function prewarmNativeCache() {
  if (!Capacitor.isNativePlatform() || prewarmedOnce) return;
  prewarmedOnce = true;

  const coreEndpoints = [
    '/api.php?action=list',
    '/setlists_api.php?action=list',
    '/favorites_api.php?action=list',
    '/news_api.php?action=list',
  ];

  const run = () => {
    coreEndpoints.forEach((endpoint, idx) => {
      window.setTimeout(() => {
        window.fetch(endpoint).catch(() => {});
      }, idx * 140);
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 350);
  }
}
