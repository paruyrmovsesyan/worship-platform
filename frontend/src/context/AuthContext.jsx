import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const getUserId = (user) => {
  const value = user?.id ?? user?.user_id;
  return /^\d+$/.test(String(value || '')) ? String(value) : '';
};

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem('worship_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.id || parsed.user_id)) {
      return {
        ...parsed,
        id: Number(parsed.id || parsed.user_id),
      };
    }
  } catch (_) {}
  return null;
};

const getServiceWorkerTarget = async () => {
  if (!('serviceWorker' in navigator)) return null;
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;
  const registration = await Promise.race([
    navigator.serviceWorker.ready.catch(() => null),
    new Promise((resolve) => window.setTimeout(() => resolve(null), 500)),
  ]);
  return registration?.active || null;
};

const setUserCacheScope = async (userId) => {
  if (!userId) return;
  const target = await getServiceWorkerTarget();
  target?.postMessage({ type: 'SET_USER_CACHE_SCOPE', userId });
};

const clearUserCacheScope = async (userId) => {
  if (!userId || typeof MessageChannel === 'undefined') return;
  const target = await getServiceWorkerTarget();
  if (!target) return;

  await new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(resolve, 900);
    channel.port1.onmessage = () => {
      window.clearTimeout(timer);
      resolve();
    };
    target.postMessage({ type: 'CLEAR_USER_CACHE', userId }, [channel.port2]);
  });
};

export const AuthProvider = ({ children }) => {
  // Hydrate immediately from localStorage so PWA & Web users never experience a logged-out flash on startup
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(() => !readCachedUser());
  const retryTimerRef = useRef(null);

  const checkAuth = useCallback(async (retryCount = 0) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const scheduleRetry = () => {
      if (retryCount < 3) {
        const delayMs = retryCount === 0 ? 1000 : retryCount === 1 ? 2200 : 4000;
        retryTimerRef.current = setTimeout(() => {
          checkAuth(retryCount + 1);
        }, delayMs);
      }
    };

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const socialToken = urlParams.get('social_login_token');
      if (socialToken) {
        try {
          const claimRes = await fetch('/social_auth.php?action=claim_token', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: socialToken }),
          });
          const claimData = await claimRes.json();
          if (claimData.ok) {
            const newUrl =
              window.location.pathname +
              window.location.search
                .replace(new RegExp(`([?&])social_login_token=${socialToken}(&|$)`), '$1')
                .replace(/[?&]$/, '') +
              window.location.hash;
            window.history.replaceState(null, '', newUrl);
          }
        } catch (e) {
          console.error('Failed to claim social token', e);
        }
      }

      const res = await fetch('/auth_me.php', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        // Server busy (e.g. 503 during startup burst) — preserve cached user and retry automatically
        scheduleRetry();
        return readCachedUser();
      }

      const data = await res.json();
      if (data && data.loggedIn && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('worship_user', JSON.stringify(data.user));
        } catch (_) {}
        return data.user;
      }

      if (data && data.dbUnavailable) {
        // Temporary DB connection saturation while restoring remember_me — keep cached user & retry
        scheduleRetry();
        return readCachedUser();
      }

      setUser(null);
      try {
        localStorage.removeItem('worship_user');
      } catch (_) {}
      return null;
    } catch (err) {
      // Network or parse error — do NOT clear user; keep existing/cached state and retry
      console.error('Auth check failed (network)', err);
      scheduleRetry();
      return readCachedUser();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth(0);
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [checkAuth]);

  // Listen for auth state synced by pwa-init.js, cross-tab storage, or app resume
  useEffect(() => {
    const handleAuthSynced = (event) => {
      const detailUser = event?.detail || readCachedUser();
      if (detailUser && (detailUser.id || detailUser.user_id)) {
        const normalized = {
          ...detailUser,
          id: Number(detailUser.id || detailUser.user_id),
        };
        setUser((prev) => (prev && Number(prev.id) === normalized.id ? prev : normalized));
        setLoading(false);
      }
    };

    const handleStorage = (event) => {
      if (event.key === 'worship_user') {
        if (event.newValue) {
          const parsed = readCachedUser();
          if (parsed) setUser(parsed);
        } else {
          setUser(null);
        }
      }
    };

    const handleVisibilityOrShow = () => {
      if (document.visibilityState === 'visible') {
        const cached = readCachedUser();
        if (cached) {
          setUser((prev) => prev || cached);
        }
        checkAuth(0);
      }
    };

    window.addEventListener('wp-auth-synced', handleAuthSynced);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('pageshow', handleVisibilityOrShow);
    document.addEventListener('visibilitychange', handleVisibilityOrShow);

    return () => {
      window.removeEventListener('wp-auth-synced', handleAuthSynced);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', handleVisibilityOrShow);
      document.removeEventListener('visibilitychange', handleVisibilityOrShow);
    };
  }, [checkAuth]);

  useEffect(() => {
    const userId = getUserId(user);
    if (!userId || !('serviceWorker' in navigator)) return undefined;

    const syncScope = () => setUserCacheScope(userId).catch(() => {});
    syncScope();
    navigator.serviceWorker.addEventListener('controllerchange', syncScope);

    return () => navigator.serviceWorker.removeEventListener('controllerchange', syncScope);
  }, [user]);

  // Global automatic Push Subscription Sync
  useEffect(() => {
    if (!user || !('Notification' in window) || !window.Notification || window.Notification.permission !== 'granted') {
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;
    let attempts = 0;

    const syncPushForLoggedInUser = () => {
      if (cancelled) {
        return;
      }

      const manager = window.WPPushManager;
      if (!manager || typeof manager.getStatus !== 'function' || typeof manager.registerSubscription !== 'function') {
        if (attempts < 8) {
          attempts += 1;
          retryTimer = setTimeout(syncPushForLoggedInUser, 900);
        }
        return;
      }

      manager
        .getStatus()
        .then((status) => {
          if (!status || status.userDisabled || status.accountDisabled || status.adminRemoved) {
            return;
          }
          return manager.registerSubscription(true);
        })
        .catch((err) => console.error('Auto push sync failed', err));
    };

    retryTimer = setTimeout(syncPushForLoggedInUser, 900);
    window.addEventListener('wp-push-manager-ready', syncPushForLoggedInUser);

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      window.removeEventListener('wp-push-manager-ready', syncPushForLoggedInUser);
    };
  }, [user]);

  const login = () => {
    var url = '/login?next=/';
    if (window.WP && typeof window.WP.navigate === 'function') {
      window.WP.navigate(url, { loaderDelay: 50, navigationDelay: 70 });
    } else {
      window.location.href = url;
    }
  };

  const logout = async () => {
    await clearUserCacheScope(getUserId(user)).catch(() => {});
    try {
      localStorage.removeItem('worship_user');
      localStorage.removeItem('wp_user_favorites_cache');
    } catch (_) {}
    try {
      await fetch('/logout_users.php?silent=1', { credentials: 'include', cache: 'no-store' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    window.location.href = '/login?logged_out=1';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, checkAuth, refetchUser: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
