import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { fetchMobileAppStatus } from '../utils/nativeCrashReporter.js';

const HEARTBEAT_INTERVAL_MS = 4_000;
const RESUME_RECHECK_MIN_MS = 5 * 60 * 1000;
const UPDATE_DISMISS_TTL_MS = 6 * 60 * 60 * 1000;
const UPDATE_DISMISS_STORAGE_KEY = 'wp_native_update_dismissed_v1';

function isUpdateDismissed(updateKey) {
  if (!updateKey) return false;
  try {
    const raw = localStorage.getItem(UPDATE_DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.key !== updateKey) return false;
    return Date.now() - Number(parsed.at || 0) < UPDATE_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function saveUpdateDismissed(updateKey) {
  if (!updateKey) return;
  try {
    localStorage.setItem(UPDATE_DISMISS_STORAGE_KEY, JSON.stringify({ key: updateKey, at: Date.now() }));
  } catch {}
}

export default function NativeRuntimeGuard() {
  const [appStatus, setAppStatus] = useState(null);
  const [rechecking, setRechecking] = useState(false);
  const [dismissedUpdateKey, setDismissedUpdateKey] = useState('');
  const lastStatusFetchRef = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const pingNativeHost = () => {
      try {
        window.webkit?.messageHandlers?.nativeRuntime?.postMessage('heartbeat');
      } catch {
        // Ignore bridge unavailability on Android or web fallback
      }
    };

    const checkAppStatus = (force = false) => {
      const now = Date.now();
      if (!force && now - lastStatusFetchRef.current < RESUME_RECHECK_MIN_MS) return;
      lastStatusFetchRef.current = now;
      fetchMobileAppStatus().then((status) => {
        if (status) {
          setAppStatus(status);
        }
      });
    };

    const restoreDocument = () => {
      document.documentElement.style.removeProperty('opacity');
      document.body.style.removeProperty('opacity');
      document.body.style.removeProperty('pointer-events');
      window.getSelection?.()?.removeAllRanges?.();
      pingNativeHost();
    };

    const handleResume = () => {
      restoreDocument();
      checkAppStatus(false);
    };

    pingNativeHost();
    window.requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});
    });

    // Check remote mobile app status (maintenance, force/optional update, announcement)
    checkAppStatus(true);

    const heartbeat = window.setInterval(pingNativeHost, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', restoreDocument);
    window.addEventListener('pageshow', restoreDocument);
    window.addEventListener('wp-native-resume', handleResume);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', restoreDocument);
      window.removeEventListener('pageshow', restoreDocument);
      window.removeEventListener('wp-native-resume', handleResume);
    };
  }, []);

  const isMaintenance = Boolean(appStatus?.maintenance?.active);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isMaintenance) return undefined;

    const timer = window.setInterval(() => {
      fetchMobileAppStatus().then((status) => {
        if (status) setAppStatus(status);
      });
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [isMaintenance]);

  const handleRecheckStatus = async () => {
    if (rechecking) return;
    setRechecking(true);
    try {
      const status = await fetchMobileAppStatus();
      if (status) setAppStatus(status);
    } finally {
      setRechecking(false);
    }
  };

  if (!appStatus) return null;

  const isForceUpdate = Boolean(appStatus.version?.force_update);
  const needsUpdate = Boolean(appStatus.version?.needs_update);
  const platform = Capacitor.getPlatform();
  const targetVersion = String(appStatus.version?.current || '').trim();
  const targetBuild = appStatus.version?.current_build ? String(appStatus.version.current_build) : '';
  const clientVersion = String(appStatus.version?.client_version || '').trim();
  const clientBuild = appStatus.version?.client_build ? String(appStatus.version.client_build) : '';
  const updateKey = targetVersion ? `${platform}_${targetVersion}_${targetBuild}` : '';

  const openUpdateUrl = (url) => {
    const target = url || 'https://worship.pmstudio.am';
    Browser.open({ url: target }).catch(() => {
      window.open(target, '_blank', 'noopener,noreferrer');
    });
  };

  // 1. Maintenance Mode Full-Screen View (Worship obsidian Liquid Glass)
  if (isMaintenance) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={appStatus.maintenance?.title || 'Վերազինման աշխատանքներ'}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background:
            'radial-gradient(circle at 50% 18%, rgba(0, 212, 255, 0.16) 0%, rgba(58, 45, 255, 0.12) 34%, #05050A 75%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'max(24px, env(safe-area-inset-top, 24px)) 20px max(24px, env(safe-area-inset-bottom, 24px))',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div
          style={{
            width: 'min(368px, 100%)',
            background: 'linear-gradient(160deg, rgba(24, 26, 40, 0.9) 0%, rgba(12, 13, 22, 0.96) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '26px',
            padding: '30px 24px 26px',
            boxShadow:
              'inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 24px 60px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(26px) saturate(180%)',
            WebkitBackdropFilter: 'blur(26px) saturate(180%)',
          }}
        >
          <div
            style={{
              width: '62px',
              height: '62px',
              margin: '0 auto 18px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(58, 45, 255, 0.35), rgba(0, 212, 255, 0.25))',
              border: '1px solid rgba(0, 212, 255, 0.36)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 12px 28px rgba(0, 212, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7ee8ff',
            }}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 11px',
              marginBottom: '12px',
              borderRadius: '999px',
              background: 'rgba(0, 212, 255, 0.14)',
              border: '1px solid rgba(0, 212, 255, 0.32)',
              color: '#7ee8ff',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            WORSHIP PLATFORM
          </span>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {appStatus.maintenance?.title || 'Վերազինման աշխատանքներ'}
          </h2>
          <p style={{ margin: '0 0 22px', color: 'rgba(226, 232, 240, 0.78)', fontSize: '0.92rem', lineHeight: 1.55 }}>
            {appStatus.maintenance?.message ||
              'Կայքը և բջջային հավելվածը ժամանակավորապես անհասանելի են՝ տեխնիկական վերազինման և բարելավման նպատակներով։ Շուտով կվերադառնանք։'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRecheckStatus}
            disabled={rechecking}
            style={{
              width: '100%',
              minHeight: '44px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              background: 'linear-gradient(135deg, #3a2dff 0%, #00d4ff 100%)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: rechecking ? 'default' : 'pointer',
              opacity: rechecking ? 0.72 : 1,
            }}
          >
            {rechecking ? 'Ստուգվում է...' : 'Ստուգել կրկին'}
          </button>
        </div>
      </div>
    );
  }

  // 2. Force Update or Recommended Update Modal (Android & iOS)
  const showOptionalUpdate = needsUpdate && !isForceUpdate && updateKey !== dismissedUpdateKey && !isUpdateDismissed(updateKey);

  if (isForceUpdate || showOptionalUpdate) {
    const isAndroid = platform === 'android';
    const primaryUrl = isAndroid
      ? (appStatus.version?.apk_url || appStatus.version?.store_url || 'https://worship.pmstudio.am/worship-platform.apk')
      : (appStatus.version?.store_url || 'https://apps.apple.com/us/search?term=Worship%20Platform');
    const secondaryStoreUrl = isAndroid && appStatus.version?.apk_url && appStatus.version?.store_url && appStatus.version.store_url !== appStatus.version.apk_url
      ? appStatus.version.store_url
      : null;

    const versionBadgeText = (() => {
      if (!targetVersion) return '';
      if (clientVersion && clientVersion !== targetVersion) {
        return `v${clientVersion}  →  v${targetVersion}`;
      }
      if (clientBuild && targetBuild && clientBuild !== targetBuild) {
        return `v${targetVersion} (Build ${clientBuild} → ${targetBuild})`;
      }
      return `v${targetVersion}`;
    })();

    const defaultTitle = isForceUpdate ? 'Պարտադիր թարմացում' : 'Հասանելի է նոր տարբերակ';
    const defaultMessage = isAndroid
      ? (isForceUpdate
          ? 'Ձեր Android հավելվածի տարբերակը հնացել է։ Խնդրում ենք թարմացնել Worship Platform-ը՝ շարունակելու համար։'
          : 'Հասանելի է Worship Platform-ի նոր տարբերակը Android-ի համար՝ նոր հնարավորություններով և բարելավումներով։')
      : (isForceUpdate
          ? 'Ձեր iOS հավելվածի տարբերակը հնացել է։ Խնդրում ենք թարմացնել Worship Platform-ը App Store-ից՝ շարունակելու համար։'
          : 'Հասանելի է Worship Platform-ի նոր տարբերակը App Store-ում՝ նոր հնարավորություններով և բարելավումներով։');

    const handleDismiss = () => {
      if (isForceUpdate) return;
      saveUpdateDismissed(updateKey);
      setDismissedUpdateKey(updateKey);
    };

    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={appStatus.version?.update_title || defaultTitle}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: isForceUpdate ? 'rgba(5, 5, 10, 0.88)' : 'rgba(5, 5, 10, 0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'max(20px, env(safe-area-inset-top, 20px)) 20px max(20px, env(safe-area-inset-bottom, 20px))',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(24, 26, 40, 0.96) 0%, rgba(12, 13, 22, 0.99) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '26px',
            padding: '28px 24px 24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            color: '#fff',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 25px 60px rgba(0, 0, 0, 0.72)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 14px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(58, 45, 255, 0.35), rgba(0, 212, 255, 0.25))',
              border: '1px solid rgba(0, 212, 255, 0.36)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 12px 28px rgba(0, 212, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7ee8ff',
            }}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          {versionBadgeText ? (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                marginBottom: '12px',
                borderRadius: '999px',
                background: 'rgba(0, 212, 255, 0.14)',
                border: '1px solid rgba(0, 212, 255, 0.32)',
                color: '#7ee8ff',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {versionBadgeText}
            </span>
          ) : null}
          <h3 style={{ margin: '0 0 8px', fontSize: '1.22rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {appStatus.version?.update_title || defaultTitle}
          </h3>
          <p style={{ margin: '0 0 22px', color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.9rem', lineHeight: 1.55 }}>
            {appStatus.version?.update_message || defaultMessage}
          </p>
          <button
            type="button"
            onClick={() => openUpdateUrl(primaryUrl)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: '46px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              background: 'linear-gradient(135deg, #3a2dff 0%, #00d4ff 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxSizing: 'border-box',
              boxShadow: '0 10px 24px rgba(0, 212, 255, 0.25)',
            }}
          >
            {isAndroid ? 'Թարմացնել Հիմա' : 'Թարմացնել App Store-ից'}
          </button>
          {secondaryStoreUrl ? (
            <button
              type="button"
              onClick={() => openUpdateUrl(secondaryStoreUrl)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: '42px',
                marginTop: '10px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Բացել Google Play-ում
            </button>
          ) : null}
          {!isForceUpdate ? (
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: '40px',
                marginTop: '10px',
                borderRadius: '999px',
                border: 'none',
                background: 'transparent',
                color: 'rgba(165, 172, 192, 0.85)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Ավելի ուշ
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
