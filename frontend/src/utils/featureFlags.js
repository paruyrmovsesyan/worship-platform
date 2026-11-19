/**
 * Feature Flags & Labs Client Utility
 * Synchronizes feature statuses from /features_api.php with offline cache & reactive React hooks.
 * Supports statuses: 'published' (live), 'beta' (in testing with BETA badge), and 'off' (disabled).
 */

import { useState, useEffect } from 'react';

let flagsCache = {};
let catalogCache = {};
let announcementRestrictedFeatures = new Set();
let announcementRestrictedPages = [];
let activeAnnouncement = null;
let announcementDismissed = false;
let isInitialized = false;

function isClientAnnouncementExpired(ann) {
  if (!ann || !ann.schedule_end_at) return false;
  const endMs = Date.parse(String(ann.schedule_end_at).trim().replace(' ', 'T'));
  if (Number.isNaN(endMs)) return false;
  return Date.now() >= endMs;
}

export function setAnnouncementRestrictions({ announcement = null, restrictedFeatures = [], restrictedPages = [] } = {}) {
  if (announcement && isClientAnnouncementExpired(announcement)) {
    announcement = null;
    restrictedFeatures = [];
    restrictedPages = [];
  }
  const prevKey = activeAnnouncement ? `${activeAnnouncement.title || ''}|${activeAnnouncement.message || ''}` : '';
  const nextKey = announcement ? `${announcement.title || ''}|${announcement.message || ''}` : '';
  activeAnnouncement = announcement || null;
  if (!announcement || prevKey !== nextKey) {
    announcementDismissed = false;
  }
  announcementRestrictedFeatures = new Set(Array.isArray(restrictedFeatures) ? restrictedFeatures.map(String) : []);
  announcementRestrictedPages = Array.isArray(restrictedPages) ? restrictedPages.map(String) : [];
  notifyListeners();
}

export function dismissPlatformAnnouncement() {
  announcementDismissed = true;
  notifyListeners();
}

export function getAnnouncementRestrictions() {
  if (activeAnnouncement && isClientAnnouncementExpired(activeAnnouncement)) {
    activeAnnouncement = null;
    announcementRestrictedFeatures = new Set();
    announcementRestrictedPages = [];
  }
  return {
    announcement: activeAnnouncement,
    dismissed: announcementDismissed,
    restrictedFeatures: Array.from(announcementRestrictedFeatures),
    restrictedPages: [...announcementRestrictedPages],
  };
}

export function isFeatureRestrictedByAnnouncement(featureId) {
  if (activeAnnouncement && isClientAnnouncementExpired(activeAnnouncement)) {
    activeAnnouncement = null;
    announcementRestrictedFeatures = new Set();
    announcementRestrictedPages = [];
    return false;
  }
  return Boolean(featureId && announcementRestrictedFeatures.has(String(featureId)));
}

export function matchesRestrictedPage(pathname, restrictedPages) {
  if (!pathname || !Array.isArray(restrictedPages) || restrictedPages.length === 0) {
    return false;
  }
  const clean = String(pathname).split('?')[0].split('#')[0] || '/';
  if (clean === '/' || clean === '/login' || clean === '/register' || clean === '/settings') {
    return false;
  }

  return restrictedPages.some((entry) => {
    const key = String(entry || '').trim();
    if (!key) return false;
    if (key === '/songs') return clean === '/songs';
    if (key === '/song') return clean.startsWith('/song/');
    if (key === '/chats') return clean === '/chats' || clean.startsWith('/chat/');
    if (key === '/studio') return clean === '/studio' || clean === '/tools';
    if (key === '/projection') return clean.startsWith('/projection');
    return clean === key || clean.startsWith(`${key}/`);
  });
}

let inFlightAnnouncementPromise = null;

export async function fetchPlatformAnnouncement(surface, baseUrl = '') {
  if (typeof window === 'undefined') return getAnnouncementRestrictions();
  if (inFlightAnnouncementPromise) return inFlightAnnouncementPromise;

  inFlightAnnouncementPromise = (async () => {
    try {
      const endpoint = `${baseUrl}/mobile_config_api.php?platform=${encodeURIComponent(surface)}&_t=${Date.now()}`;
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          const announcement = data.announcement || null;
          const restrictedPages = Array.isArray(data.restrictions?.pages)
            ? data.restrictions.pages
            : (Array.isArray(announcement?.restricted_pages) ? announcement.restricted_pages : []);
          const restrictedFeatures = Array.isArray(data.restrictions?.features)
            ? data.restrictions.features
            : (Array.isArray(announcement?.restricted_features) ? announcement.restricted_features : []);

          setAnnouncementRestrictions({ announcement, restrictedFeatures, restrictedPages });
        }
      }
    } catch {
      // Preserve last cached restriction state while offline
    } finally {
      inFlightAnnouncementPromise = null;
    }
    return getAnnouncementRestrictions();
  })();

  return inFlightAnnouncementPromise;
}

export function usePlatformAnnouncement(surface, baseUrl = '') {
  const [state, setState] = useState(() => getAnnouncementRestrictions());

  useEffect(() => {
    let active = true;

    const handleStoreChange = () => {
      if (active) setState(getAnnouncementRestrictions());
    };
    listeners.add(handleStoreChange);

    const syncFromRemote = () => {
      if (!surface) return;
      fetchPlatformAnnouncement(surface, baseUrl).then((next) => {
        if (active) setState(next);
      });
    };

    syncFromRemote();
    const timer = surface ? window.setInterval(syncFromRemote, 60_000) : null;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncFromRemote();
      }
    };
    if (surface) {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      active = false;
      listeners.delete(handleStoreChange);
      if (timer) window.clearInterval(timer);
      if (surface) document.removeEventListener('visibilitychange', onVisible);
    };
  }, [surface, baseUrl]);

  useEffect(() => {
    const endRaw = state.announcement?.schedule_end_at;
    if (!endRaw) return undefined;
    const endMs = Date.parse(String(endRaw).trim().replace(' ', 'T'));
    if (Number.isNaN(endMs)) return undefined;
    const remainingMs = endMs - Date.now();
    if (remainingMs <= 0) {
      setAnnouncementRestrictions({ announcement: null, restrictedFeatures: [], restrictedPages: [] });
      return undefined;
    }
    const expiryTimer = window.setTimeout(() => {
      setAnnouncementRestrictions({ announcement: null, restrictedFeatures: [], restrictedPages: [] });
      if (surface) {
        fetchPlatformAnnouncement(surface, baseUrl);
      }
    }, Math.min(remainingMs + 250, 2147483647));
    return () => window.clearTimeout(expiryTimer);
  }, [state.announcement?.schedule_end_at, surface, baseUrl]);

  const recheck = async () => {
    const next = await fetchPlatformAnnouncement(surface || 'web', baseUrl);
    setState(next);
    return next;
  };

  return {
    ...state,
    dismiss: dismissPlatformAnnouncement,
    recheck,
  };
}

// 1. Initial hydration from localStorage
try {
  if (typeof window !== 'undefined') {
    const storedFlags = localStorage.getItem('wp_feature_flags');
    if (storedFlags) {
      flagsCache = JSON.parse(storedFlags) || {};
    }
    const storedCatalog = localStorage.getItem('wp_feature_catalog');
    if (storedCatalog) {
      catalogCache = JSON.parse(storedCatalog) || {};
    }
  }
} catch {
  flagsCache = {};
  catalogCache = {};
}

// Set of reactive subscribers
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb({ ...flagsCache }, { ...catalogCache });
    } catch {}
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('wp_feature_flags_updated', {
          detail: { flags: { ...flagsCache }, catalog: { ...catalogCache } },
        })
      );
    } catch {}
  }
}

let inFlightFlagsPromise = null;
let lastFlagsFetchedAt = 0;
const FLAGS_THROTTLE_MS = 60000; // 60 seconds throttle to prevent spamming backend

/**
 * Fetch feature flags from backend API with deduplication & throttling
 */
export async function loadFeatureFlags(force = false) {
  if (typeof window === 'undefined') return flagsCache;

  const now = Date.now();
  if (!force && isInitialized && (now - lastFlagsFetchedAt) < FLAGS_THROTTLE_MS) {
    return flagsCache;
  }

  if (inFlightFlagsPromise) {
    return inFlightFlagsPromise;
  }

  inFlightFlagsPromise = (async () => {
    try {
      const res = await fetch(`/features_api.php?action=get_flags&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.flags) {
          flagsCache = { ...flagsCache, ...data.flags };
          if (data.catalog) {
            catalogCache = { ...catalogCache, ...data.catalog };
          }
          isInitialized = true;
          lastFlagsFetchedAt = Date.now();

          try {
            localStorage.setItem('wp_feature_flags', JSON.stringify(flagsCache));
            if (data.catalog) {
              localStorage.setItem('wp_feature_catalog', JSON.stringify(catalogCache));
            }
          } catch {}

          notifyListeners();
          return flagsCache;
        }
      }
    } catch {
      // Offline fallback: rely on cached flags
    } finally {
      inFlightFlagsPromise = null;
    }

    return flagsCache;
  })();

  return inFlightFlagsPromise;
}

export const PRO_STUDIO_MODULES = [
  'live_stage_follower',
  'rehearsal_stems',
  'lyrics_projection',
  'worship_ai_studio',
  'service_planner',
  'smart_metronome',
];

export const DEFAULT_FLAG_FALLBACKS = {
  pro_studio: 'published',
  live_stage_follower: 'published',
  rehearsal_stems: 'published',
  lyrics_projection: 'published',
  worship_ai_studio: 'published',
  service_planner: 'published',
  smart_metronome: 'published',
};

/**
 * Get status of a feature: 'published' | 'beta' | 'soon' | 'off'
 */
export function getFeatureStatus(featureId) {
  if (!featureId) return 'published';
  return flagsCache[featureId] || DEFAULT_FLAG_FALLBACKS[featureId] || 'published';
}

/**
 * Check if a feature is enabled:
 * - 'off': returns false
 * - 'soon': returns false (inaccessible / disabled)
 * - 'beta': returns true (active and in testing)
 * - 'published': returns true
 */
export function isFeatureEnabled(featureId) {
  if (isFeatureRestrictedByAnnouncement(featureId)) return false;
  if (isFeatureSoon(featureId)) return false;
  const status = getFeatureStatus(featureId);
  return status !== 'off' && status !== 'soon' && status !== 'coming_soon';
}

/**
 * Check if a feature is marked as Beta
 */
export function isFeatureBeta(featureId) {
  if (isFeatureSoon(featureId)) return false;
  if (featureId === 'pro_studio') {
    if (getFeatureStatus('pro_studio') === 'beta') return true;
    return PRO_STUDIO_MODULES.some(m => getFeatureStatus(m) === 'beta');
  }
  return getFeatureStatus(featureId) === 'beta';
}

/**
 * Check if a feature is marked as Coming Soon ('soon' or 'coming_soon')
 */
export function isFeatureSoon(featureId) {
  const status = getFeatureStatus(featureId);
  if (status === 'soon' || status === 'coming_soon') return true;

  if (featureId === 'pro_studio') {
    // If all modules of pro_studio are soon/off and at least one is soon
    const hasLiveOrBeta = PRO_STUDIO_MODULES.some(m => {
      const s = getFeatureStatus(m);
      return s === 'published' || s === 'beta';
    });
    if (!hasLiveOrBeta) {
      const hasSoon = PRO_STUDIO_MODULES.some(m => {
        const s = getFeatureStatus(m);
        return s === 'soon' || s === 'coming_soon';
      });
      if (hasSoon) return true;
    }
  }

  return false;
}

/**
 * Check if a feature is visible in the UI (visible when published, beta, or soon; hidden when off)
 */
export function isFeatureVisible(featureId) {
  return getFeatureStatus(featureId) !== 'off';
}

/**
 * Check if a feature is disabled ('off')
 */
export function isFeatureOff(featureId) {
  return getFeatureStatus(featureId) === 'off';
}

/**
 * React Hook for all feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState(() => ({ ...flagsCache }));
  const [catalog, setCatalog] = useState(() => ({ ...catalogCache }));
  const [restrictedSet, setRestrictedSet] = useState(() => new Set(announcementRestrictedFeatures));

  useEffect(() => {
    // 1. Subscribe to in-memory notifications
    const handleChange = (newFlags, newCatalog) => {
      setFlags({ ...newFlags });
      if (newCatalog) setCatalog({ ...newCatalog });
      setRestrictedSet(new Set(announcementRestrictedFeatures));
    };
    listeners.add(handleChange);

    // 2. Cross-tab synchronization via storage event
    const handleStorage = (e) => {
      if (e.key === 'wp_feature_flags' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          flagsCache = { ...flagsCache, ...parsed };
          setFlags({ ...flagsCache });
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Custom event synchronization (from admin tab or direct event)
    const handleCustomEvent = (e) => {
      if (e?.detail?.flags) {
        flagsCache = { ...flagsCache, ...e.detail.flags };
        setFlags({ ...flagsCache });
        if (e.detail.catalog) {
          catalogCache = { ...catalogCache, ...e.detail.catalog };
          setCatalog({ ...catalogCache });
        }
      }
    };
    window.addEventListener('wp_feature_flags_updated', handleCustomEvent);

    // 4. Revalidate on tab focus (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadFeatureFlags();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Initial load
    loadFeatureFlags();

    return () => {
      listeners.delete(handleChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('wp_feature_flags_updated', handleCustomEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return {
    flags,
    catalog,
    getStatus: (id) => flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published',
    isEnabled: (id) => {
      if (restrictedSet.has(id)) return false;
      const s = flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published';
      if (s === 'off' || s === 'soon' || s === 'coming_soon') return false;
      if (id === 'pro_studio') {
        const hasLiveOrBeta = PRO_STUDIO_MODULES.some(m => {
          if (restrictedSet.has(m)) return false;
          const st = flags[m] || DEFAULT_FLAG_FALLBACKS[m] || 'published';
          return st === 'published' || st === 'beta';
        });
        return hasLiveOrBeta;
      }
      return true;
    },
    isRestricted: (id) => restrictedSet.has(id),
    isBeta: (id) => {
      const s = flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published';
      if (s === 'soon' || s === 'coming_soon') return false;
      if (id === 'pro_studio') {
        if (s === 'beta') return true;
        return PRO_STUDIO_MODULES.some(m => (flags[m] || DEFAULT_FLAG_FALLBACKS[m] || 'published') === 'beta');
      }
      return s === 'beta';
    },
    isSoon: (id) => {
      const s = flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published';
      if (s === 'soon' || s === 'coming_soon') return true;
      if (id === 'pro_studio') {
        const hasLiveOrBeta = PRO_STUDIO_MODULES.some(m => {
          const st = flags[m] || DEFAULT_FLAG_FALLBACKS[m] || 'published';
          return st === 'published' || st === 'beta';
        });
        if (!hasLiveOrBeta) {
          const hasSoon = PRO_STUDIO_MODULES.some(m => {
            const st = flags[m] || DEFAULT_FLAG_FALLBACKS[m] || 'published';
            return st === 'soon' || st === 'coming_soon';
          });
          if (hasSoon) return true;
        }
      }
      return false;
    },
    isVisible: (id) => (flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published') !== 'off',
    isOff: (id) => (flags[id] || DEFAULT_FLAG_FALLBACKS[id] || 'published') === 'off',
  };
}

/**
 * React Hook for a single feature flag
 */
export function useFeatureFlag(featureId) {
  const { getStatus, isEnabled, isBeta, isSoon, isVisible, isOff } = useFeatureFlags();
  return {
    status: getStatus(featureId),
    enabled: isEnabled(featureId),
    isBeta: isBeta(featureId),
    isSoon: isSoon(featureId),
    isVisible: isVisible(featureId),
    isOff: isOff(featureId),
  };
}

// Automatically initiate initial fetch on startup
if (typeof window !== 'undefined') {
  loadFeatureFlags();
}
