import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '../context/AuthContext';

const DEVICE_ID_KEY = 'wp_native_device_id_v1';
const UPDATE_CHECK_KEY = 'wp_native_update_check_v1';

function versionParts(value) {
  return String(value || '0').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function isNewerVersion(candidate, current) {
  const left = versionParts(candidate);
  const right = versionParts(current);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if ((left[index] || 0) > (right[index] || 0)) return true;
    if ((left[index] || 0) < (right[index] || 0)) return false;
  }
  return false;
}

function notificationPath(data = {}) {
  const candidate = data.path || data.url || data.route || data.deepLink || '';
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate, 'https://worship.pmstudio.am');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return String(candidate).startsWith('/') ? String(candidate) : '';
  }
}

function isNativePrimaryTab(pathname) {
  return pathname === '/' ||
    pathname === '/songs' ||
    pathname === '/chats' ||
    pathname === '/profile' ||
    pathname === '/login';
}

async function nativeDeviceId() {
  const existing = await Preferences.get({ key: DEVICE_ID_KEY });
  if (existing.value) return existing.value;
  const value = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await Preferences.set({ key: DEVICE_ID_KEY, value });
  return value;
}

async function registerPushToken(token, userId) {
  if (!token) return;
  const deviceId = await nativeDeviceId();
  await fetch('/native_push_api.php?action=register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      device_id: deviceId,
      platform: Capacitor.getPlatform(),
      user_id: userId || null,
    }),
  }).catch(() => {});
}

export default function NativePlatformServices() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [update, setUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const checkAuthRef = useRef(checkAuth);
  checkAuthRef.current = checkAuth;

  const userRef = useRef(user);
  userRef.current = user;

  const pushTokenRef = useRef(null);

  // Sync push token with current user ID when user changes
  useEffect(() => {
    if (pushTokenRef.current) {
      registerPushToken(pushTokenRef.current, user?.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const handles = [];
    let cancelled = false;
    let queuedNavigationPath = '';

    const performNativeNavigation = (path) => {
      if (!path || cancelled) return;
      const now = Date.now();
      const lastNavigation = window.__wpLastNativeExternalNavigation;
      // Some iOS lifecycle paths can deliver the same appUrlOpen event twice.
      // A duplicated React navigation while a body portal is mounting can make
      // WebKit throw NotFoundError and leave only the black host view visible.
      if (lastNavigation?.path === path && now - lastNavigation.at < 1200) return;
      window.__wpLastNativeExternalNavigation = { path, at: now };

      if (window.__wpNativeTransitionInFlight) {
        queuedNavigationPath = path;
        return;
      }
      navigateRef.current(path);
    };

    const flushQueuedNavigation = () => {
      if (!queuedNavigationPath || cancelled) return;
      const path = queuedNavigationPath;
      queuedNavigationPath = '';
      navigateRef.current(path);
    };

    window.addEventListener('wp-native-transition-idle', flushQueuedNavigation);

    const addHandle = async (promise) => {
      const handle = await promise;
      if (cancelled) handle?.remove?.();
      else handles.push(handle);
    };

    addHandle(CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const path = notificationPath({ url });
      performNativeNavigation(path);
    }));

    addHandle(CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      checkAuthRef.current?.().catch?.(() => {});
      window.dispatchEvent(new CustomEvent('wp-native-resume'));
    }));

    if (Capacitor.getPlatform() === 'android') {
      addHandle(CapacitorApp.addListener('backButton', () => {
        // 1. Let full-screen native calls consume Back first
        if (document.querySelector('.native-call-screen')) {
          window.dispatchEvent(new CustomEvent('wp-native-back-request'));
          return;
        }

        // 2. If any modal, drawer, or sheet is open, dismiss it first!
        const openModal = document.querySelector(
          '.sla-modal-overlay, .sv-modal-overlay, .modal-backdrop, .modal-overlay, .profile-lang-modal, .drawer-overlay, [data-modal-open="true"]'
        );
        if (openModal) {
          const closeBtn = openModal.querySelector(
            '.sla-modal-close, .modal-close, .close-btn, [data-action="close"], [aria-label="Close"], [aria-label="Փակել"], .btn-close'
          );
          if (closeBtn) {
            closeBtn.click();
          } else {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          return;
        }

        const pathname = window.location.pathname;
        // 3. Minimize app when back is pressed on primary root tab
        if (isNativePrimaryTab(pathname)) {
          CapacitorApp.minimizeApp().catch(() => {});
          return;
        }

        // 4. On subpage, prefer clicking in-page back button so custom back handlers run
        if (pathname !== '/') {
          const inPageBackBtn = document.querySelector(
            '[data-native-route-back="true"], .chat-btn-back, .sla-back-btn, .sle-back-btn, .notif-back-btn, .song-request-back-btn, .user-profile-back-btn'
          );
          if (inPageBackBtn) {
            inPageBackBtn.click();
            return;
          }
          window.dispatchEvent(new CustomEvent('wp-native-page-back'));
          return;
        }

        CapacitorApp.minimizeApp().catch(() => {});
      }));
    }

    addHandle(Network.addListener('networkStatusChange', (status) => {
      setIsConnected(status.connected);
      window.dispatchEvent(new CustomEvent('wp-native-network-change', { detail: status }));
      if (status.connected) window.dispatchEvent(new CustomEvent('wp-native-resume'));
    }));
    Network.getStatus().then((status) => setIsConnected(status.connected)).catch(() => {});

    const configurePush = async () => {
      let permission = await PushNotifications.checkPermissions().catch(() => ({ receive: 'denied' }));
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions().catch(() => ({ receive: 'denied' }));
      }
      if (permission.receive !== 'granted') return;

      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'worship-default',
          name: 'Worship Platform',
          description: 'Հաղորդագրություններ և կարևոր թարմացումներ',
          importance: 4,
          visibility: 1,
          vibration: true,
        }).catch(() => {});
      }

      addHandle(PushNotifications.addListener('registration', ({ value }) => {
        pushTokenRef.current = value;
        registerPushToken(value, userRef.current?.id);
      }));
      addHandle(PushNotifications.addListener('registrationError', (error) => {
        // Helpful warning without crash
        console.warn('[NativePush] APNs / FCM registration info:', error?.error || error);
      }));
      addHandle(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const path = notificationPath(notification?.data || {});
        performNativeNavigation(path);
      }));
      addHandle(PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        if (Capacitor.getPlatform() === 'android') return;
        // The in-app call screen owns the foreground ringtone. Scheduling a
        // second local notification here makes two call sounds overlap.
        if (notification?.data?.type === 'call') {
          window.dispatchEvent(new CustomEvent('wp-native-resume'));
          return;
        }
        const localPermission = await LocalNotifications.checkPermissions().catch(() => ({ display: 'denied' }));
        if (localPermission.display !== 'granted') return;
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Date.now() % 2147483647),
            title: notification.title || 'Worship Platform',
            body: notification.body || '',
            extra: notification.data || {},
            schedule: { at: new Date(Date.now() + 250) },
          }],
        }).catch(() => {});
      }));
      addHandle(LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
        const path = notificationPath(notification?.extra || {});
        performNativeNavigation(path);
      }));

      await PushNotifications.register().catch(() => {});
    };

    configurePush().catch(() => {});

    const checkForUpdate = async () => {
      try {
        const appInfo = await CapacitorApp.getInfo();
        const previous = await Preferences.get({ key: UPDATE_CHECK_KEY });
        const lastCheck = Number(previous.value || 0);
        if (Date.now() - lastCheck < 6 * 60 * 60 * 1000) return;
        await Preferences.set({ key: UPDATE_CHECK_KEY, value: String(Date.now()) });

        const response = await fetch('/native_version.json', { cache: 'no-store' });
        if (!response.ok) return;
        const manifest = await response.json();
        const platformConfig = manifest?.[Capacitor.getPlatform()] || {};
        const latest = platformConfig.version;
        if (latest && isNewerVersion(latest, appInfo.version)) {
          setUpdate({ current: appInfo.version, latest, storeUrl: platformConfig.storeUrl || '' });
        }
      } catch {}
    };

    checkForUpdate();

    return () => {
      cancelled = true;
      window.removeEventListener('wp-native-transition-idle', flushQueuedNavigation);
      handles.splice(0).forEach((handle) => handle?.remove?.());
    };
  }, []);

  const openStore = () => {
    const url = update.storeUrl || (Capacitor.getPlatform() === 'android'
      ? 'https://play.google.com/store/apps/details?id=am.pmstudio.worship'
      : 'https://apps.apple.com/us/search?term=Worship%20Platform');
    Browser.open({ url }).catch(() => {});
  };

  return (
    <>
      {!isConnected ? (
        <div role="status" style={{ position: 'fixed', top: 'calc(8px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 2147482001, padding: '8px 14px', borderRadius: '999px', background: '#f59e0b', color: '#17120a', fontWeight: 700 }}>
          Offline ռեժիմ · ցուցադրվում են պահված տվյալները
        </div>
      ) : null}
      {update ? (
        <aside
          role="status"
          style={{
            position: 'fixed',
            left: '16px',
            right: '16px',
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            zIndex: 2147482001,
            padding: '14px',
            borderRadius: '18px',
            background: 'rgba(20,22,34,.96)',
            border: '1px solid rgba(255,255,255,.14)',
            boxShadow: '0 20px 50px rgba(0,0,0,.45)',
            color: '#fff',
          }}
        >
          <strong>Հասանելի է նոր տարբերակ՝ {update.latest}</strong>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={() => setUpdate(null)}>Հետո</button>
            <button type="button" onClick={openStore}>Թարմացնել</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
