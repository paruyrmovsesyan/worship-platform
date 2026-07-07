import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const SwipeableNotification = ({ notif, onAction, onDelete, t }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const itemRef = useRef(null);

  const content = notif.content ? JSON.parse(notif.content) : {};

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow swiping left (negative diff)
    if (diff < 0 && diff > -100) {
      setTranslateX(diff);
    } else if (diff <= -100) {
      setTranslateX(-100);
    } else if (diff > 0) {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (translateX < -50) {
      // Snap open to show delete button
      setTranslateX(-80);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
      {/* Background Delete Button */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '80px',
        background: 'linear-gradient(135deg, #FF4A4A 0%, #D32F2F 100%)',
        borderRadius: '0 16px 16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        zIndex: 0,
        cursor: 'pointer'
      }} onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </div>

      {/* Swipeable Foreground */}
      <div 
        ref={itemRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onAction(notif)}
        style={{
          background: Number(notif.is_read) === 1 ? 'var(--color-surface)' : 'rgba(191, 90, 242, 0.05)',
          border: `1px solid ${Number(notif.is_read) === 1 ? 'var(--color-surface-hover)' : 'rgba(191, 90, 242, 0.3)'}`,
          padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px',
          cursor: notif.action_link ? 'pointer' : 'default',
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(191, 90, 242, 0.15)',
          color: 'var(--color-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          {notif.type === 'friend_request' ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          ) : notif.type === 'friend_accepted' ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: Number(notif.is_read) === 1 ? 500 : 700, marginBottom: '4px' }}>
            {content.text || t('notifications.newNotification')}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {new Date(notif.created_at).toLocaleString()}
          </div>
        </div>
        {Number(notif.is_read) === 0 && (
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent-cyan)', flexShrink: 0 }}></div>
        )}
      </div>
    </div>
  );
};

export default function Notifications() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/user_notifications_api.php?action=list')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setNotifications(d.notifications);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const markAsRead = (id) => {
    fetch('/user_notifications_api.php?action=mark_read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        if (id === 'all') {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        } else {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        }
      }
    });
  };

  const handleAction = (notif) => {
    markAsRead(notif.id);
    if (notif.action_link) {
      navigate(notif.action_link);
    }
  };

  const handleDelete = (id) => {
    fetch('/user_notifications_api.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{t('notifications.title', 'Ծանուցումներ')}</h2>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => markAsRead('all')}
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: 'none',
              color: 'var(--color-accent-cyan)',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>{t('notifications.loading')}</div>
      ) : notifications.length === 0 ? (
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', background: 'var(--color-surface)', borderRadius: '24px',
          border: '1px solid var(--color-surface-hover)', textAlign: 'center'
        }}>
          <div style={{
            width: '80px', height: '80px', background: 'rgba(191, 90, 242, 0.1)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{t('notifications.emptyTitle', 'Ծանուցումներ չկան')}</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '280px' }}>
            {t('notifications.emptyDesc', 'Դուք դեռ չունեք նոր ծանուցումներ։')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notif => (
            <SwipeableNotification 
              key={notif.id} 
              notif={notif} 
              onAction={handleAction} 
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
