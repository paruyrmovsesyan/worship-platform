import { useEffect, useState } from 'react';
import { usePlatformAnnouncement } from '../utils/featureFlags';

const BANNER_ACCENTS = {
  critical: {
    border: 'rgba(255, 69, 58, 0.38)',
    badge: 'rgba(255, 69, 58, 0.16)',
    glow: 'rgba(255, 69, 58, 0.16)',
    tint: '#ff6961',
    defaultTitle: { am: 'Տեխնիկական հայտարարություն', ru: 'Техническое уведомление', en: 'Service Notice' },
  },
  warning: {
    border: 'rgba(247, 181, 0, 0.38)',
    badge: 'rgba(247, 181, 0, 0.16)',
    glow: 'rgba(247, 181, 0, 0.14)',
    tint: '#f7b500',
    defaultTitle: { am: 'Ուշադրություն', ru: 'Внимание', en: 'Notice' },
  },
  success: {
    border: 'rgba(16, 185, 129, 0.38)',
    badge: 'rgba(16, 185, 129, 0.16)',
    glow: 'rgba(16, 185, 129, 0.14)',
    tint: '#34d399',
    defaultTitle: { am: 'Թարմացում', ru: 'Обновление', en: 'Update' },
  },
  info: {
    border: 'rgba(0, 212, 255, 0.36)',
    badge: 'rgba(0, 212, 255, 0.14)',
    glow: 'rgba(0, 212, 255, 0.14)',
    tint: '#7ee8ff',
    defaultTitle: { am: 'Հայտարարություն', ru: 'Объявление', en: 'Announcement' },
  },
};

function resolveLocalizedAnnouncement(announcement, language) {
  if (!announcement) return { title: '', message: '' };
  let rawTitle = announcement.title || '';
  let rawMsg = announcement.message || '';

  if (language === 'ru') {
    rawTitle = announcement.title_ru || rawTitle;
    rawMsg = announcement.message_ru || rawMsg;
  } else if (language === 'en') {
    rawTitle = announcement.title_en || rawTitle;
    rawMsg = announcement.message_en || rawMsg;
  }

  rawTitle = String(rawTitle || '').trim();
  rawMsg = String(rawMsg || '').trim();

  // If the admin pasted a multi-line announcement into message without a separate title,
  // promote the first short line into the bold card header so the layout stays clean.
  if (!rawTitle && rawMsg.includes('\n')) {
    const lines = rawMsg.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines[0].length <= 80) {
      return {
        title: lines[0],
        message: lines.slice(1).join('\n'),
      };
    }
  }

  const palette = BANNER_ACCENTS[announcement.type] || BANNER_ACCENTS.info;
  return {
    title: rawTitle || palette.defaultTitle[language] || palette.defaultTitle.am,
    message: rawMsg,
  };
}

function formatCountdown(targetIso, nowMs) {
  if (!targetIso) return '';
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) return '';
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  if (diffSec <= 0) return '';
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

function useLiveCountdown(targetIso, enabled) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !targetIso) return undefined;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [targetIso, enabled]);

  return enabled && targetIso ? formatCountdown(targetIso, nowMs) : '';
}

/**
 * In-flow announcement card rendered cleanly below headers so it never covers navigation or content.
 */
export function PlatformAnnouncementBanner({
  announcement: propAnnouncement,
  dismissed: propDismissed,
  onDismiss,
  navigate,
  language = 'am',
  embedded = false,
}) {
  const store = usePlatformAnnouncement();
  const announcement = propAnnouncement !== undefined ? propAnnouncement : store.announcement;
  const dismissed = propDismissed !== undefined ? propDismissed : store.dismissed;
  const handleDismiss = onDismiss || store.dismiss;

  const countdown = useLiveCountdown(announcement?.schedule_end_at, Boolean(announcement?.show_countdown));

  if (!announcement || dismissed) {
    return null;
  }

  const palette = BANNER_ACCENTS[announcement.type] || BANNER_ACCENTS.info;
  const actionUrl = String(announcement.action_url || '').trim();
  const isInternal = actionUrl.startsWith('/');
  const localized = resolveLocalizedAnnouncement(announcement, language);

  return (
    <div
      role="status"
      style={{
        width: embedded ? '100%' : 'min(920px, calc(100% - 28px))',
        margin: embedded ? '0 0 14px 0' : '10px auto 12px',
        background: `radial-gradient(240px 140px at 0% 0%, ${palette.glow}, transparent 72%), linear-gradient(165deg, rgba(22, 24, 36, 0.95) 0%, rgba(13, 14, 22, 0.98) 100%)`,
        border: `1px solid ${palette.border}`,
        color: '#ffffff',
        borderRadius: '18px',
        padding: '13px 15px',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 12px 28px rgba(0, 0, 0, 0.28)',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Row: Status Dot + Title on Left, Countdown Pill + Close Button on Right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: palette.tint,
              boxShadow: `0 0 8px ${palette.tint}`,
              flexShrink: 0,
            }}
          />
          <strong
            style={{
              fontWeight: 800,
              fontSize: '0.88rem',
              color: palette.tint,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {localized.title}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {countdown && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '999px',
                background: palette.badge,
                border: `1px solid ${palette.border}`,
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              ⏳ {countdown}
            </span>
          )}
          {announcement.dismissible !== false && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Փակել հայտարարությունը"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'rgba(255, 255, 255, 0.85)',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '0.76rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Full-Width Body Copy */}
      {localized.message && (
        <div
          style={{
            color: 'rgba(235, 240, 248, 0.9)',
            fontSize: '0.83rem',
            lineHeight: 1.48,
            whiteSpace: 'pre-line',
          }}
        >
          {localized.message}
        </div>
      )}

      {/* Optional CTA Row */}
      {announcement.action_text && actionUrl && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '3px' }}>
          {isInternal && navigate ? (
            <button
              type="button"
              onClick={() => navigate(actionUrl)}
              style={{
                background: palette.badge,
                border: `1px solid ${palette.border}`,
                color: '#ffffff',
                padding: '6px 13px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {announcement.action_text} →
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
                padding: '6px 13px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.78rem',
                textDecoration: 'none',
              }}
            >
              {announcement.action_text} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Full-page lock card rendered when a user navigates to a page restricted by the active announcement.
 */
export function AnnouncementRestrictedView({ announcement, onBackHome, onRecheck, language = 'am' }) {
  const [checking, setChecking] = useState(false);
  const localized = resolveLocalizedAnnouncement(announcement, language);
  const countdown = useLiveCountdown(announcement?.schedule_end_at, Boolean(announcement?.show_countdown));

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

        {countdown && (
          <div
            style={{
              display: 'inline-block',
              marginBottom: '10px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(0, 212, 255, 0.14)',
              border: '1px solid rgba(0, 212, 255, 0.32)',
              color: '#7ee8ff',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ⏳ {countdown}
          </div>
        )}

        <h2 style={{ margin: '0 0 10px', fontSize: '1.3rem', fontWeight: 800 }}>
          {localized.title || 'Բաժինը ժամանակավորապես սահմանափակված է'}
        </h2>
        <p style={{ margin: '0 0 22px', color: 'rgba(226, 232, 240, 0.8)', fontSize: '0.94rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {localized.message || 'Այս բաժինը ժամանակավորապես անհասանելի է՝ համակարգի վերազինման և թարմացման նպատակներով։'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={onBackHome}>
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
