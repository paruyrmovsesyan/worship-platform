import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Notifications.css';

function formatRelativeTime(dateStr, language) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) {
    return language === 'am' ? 'Հենց նոր' : language === 'ru' ? 'Только что' : 'Just now';
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return language === 'am' ? `${mins} րոպե առաջ` : language === 'ru' ? `${mins} мин. назад` : `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return language === 'am' ? `${hours} ժամ առաջ` : language === 'ru' ? `${hours} ч. назад` : `${hours}h ago`;
  }
  if (diffSec < 172800) {
    return language === 'am' ? 'Երեկ' : language === 'ru' ? 'Вчера' : 'Yesterday';
  }

  return date.toLocaleDateString(language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short'
  });
}

function getLocalizedNotificationText(notif, language) {
  let rawText = '';
  try {
    const parsed = typeof notif.content === 'string' ? JSON.parse(notif.content) : (notif.content || {});
    rawText = parsed?.text || '';
  } catch (e) {
    rawText = String(notif.content || '');
  }

  // Extract name if available
  let senderName = notif.sender_name || '';
  if (!senderName && rawText) {
    const match = rawText.match(/^([A-Za-z0-9_.-]+)\s+(wants|accepted)/);
    if (match && match[1] && match[1].toLowerCase() !== 'someone') {
      senderName = match[1];
    }
  }

  if (notif.type === 'friend_request' || rawText.toLowerCase().includes('wants to be your friend')) {
    if (language === 'am') {
      return senderName ? `${senderName}-ը ցանկանում է դառնալ Ձեր ընկերը:` : 'Ինչ-որ մեկը ցանկանում է դառնալ Ձեր ընկերը:';
    }
    if (language === 'ru') {
      return senderName ? `${senderName} хочет добавить вас в друзья.` : 'Кто-то хочет добавить вас в друзья.';
    }
    return senderName ? `${senderName} wants to be your friend.` : 'Someone wants to be your friend.';
  }

  if (notif.type === 'friend_accepted' || rawText.toLowerCase().includes('accepted your friend request')) {
    if (language === 'am') {
      return senderName ? `${senderName}-ն ընդունեց Ձեր ընկերության հայտը:` : 'Ձեր ընկերության հայտն ընդունվել է:';
    }
    if (language === 'ru') {
      return senderName ? `${senderName} принял(а) ваш запрос в друзья.` : 'Ваш запрос в друзья принят.';
    }
    return senderName ? `${senderName} accepted your friend request.` : 'Someone accepted your friend request.';
  }

  return rawText || (language === 'am' ? 'Նոր ծանուցում' : language === 'ru' ? 'Новое уведомление' : 'New Notification');
}

function getNotificationCategory(n) {
  if (!n) return 'system';

  const type = String(n.type || '').toLowerCase();
  const link = String(n.action_link || '').toLowerCase();

  let fullText = String(n.content || '') + ' ' + String(n.text || '') + ' ' + String(n.title || '') + ' ' + String(n.message || '');
  try {
    if (typeof n.content === 'string' && n.content.trim().startsWith('{')) {
      const parsed = JSON.parse(n.content);
      fullText += ' ' + String(parsed?.text || '') + ' ' + String(parsed?.message || '');
    }
  } catch (e) {}

  fullText = fullText.toLowerCase();

  if (
    type.includes('friend') ||
    link.includes('/friends') ||
    fullText.includes('friend') ||
    fullText.includes('ընկեր') ||
    fullText.includes('друг') ||
    fullText.includes('request') ||
    fullText.includes('accepted')
  ) {
    return 'friends';
  }

  if (
    type.includes('setlist') ||
    type.includes('chat') ||
    link.includes('/setlist') ||
    link.includes('/chat') ||
    fullText.includes('setlist') ||
    fullText.includes('սեթլիստ') ||
    fullText.includes('հավաքածու') ||
    fullText.includes('chat') ||
    fullText.includes('չաթ')
  ) {
    return 'setlists';
  }

  return 'system';
}

const NotificationCard = ({ notif, language, onAction, onDelete, onAcceptFriend, t }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const isUnread = Number(notif.is_read) === 0;
  const formattedText = getLocalizedNotificationText(notif, language);
  const relativeTime = formatRelativeTime(notif.created_at, language);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

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
    if (translateX < -45) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className="notif-card-wrapper">
      <div className="notif-delete-bg" onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }} title="Delete">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </div>

      <div
        className={`notif-card ${isUnread ? 'unread' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onAction(notif)}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        <div className={`notif-icon-box ${
          notif.type === 'friend_request' ? 'icon-friend' :
          notif.type === 'friend_accepted' ? 'icon-accepted' :
          notif.type === 'chat_message' ? 'icon-chat' :
          notif.type === 'setlist_share' ? 'icon-setlist' : 'icon-system'
        }`}>
          {notif.type === 'friend_request' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          ) : notif.type === 'friend_accepted' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ) : notif.type === 'chat_message' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          ) : notif.type === 'setlist_share' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          )}
        </div>

        <div className="notif-body">
          <div className="notif-text">{formattedText}</div>
          <div className="notif-time">{relativeTime}</div>

          {notif.type === 'friend_request' && (
            <div className="notif-card-actions" onClick={e => e.stopPropagation()}>
              <button
                className="notif-card-btn btn-accept"
                onClick={() => onAcceptFriend(notif)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {t('friends.accept', 'Ընդունել')}
              </button>
              <button
                className="notif-card-btn btn-view"
                onClick={() => onAction(notif)}
              >
                {t('common.view', 'Դիտել')}
              </button>
            </div>
          )}

          {notif.type !== 'friend_request' && notif.action_link && (
            <div className="notif-card-actions" onClick={e => e.stopPropagation()}>
              <button
                className="notif-card-btn btn-view"
                onClick={() => onAction(notif)}
              >
                {t('common.view', 'Անցնել')}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Notifications() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  usePageReady(loading);

  const fetchNotifications = () => {
    fetch('/user_notifications_api.php?action=list')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setNotifications(d.notifications || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
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
    if (id === 'all') {
      notifications.forEach(n => {
        fetch('/user_notifications_api.php?action=delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: n.id })
        });
      });
      setNotifications([]);
      return;
    }

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

  const handleAcceptFriend = async (notif) => {
    markAsRead(notif.id);
    if (notif.sender_id) {
      try {
        const res = await fetch('/friends_api.php?action=accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: notif.sender_id })
        });
        const data = await res.json();
        if (data.ok) {
          fetchNotifications();
          window.dispatchEvent(new CustomEvent('wp-friendship-updated'));
          navigate('/friends');
          return;
        }
        throw new Error(data.error || 'Friend request could not be accepted');
      } catch (err) {
        console.error(err);
        return;
      }
    }
    navigate('/friends');
  };

  const unreadCount = notifications.filter(n => Number(n.is_read) === 0).length;
  const friendsCount = notifications.filter(n => getNotificationCategory(n) === 'friends').length;
  const setlistsCount = notifications.filter(n => getNotificationCategory(n) === 'setlists').length;
  const systemCount = notifications.filter(n => getNotificationCategory(n) === 'system').length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return Number(n.is_read) === 0;
    if (activeTab === 'friends') return getNotificationCategory(n) === 'friends';
    if (activeTab === 'setlists') return getNotificationCategory(n) === 'setlists';
    if (activeTab === 'system') return getNotificationCategory(n) === 'system';
    return true;
  });

  return (
    <div className="notif-page animate-fade-in">
      <div className="notif-header">
        <div className="notif-header-top">
          <div className="notif-header-title-group">
            <button className="notif-back-btn" onClick={() => navigate(-1)} title="Back">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h1 className="notif-title">{t('notifications.title', 'Ծանուցումներ')}</h1>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">
                {unreadCount} {t('notifications.unread', 'չկարդացված')}
              </span>
            )}
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-action-btn primary" onClick={() => markAsRead('all')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {t('notifications.markAllRead', 'Կարդացված')}
              </button>
            )}

            {notifications.length > 0 && (
              <button className="notif-action-btn danger" onClick={() => handleDelete('all')} title="Delete all">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="notif-tabs">
          <button
            className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📌 {t('notifications.all', 'Բոլորը')} ({notifications.length})
          </button>
          <button
            className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            ✉️ {t('notifications.unreadTab', 'Չկարդացված')} ({unreadCount})
          </button>
          <button
            className={`notif-tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            👥 {t('notifications.friendsTab', 'Ընկերներ')} ({friendsCount})
          </button>
          <button
            className={`notif-tab ${activeTab === 'setlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('setlists')}
          >
            🎼 {t('notifications.setlistsTab', 'Հավաքածուներ')} ({setlistsCount})
          </button>
          <button
            className={`notif-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ {t('notifications.systemTab', 'Համակարգային')} ({systemCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="notif-list">
          <div className="notif-skeleton"></div>
          <div className="notif-skeleton"></div>
          <div className="notif-skeleton"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notif-empty">
          <div className="notif-empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <h3>{t('notifications.emptyTitle', 'Ծանուցումներ չկան')}</h3>
          <p>{t('notifications.emptyDesc', 'Դուք դեռ չունեք նոր ծանուցումներ այս բաժնում։')}</p>
        </div>
      ) : (
        <div className="notif-list">
          {filteredNotifications.map(notif => (
            <NotificationCard
              key={notif.id}
              notif={notif}
              language={language}
              onAction={handleAction}
              onDelete={handleDelete}
              onAcceptFriend={handleAcceptFriend}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
