import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

const BANNER_ACCENTS = {
  critical: { border: 'rgba(255, 69, 58, 0.5)', badge: 'rgba(255, 69, 58, 0.2)', tint: '#ff6961' },
  warning: { border: 'rgba(247, 181, 0, 0.5)', badge: 'rgba(247, 181, 0, 0.2)', tint: '#f7b500' },
  success: { border: 'rgba(16, 185, 129, 0.48)', badge: 'rgba(16, 185, 129, 0.2)', tint: '#34d399' },
  info: { border: 'rgba(0, 212, 255, 0.45)', badge: 'rgba(0, 212, 255, 0.16)', tint: '#7ee8ff' },
};

/**
 * Top announcement banner rendered for Website and PWA (NativeRuntimeGuard handles native banner).
 */
export function PlatformAnnouncementBanner({ announcement, dismissed, onDismiss, navigate, isPWA }) {
  if (Capacitor.isNativePlatform() || !announcement || dismissed) {
    return null;
  }

  const palette = BANNER_ACCENTS[announcement.type] || BANNER_ACCENTS.info;
  const actionUrl = String(announcement.action_url || '').trim();
  const isInternal = actionUrl.startsWith('/');

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: isPWA ? 'max(10px, env(safe-area-inset-top, 10px))' : '74px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(760px, calc(100vw - 24px))',
        zIndex: 99980,
        background: 'linear-gradient(160deg, rgba(18, 20, 32, 0.94) 0%, rgba(11, 12, 20, 0.97) 100%)',
        border: `1px solid ${palette.border}`,
        color: '#ffffff',
        borderRadius: '18px',
        padding: '12px 16px',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 16px 38px rgba(0, 0, 0, 0.42)',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '0.86rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: palette.tint,
          boxShadow: `0 0 10px ${palette.tint}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {announcement.title && (
          <div style={{ fontWeight: 800, marginBottom: '2px', color: palette.tint }}>{announcement.title}</div>
        )}
        <div style={{ color: 'rgba(241, 245, 249, 0.92)', lineHeight: 1.4 }}>{announcement.message}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {announcement.action_text && actionUrl && (
          isInternal && navigate ? (
            <button
              type="button"
              onClick={() => navigate(actionUrl)}
              style={{
                background: palette.badge,
                border: `1px solid ${palette.border}`,
                color: '#ffffff',
                padding: '7px 13px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {announcement.action_text}
            </button>
          ) : (
            <a
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: palette.badge,
                border: `1px solid ${palette.border}`,
                color: '#ffffff',
                padding: '7px 13px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.78rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {announcement.action_text}
            </a>
          )
        )}
        {announcement.dismissible !== false && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Փակել հայտարարությունը"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Full-page lock card rendered when a user navigates to a page restricted by the active announcement.
 */
export function AnnouncementRestrictedView({ announcement, onBackHome, onRecheck }) {
  const [checking, setChecking] = useState(false);

  const handleRecheck = async () => {
    if (checking || !onRecheck) return;
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 110px',
      }}
    >
      <div
        style={{
          width: 'min(440px, 100%)',
          background: 'linear-gradient(160deg, rgba(22, 24, 38, 0.92) 0%, rgba(12, 13, 22, 0.96) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.28)',
          borderRadius: '24px',
          padding: '28px 24px',
          textAlign: 'center',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 24px 56px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(58, 45, 255, 0.34), rgba(0, 212, 255, 0.24))',
            border: '1px solid rgba(0, 212, 255, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7ee8ff',
          }}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800 }}>
          {announcement?.title || 'Բաժինը ժամանակավորապես սահմանափակված է'}
        </h2>
        <p style={{ margin: '0 0 22px', color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.94rem', lineHeight: 1.55 }}>
          {announcement?.message || 'Այս բաժինը ժամանակավորապես անհասանելի է՝ համակարգի վերազինման և թարմացման նպատակներով։'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onBackHome}
          >
            Գլխավոր էջ
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRecheck}
            disabled={checking}
            style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            {checking ? 'Ստուգվում է...' : 'Ստուգել կրկին'}
          </button>
        </div>
      </div>
    </div>
  );
}
