import { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    fetch('/auth_me.php')
      .then(res => res.json())
      .then(data => {
        if (data && data.loggedIn) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Auth check failed', err);
        setUser(null);
        setLoading(false);
      });
  }, []);

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
    var url = '/logout_users.php?next=/';
    if (window.WP && typeof window.WP.navigate === 'function') {
      window.WP.navigate(url, { loaderDelay: 50, navigationDelay: 70 });
    } else {
      window.location.href = url;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
