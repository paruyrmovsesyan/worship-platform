import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { fetchMobileAppStatus } from '../utils/nativeCrashReporter.js';

const HEARTBEAT_INTERVAL_MS = 4_000;
const LIVE_STATUS_POLL_MS = 15_000;
const RESUME_RECHECK_MIN_MS = 3_000;
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
  const [reviewDismissed, setReviewDismissed] = useState(false);
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
      if (document.visibilityState === 'hidden' && !force) return;
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
      if (document.visibilityState !== 'hidden') {
        checkAppStatus(false);
      }
    };

    const handleResume = () => {
      restoreDocument();
      checkAppStatus(true);
    };

    const handleOnline = () => {
      checkAppStatus(true);
    };

    pingNativeHost();
    window.requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});
    });

    // Check remote mobile app status immediately and keep polling every 15s while active
    checkAppStatus(true);

    const heartbeat = window.setInterval(pingNativeHost, HEARTBEAT_INTERVAL_MS);
    const statusPoller = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        checkAppStatus(true);
      }
    }, LIVE_STATUS_POLL_MS);

    document.addEventListener('visibilitychange', restoreDocument);
    window.addEventListener('pageshow', restoreDocument);
    window.addEventListener('online', handleOnline);
    window.addEventListener('wp-native-resume', handleResume);

    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(statusPoller);
      document.removeEventListener('visibilitychange', restoreDocument);
      window.removeEventListener('pageshow', restoreDocument);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('wp-native-resume', handleResume);
    };
  }, []);

  const isMaintenance = Boolean(appStatus?.maintenance?.active) || appStatus?.status === 'maintenance';
  const isUnderReview = !isMaintenance && appStatus?.status === 'review';

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

  // 1. Maintenance Mode Full-Screen View (Worship Obsidian Liquid Glass)
  if (isMaintenance) {
    const platformLabel = platform === 'ios' ? 'iOS APP' : 'ANDROID APP';
    const endAtRaw = String(appStatus.maintenance?.end_at || '').trim();
    let endAtLabel = '';
    if (endAtRaw) {
      try {
        const d = new Date(endAtRaw);
        if (!Number.isNaN(d.getTime())) {
          endAtLabel = d.toLocaleString('hy-AM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
    }

    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={appStatus.maintenance?.title || 'Տեխնիկական դադար'}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background:
            'radial-gradient(circle at 50% 14%, rgba(239, 68, 68, 0.22) 0%, rgba(58, 45, 255, 0.16) 36%, #05050A 78%)',
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
            width: 'min(380px, 100%)',
            background: 'linear-gradient(165deg, rgba(24, 26, 42, 0.92) 0%, rgba(10, 11, 20, 0.97) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '28px',
            padding: '32px 24px 26px',
            boxShadow:
              'inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 28px 70px rgba(0, 0, 0, 0.68)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 18px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.34), rgba(58, 45, 255, 0.32))',
              border: '1px solid rgba(248, 113, 113, 0.42)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 14px 32px rgba(239, 68, 68, 0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fca5a5',
            }}
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', marginBottom: '14px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.16)', border: '1px solid rgba(248, 113, 113, 0.36)', color: '#fca5a5', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
            <span>WORSHIP PLATFORM · {platformLabel}</span>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {appStatus.maintenance?.title || 'Տեխնիկական դադար'}
          </h2>
          <p style={{ margin: '0 0 18px', color: 'rgba(226, 232, 240, 0.82)', fontSize: '0.94rem', lineHeight: 1.6 }}>
            {appStatus.maintenance?.message ||
              'Բջջային հավելվածը գտնվում է պլանային թարմացման և վերազինման փուլում։ Խնդրում ենք փորձել մի փոքր ուշ։'}
          </p>
          {endAtLabel && (
            <div style={{ marginBottom: '18px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.8rem', color: '#bae6fd', fontWeight: 600 }}>
              ⏱️ Նախատեսվող ավարտ՝ {endAtLabel}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRecheckStatus}
            disabled={rechecking}
            style={{
              width: '100%',
              minHeight: '46px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              background: 'linear-gradient(135deg, #3a2dff 0%, #00d4ff 100%)',
              color: '#ffffff',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: rechecking ? 'default' : 'pointer',
              opacity: rechecking ? 0.72 : 1,
              boxShadow: '0 10px 26px rgba(58, 45, 255, 0.35)',
            }}
          >
            {rechecking ? 'Ստուգվում է...' : 'Ստուգել կրկին'}
          </button>
          <div style={{ marginTop: '12px', fontSize: '0.74rem', color: 'rgba(148, 163, 184, 0.78)', fontWeight: 500 }}>
            Կարգավիճակն ավտոմատ թարմացվում է յուրաքանչյուր 15 վրկ
          </div>
        </div>
      </div>
    );
  }

  // 1b. Under Review Mode Floating Glass Notice (non-blocking for App Store / Play Store reviewers)
  if (isUnderReview && !reviewDismissed && !isForceUpdate) {
    return (
      <div
        role="status"
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          left: '14px',
          right: '14px',
          zIndex: 999990,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: 'min(420px, 100%)',
            background: 'linear-gradient(145deg, rgba(28, 24, 16, 0.94), rgba(14, 13, 18, 0.96))',
            border: '1px solid rgba(251, 191, 36, 0.42)',
            borderRadius: '18px',
            padding: '12px 14px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🟡</span>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fde68a' }}>
              Ստուգման փուլ (Under Review)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'rgba(226, 232, 240, 0.8)', marginTop: '2px' }}>
              Հավելվածի նոր տարբերակը գտնվում է խանութի ստուգման փուլում։
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReviewDismissed(true)}
            aria-label="Փակել"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#fff',
              borderRadius: '10px',
              width: '30px',
              height: '30px',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
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
