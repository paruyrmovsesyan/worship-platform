import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const getUserId = (user) => {
  const value = user?.id ?? user?.user_id;
  return /^\d+$/.test(String(value || '')) ? String(value) : '';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const socialToken = urlParams.get('social_login_token');
      if (socialToken) {
        try {
          const claimRes = await fetch('/social_auth.php?action=claim_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: socialToken }),
          });
          const claimData = await claimRes.json();
          if (claimData.ok) {
            const newUrl = window.location.pathname + window.location.search.replace(new RegExp(`([?&])social_login_token=${socialToken}(&|$)`), '$1').replace(/[?&]$/, '') + window.location.hash;
            window.history.replaceState(null, '', newUrl);
          }
        } catch (e) {
          console.error('Failed to claim social token', e);
        }
      }

      const res = await fetch('/auth_me.php');
      const data = await res.json();
      if (data && data.loggedIn) {
        setUser(data.user);
        return data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      // Network error — do NOT clear user; keep existing state to avoid false logouts
      console.error('Auth check failed (network)', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
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
    if (!user || !window.Notification || Notification.permission !== 'granted') {
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

      manager.getStatus()
        .then(status => {
          if (!status || status.userDisabled || status.accountDisabled || status.adminRemoved) {
            return;
          }
          return manager.registerSubscription(true);
        })
        .catch(err => console.error('Auto push sync failed', err));
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
      await fetch('/logout_users.php?silent=1');
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
