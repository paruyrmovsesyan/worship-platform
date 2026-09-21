import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCall } from '../context/CallContext';
import { usePageReady } from '../hooks/usePageReady';
import { useIsPWA } from '../hooks/useIsPWA';
import './UserProfile.css';

const WORSHIP_ROLES = [
  { id: 'vocalist', icon: '🎤', label: { am: 'Վոկալիստ', ru: 'Вокалист', en: 'Vocalist' } },
  { id: 'leader', icon: '📖', label: { am: 'Երկրպագության Ղեկավար', ru: 'Лидер поклонения', en: 'Worship Leader' } },
  { id: 'guitarist', icon: '🎸', label: { am: 'Կիտառահար', ru: 'Гитарист', en: 'Guitarist' } },
  { id: 'keyboardist', icon: '🎹', label: { am: 'Ստեղնաշարահար', ru: 'Клавишник', en: 'Keyboardist' } },
  { id: 'bassist', icon: '🎸', label: { am: 'Բաս Կիտառահար', ru: 'Басист', en: 'Bassist' } },
  { id: 'drummer', icon: '🥁', label: { am: 'Հարվածայիններ', ru: 'Барабанщик', en: 'Drummer' } },
  { id: 'sound_engineer', icon: '🎛️', label: { am: 'Ձայնային Ինժեներ', ru: 'Звукорежиссер', en: 'Sound Engineer' } },
  { id: 'team_member', icon: '🎶', label: { am: 'Թիմի Անդամ', ru: 'Участник команды', en: 'Team Member' } }
];

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const audioCall = useCall();
  const isPWA = useIsPWA();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  usePageReady(loading || authLoading);

  // If viewing self, redirect to /profile
  useEffect(() => {
    if (user && id && String(user.id) === String(id)) {
      navigate('/profile', { replace: true });
    }
  }, [user, id, navigate]);

  const fetchUserProfile = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMsg('');
      const res = await fetch(`/user_api.php?action=get_user_profile&id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.ok) {
        setProfileData(data);
      } else {
        setErrorMsg(data.error || t('profile.userNotFound'));
      }
    } catch {
      setErrorMsg(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleStartChat = async () => {
    if (!profileData?.user) return;
    if (profileData.direct_chat_id > 0) {
      navigate(`/chat/${profileData.direct_chat_id}`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/chat_api.php?action=get_direct_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profileData.user.id })
      });
      const data = await res.json();
      if (data.ok && data.chat_id) {
        navigate(`/chat/${data.chat_id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCall = () => {
    if (!profileData?.user) return;
    audioCall.startCall(
      profileData.user.id,
      profileData.user.name,
      profileData.direct_chat_id || 0
    );
  };

  const handleAddFriend = async () => {
    if (!profileData?.user) return;
    setActionLoading(true);
    try {
      const res = await fetch('/friends_api.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profileData.user.id })
      });
      const data = await res.json();
      if (data.ok) {
        await fetchUserProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!profileData?.user) return;
    setActionLoading(true);
    try {
      const res = await fetch('/friends_api.php?action=accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profileData.user.id })
      });
      const data = await res.json();
      if (data.ok) {
        window.dispatchEvent(new CustomEvent('wp-friendship-updated'));
        await fetchUserProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOrCancel = async (isCancel = false) => {
    if (!profileData?.user) return;
    if (!isCancel && !window.confirm(t('friends.confirmRemove', 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս ընկերոջը:'))) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/friends_api.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profileData.user.id })
      });
      const data = await res.json();
      if (data.ok) {
        window.dispatchEvent(new CustomEvent('wp-friendship-updated'));
        await fetchUserProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-loading">
          <div className="user-profile-spinner" />
          <p>{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !profileData?.user) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-header-bar">
          <button className="user-profile-back-btn" onClick={() => navigate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            <span>{t('auth.back')}</span>
          </button>
        </div>
        <div className="user-profile-error-card">
          <span className="user-profile-error-icon">👤</span>
          <h3>{errorMsg || t('profile.userNotFound')}</h3>
          <button className="user-profile-action-btn primary" onClick={() => navigate(-1)}>
            {t('auth.back')}
          </button>
        </div>
      </div>
    );
  }

  const pUser = profileData.user;
  const friendship = profileData.friendship || { status: 'none', is_requester: false };
  const setlists = profileData.setlists || [];

  const roleObj = pUser.worship_role ? WORSHIP_ROLES.find(r => r.id === pUser.worship_role) : null;
  const roleLabel = roleObj ? (roleObj.label[language] || roleObj.label['am']) : null;
  const avatarGrad = pUser.avatar_gradient || 'linear-gradient(135deg, #00d4ff, #3a2dff)';

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(
        language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US',
        { year: 'numeric', month: 'long' }
      );
    } catch {
      return '';
    }
  };

  const formatFriendshipDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return '';
      const formatted = d.toLocaleDateString(
        language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
      if (language === 'am') {
        return `${formatted}-ից`;
      }
      return formatted;
    } catch {
      return dateStr;
    }
  };

  const formatLastSeen = (dateStr, seconds) => {
    if (seconds !== null && seconds !== undefined) {
      if (seconds < 120) return t('profile.onlineNow');
      if (seconds < 3600) {
        const mins = Math.max(1, Math.floor(seconds / 60));
        return language === 'am' ? `${mins} րոպե առաջ` : language === 'ru' ? `${mins} мин. назад` : `${mins} min ago`;
      }
      if (seconds < 86400) {
        const hrs = Math.floor(seconds / 3600);
        return language === 'am' ? `${hrs} ժամ առաջ` : language === 'ru' ? `${hrs} ч. назад` : `${hrs} hrs ago`;
      }
    }
    if (!dateStr) return t('profile.offline');
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleDateString(
        language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      );
    } catch {
      return t('profile.offline');
    }
  };

  return (
    <div className={`user-profile-page ${isPWA ? 'pwa-view' : 'web-view'}`}>
      {/* Top App Header */}
      <div className="user-profile-header-bar">
        <button className="user-profile-back-btn" onClick={() => navigate(-1)} aria-label={t('auth.back')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span>{t('auth.back')}</span>
        </button>
        <h1 className="user-profile-page-title">{t('profile.userProfile')}</h1>
        <div style={{ width: '40px' }} />
      </div>

      <div className="user-profile-content">
        {/* Main Identity Card */}
        <div className="user-profile-card">
          <div className="user-profile-avatar-wrapper">
            <div className="user-profile-avatar" style={{ background: avatarGrad }}>
              {(pUser.name || 'U').charAt(0).toUpperCase()}
            </div>
            <span
              className={`user-profile-online-badge ${pUser.is_online ? 'online' : 'offline'}`}
              title={pUser.is_online ? t('profile.onlineNow') : t('profile.offline')}
            />
          </div>

          <div className="user-profile-identity">
            <h2 className="user-profile-name">{pUser.name}</h2>
            {pUser.username && (
              <span className="user-profile-username">@{pUser.username}</span>
            )}
            
            <div className="user-profile-status-line">
              <span className={`status-dot ${pUser.is_online ? 'online' : 'offline'}`} />
              <span className="status-text">
                {pUser.is_online
                  ? t('profile.onlineNow')
                  : `${t('profile.lastSeen')} ${formatLastSeen(pUser.last_active_at, pUser.seconds_since_active)}`}
              </span>
            </div>

            {roleObj && (
              <div className="user-profile-role-tag">
                <span className="role-icon">{roleObj.icon}</span>
                <span className="role-label">{roleLabel}</span>
              </div>
            )}

            {friendship.status === 'accepted' && friendship.friends_since && (
              <div className="user-profile-friendship-badge">
                <span className="friendship-badge-icon">🤝</span>
                <span>{t('profile.friendsSince')} {formatFriendshipDate(friendship.friends_since)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="user-profile-actions-grid">
          {/* Chat Button */}
          <button
            className="user-profile-action-btn chat-btn"
            onClick={handleStartChat}
            disabled={actionLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{t('profile.startChat')}</span>
          </button>

          {/* Audio Call Button */}
          <button
            className="user-profile-action-btn call-btn"
            onClick={handleStartCall}
            title={t('profile.startCall')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>{t('profile.startCall')}</span>
          </button>

          {/* Friendship Action Button */}
          {friendship.status === 'accepted' ? (
            <button
              className="user-profile-action-btn friend-btn accepted"
              onClick={() => handleRemoveOrCancel(false)}
              disabled={actionLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
              <span>{t('profile.isFriend')}</span>
            </button>
          ) : friendship.status === 'pending' && !friendship.is_requester ? (
            <button
              className="user-profile-action-btn friend-btn accept"
              onClick={handleAcceptFriend}
              disabled={actionLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{t('profile.acceptRequest')}</span>
            </button>
          ) : friendship.status === 'pending' && friendship.is_requester ? (
            <button
              className="user-profile-action-btn friend-btn pending"
              onClick={() => handleRemoveOrCancel(true)}
              disabled={actionLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{t('profile.requestSent')}</span>
            </button>
          ) : (
            <button
              className="user-profile-action-btn friend-btn add"
              onClick={handleAddFriend}
              disabled={actionLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>{t('profile.addFriend')}</span>
            </button>
          )}
        </div>

        {/* Detailed Info Cards */}
        <div className="user-profile-info-section">
          {/* Member since card */}
          {pUser.created_at && (
            <div className="user-profile-info-row">
              <div className="info-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="info-text-group">
                <span className="info-label">{t('profile.memberSince')}</span>
                <span className="info-value">{formatJoinDate(pUser.created_at)}</span>
              </div>
            </div>
          )}

          {/* Worship Team Role */}
          <div className="user-profile-info-row">
            <div className="info-icon-box">
              <span style={{ fontSize: '1.2rem' }}>{roleObj ? roleObj.icon : '🎵'}</span>
            </div>
            <div className="info-text-group">
              <span className="info-label">{t('profile.teamRoleSection')}</span>
              <span className="info-value">{roleLabel || t('profile.noTeamRole')}</span>
            </div>
          </div>

          {/* Friendship Since Date */}
          {friendship.status === 'accepted' && friendship.friends_since && (
            <div className="user-profile-info-row friendship-since-row">
              <div className="info-icon-box friendship-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="info-text-group">
                <span className="info-label">{t('profile.friendsSince')}</span>
                <span className="info-value highlight-friends-since">
                  {formatFriendshipDate(friendship.friends_since)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User's Setlists Section */}
        <div className="user-profile-section-header">
          <h3>
            <span>📋</span> {t('profile.userSetlists')}
            <span className="section-badge">{setlists.length}</span>
          </h3>
        </div>

        {setlists.length === 0 ? (
          <div className="user-profile-empty-setlists">
            <p>{t('profile.noUserSetlists')}</p>
          </div>
        ) : (
          <div className="user-profile-setlists-list">
            {setlists.map((setlist) => (
              <div
                key={setlist.id}
                className="user-profile-setlist-card"
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                <div className="setlist-icon-badge">📋</div>
                <div className="setlist-card-details">
                  <div className="setlist-card-title">{setlist.title || `Setlist #${setlist.id}`}</div>
                  <div className="setlist-card-meta">
                    {setlist.songs_count || 0} {t('profile.songsCount')}
                  </div>
                </div>
                <span className="setlist-card-arrow">➔</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
