/**
 * Feature Flags & Labs Client Utility
 * Synchronizes feature statuses from /features_api.php with offline cache.
 */

let flagsCache = null;

try {
  const stored = localStorage.getItem('wp_feature_flags');
  if (stored) {
    flagsCache = JSON.parse(stored);
  }
} catch {
  flagsCache = null;
}

export async function loadFeatureFlags() {
  try {
    const res = await fetch('/features_api.php?action=get_flags');
    if (res.ok) {
      const data = await res.json();
      if (data && data.flags) {
        flagsCache = data.flags;
        try {
          localStorage.setItem('wp_feature_flags', JSON.stringify(data.flags));
        } catch {
          // Ignore local storage write errors
        }
        return flagsCache;
      }
    }
  } catch {
    // Offline fallback: rely on cached or default flags
  }
  return flagsCache || {};
}

export function isFeatureEnabled(featureId, user = null) {
  if (!flagsCache) {
    // Default open if not fetched yet
    return true;
  }

  const status = flagsCache[featureId];
  if (status === 'off') {
    return false;
  }
  if (status === 'beta') {
    // Enabled for admins or if beta query parameter is present
    if (typeof window !== 'undefined' && window.location.search.includes('beta=1')) {
      return true;
    }
    const role = user?.role || '';
    return ['admin', 'super_admin', 'editor', 'tester'].includes(role);
  }

  // Published is enabled for all users
  return true;
}

// Automatically initiate fetch in browser background
if (typeof window !== 'undefined') {
  loadFeatureFlags();
}
