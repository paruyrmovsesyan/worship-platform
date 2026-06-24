import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Notifications() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'var(--color-text-primary)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{t('notifications.title')}</h2>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '60px 20px',
        background: 'var(--color-surface)',
        borderRadius: '24px',
        border: '1px solid var(--color-surface-hover)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(191, 90, 242, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('notifications.emptyTitle')}</h3>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '280px' }}>
          {t('notifications.emptyDesc')}
        </p>
      </div>
    </div>
  );
}
