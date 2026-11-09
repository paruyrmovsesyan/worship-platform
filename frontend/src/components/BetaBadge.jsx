import React from 'react';
import './BetaBadge.css';

export function BetaBadge({
  label = 'BETA',
  title = 'Փորձարարական փուլում է (Beta)',
  style = {},
  className = '',
}) {
  return (
    <span
      className={`wp-beta-chip ${className}`}
      title={title}
      style={style}
    >
      <span className="wp-beta-dot" />
      {label}
    </span>
  );
}

export function BetaBanner({
  title = 'Այս ֆունկցիան գտնվում է BETA փորձարկման փուլում',
  description = 'Լաբարատորիայի փորձարարական հնարավորությունները շարունակաբար թարմացվում և կատարելագործվում են։',
  style = {},
  className = '',
}) {
  return (
    <div className={`wp-beta-banner ${className}`} style={style}>
      <span className="wp-beta-banner-icon">🧪</span>
      <div className="wp-beta-banner-text">
        <div>
          <span className="wp-beta-banner-tag">BETA LABS</span>
          <strong>{title}</strong>
        </div>
        {description && (
          <div style={{ fontSize: '0.78rem', color: '#fde68a', marginTop: '2px', fontWeight: 500 }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeatureDisabledScreen({
  title = 'Ֆունկցիան ժամանակավորապես անջատված է',
  description = 'Այս բաժինը անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):',
  onBack,
  backUrl = '/songs',
  backLabel = 'Վերադառնալ Երգացանկ',
}) {
  return (
    <div className="wp-disabled-feature-card">
      <div className="wp-disabled-icon">🔒</div>
      <h2 className="wp-disabled-title">{title}</h2>
      <p className="wp-disabled-desc">{description}</p>
      {onBack ? (
        <button type="button" className="wp-disabled-btn" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : (
        <a href={backUrl} className="wp-disabled-btn">
          ← {backLabel}
        </a>
      )}
    </div>
  );
}

export function ComingSoonBadge({
  label = 'ՇՈՒՏՈՎ',
  title = 'Այս ֆունկցիան շուտով հասանելի կլինի (Coming Soon)',
  style = {},
  className = '',
}) {
  return (
    <span
      className={`wp-soon-chip ${className}`}
      title={title}
      style={style}
    >
      <span className="wp-soon-dot" />
      {label}
    </span>
  );
}

export function ComingSoonBanner({
  title = 'Այս ֆունկցիան շուտով հասանելի կլինի',
  description = 'Մոդուլը գտնվում է ակտիվ նախապատրաստման փուլում և շուտով կգործարկվի հավելվածում։',
  style = {},
  className = '',
}) {
  return (
    <div className={`wp-soon-banner ${className}`} style={style}>
      <span className="wp-soon-banner-icon">⏳</span>
      <div className="wp-soon-banner-text">
        <div>
          <span className="wp-soon-banner-tag">ՇՈՒՏՈՎ</span>
          <strong>{title}</strong>
        </div>
        {description && (
          <div style={{ fontSize: '0.78rem', color: '#c7d2fe', marginTop: '2px', fontWeight: 500 }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeatureComingSoonScreen({
  title = 'Շուտով հասանելի կլինի',
  description = 'Այս նոր ֆունկցիան գտնվում է նախապատրաստման փուլում և շուտով հասանելի կդառնա հավելվածում և կայքում։',
  onBack,
  backUrl = '/studio',
  backLabel = 'Վերադառնալ',
}) {
  return (
    <div className="wp-soon-feature-card">
      <div className="wp-soon-icon">⏳</div>
      <h2 className="wp-soon-title">{title}</h2>
      <p className="wp-soon-desc">{description}</p>
      {onBack ? (
        <button type="button" className="wp-soon-btn" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : (
        <a href={backUrl} className="wp-soon-btn">
          ← {backLabel}
        </a>
      )}
    </div>
  );
}

export default BetaBadge;
