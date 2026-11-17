import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { fetchMobileAppStatus } from '../utils/nativeCrashReporter.js';

const HEARTBEAT_INTERVAL_MS = 4_000;

export default function NativeRuntimeGuard() {
  const [appStatus, setAppStatus] = useState(null);
  const [rechecking, setRechecking] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const pingNativeHost = () => {
      try {
        window.webkit?.messageHandlers?.nativeRuntime?.postMessage('heartbeat');
      } catch {
        // Ignore bridge unavailability on Android or web fallback
      }
    };

    const restoreDocument = () => {
      document.documentElement.style.removeProperty('opacity');
      document.body.style.removeProperty('opacity');
      document.body.style.removeProperty('pointer-events');
      window.getSelection?.()?.removeAllRanges?.();
      pingNativeHost();
    };

    pingNativeHost();
    window.requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 180 }).catch(() => {});
    });

    // Check remote mobile app status (maintenance, force update, announcement)
    fetchMobileAppStatus().then((status) => {
      if (status) {
        setAppStatus(status);
      }
    });

    const heartbeat = window.setInterval(pingNativeHost, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', restoreDocument);
    window.addEventListener('pageshow', restoreDocument);
    window.addEventListener('wp-native-resume', restoreDocument);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', restoreDocument);
      window.removeEventListener('pageshow', restoreDocument);
      window.removeEventListener('wp-native-resume', restoreDocument);
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

  // 2. Force Update Modal
  if (isForceUpdate) {
    const storeUrl = appStatus.version?.store_url || appStatus.version?.apk_url || 'https://worship.pmstudio.am';
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(5, 5, 10, 0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(160deg, rgba(24, 26, 40, 0.94) 0%, rgba(12, 13, 22, 0.98) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '26px',
            padding: '28px 24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            color: '#fff',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 25px 60px rgba(0, 0, 0, 0.72)',
          }}
        >
          <div style={{ fontSize: '2.8rem', marginBottom: '14px' }}>🚀</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
            {appStatus.version?.update_title || 'Հասանելի է նոր տարբերակ'}
          </h3>
          <p style={{ color: 'rgba(226, 232, 240, 0.78)', fontSize: '0.9rem', marginBottom: '22px', lineHeight: 1.5 }}>
            {appStatus.version?.update_message || 'Խնդրում ենք թարմացնել հավելվածը՝ շարունակելու համար:'}
          </p>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: '44px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #3a2dff 0%, #00d4ff 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Թարմացնել Հիմա
          </a>
        </div>
      </div>
    );
  }

  return null;
}
