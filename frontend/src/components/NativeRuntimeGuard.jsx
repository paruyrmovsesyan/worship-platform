import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { fetchMobileAppStatus } from '../utils/nativeCrashReporter.js';

const HEARTBEAT_INTERVAL_MS = 4_000;

export default function NativeRuntimeGuard() {
  const [appStatus, setAppStatus] = useState(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const pingNativeHost = () => {
      try {
        window.webkit?.messageHandlers?.nativeRuntime?.postMessage('heartbeat');
      } catch (_) {}
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

  if (!appStatus) return null;

  const isMaintenance = Boolean(appStatus.maintenance?.active);
  const isForceUpdate = Boolean(appStatus.version?.force_update);
  const announcement = appStatus.announcement;

  // 1. Maintenance Mode Full-Screen View
  if (isMaintenance) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#05050A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛠️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
          {appStatus.maintenance?.title || 'Տեխնիկական դադար'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '320px', lineHeight: 1.5 }}>
          {appStatus.maintenance?.message || 'Հավելվածը գտնվում է պլանային թարմացման փուլում: Խնդրում ենք փորձել մի փոքր ուշ:'}
        </p>
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
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            background: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '28px 24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            color: '#fff',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🚀</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
            {appStatus.version?.update_title || 'Հասանելի է նոր տարբերակ'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '22px', lineHeight: 1.45 }}>
            {appStatus.version?.update_message || 'Խնդրում ենք թարմացնել հավելվածը՝ շարունակելու համար:'}
          </p>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.98rem',
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

  // 3. In-App Announcement Top Banner
  if (announcement && !announcementDismissed) {
    const typeBg =
      announcement.type === 'critical'
        ? 'rgba(239, 68, 68, 0.95)'
        : announcement.type === 'warning'
        ? 'rgba(217, 119, 6, 0.95)'
        : announcement.type === 'success'
        ? 'rgba(22, 163, 74, 0.95)'
        : 'rgba(2, 132, 199, 0.95)';

    return (
      <div
        style={{
          position: 'fixed',
          top: 'max(10px, env(safe-area-inset-top, 10px))',
          left: '12px',
          right: '12px',
          zIndex: 99990,
          background: typeBg,
          color: '#fff',
          borderRadius: '16px',
          padding: '12px 16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.86rem',
        }}
      >
        <div style={{ flex: 1 }}>
          {announcement.title && <div style={{ fontWeight: 800, marginBottom: '2px' }}>{announcement.title}</div>}
          <div style={{ opacity: 0.95, lineHeight: 1.35 }}>{announcement.message}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {announcement.action_text && announcement.action_url && (
            <a
              href={announcement.action_url}
              style={{
                background: '#fff',
                color: '#0f172a',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                textDecoration: 'none',
              }}
            >
              {announcement.action_text}
            </a>
          )}
          {announcement.dismissible && (
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: 'none',
                color: '#fff',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
