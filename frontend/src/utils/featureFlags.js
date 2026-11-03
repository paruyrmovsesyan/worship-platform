/**
 * Feature Flags & Labs Client Utility
 * Synchronizes feature statuses from /features_api.php with offline cache & reactive React hooks.
 * Supports statuses: 'published' (live), 'beta' (in testing with BETA badge), and 'off' (disabled).
 */

import { useState, useEffect } from 'react';

let flagsCache = {};
let catalogCache = {};
let isInitialized = false;

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

/**
 * Fetch feature flags from backend API with cache-busting
 */
export async function loadFeatureFlags(force = false) {
  if (typeof window === 'undefined') return flagsCache;

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
  }

  return flagsCache;
}

/**
 * Get status of a feature: 'published' | 'beta' | 'off'
 */
export function getFeatureStatus(featureId) {
  if (!featureId) return 'published';
  return flagsCache[featureId] || 'published';
}

/**
 * Check if a feature is enabled:
 * - 'off': returns false
 * - 'beta': returns true (active and in testing)
 * - 'published': returns true
 */
export function isFeatureEnabled(featureId, user = null) {
  const status = getFeatureStatus(featureId);
  return status !== 'off';
}

/**
 * Check if a feature is marked as Beta
 */
export function isFeatureBeta(featureId) {
  return getFeatureStatus(featureId) === 'beta';
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

  useEffect(() => {
    // 1. Subscribe to in-memory notifications
    const handleChange = (newFlags, newCatalog) => {
      setFlags({ ...newFlags });
      if (newCatalog) setCatalog({ ...newCatalog });
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
    getStatus: (id) => flags[id] || 'published',
    isEnabled: (id) => (flags[id] || 'published') !== 'off',
    isBeta: (id) => flags[id] === 'beta',
    isOff: (id) => flags[id] === 'off',
  };
}

/**
 * React Hook for a single feature flag
 */
export function useFeatureFlag(featureId) {
  const { getStatus, isEnabled, isBeta, isOff } = useFeatureFlags();
  return {
    status: getStatus(featureId),
    enabled: isEnabled(featureId),
    isBeta: isBeta(featureId),
    isOff: isOff(featureId),
  };
}

// Automatically initiate initial fetch on startup
if (typeof window !== 'undefined') {
  loadFeatureFlags();
}
