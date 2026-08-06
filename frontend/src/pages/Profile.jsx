import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import { useIsPWA } from '../hooks/useIsPWA';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import './Profile.css';

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const isPWA = useIsPWA();
  const { guardPath } = usePwaOfflineGuard();
  const [loading, setLoading] = useState(true);
  usePageReady(loading || authLoading);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [teamRole, setTeamRole] = useState(null);
  const [avatarGradient, setAvatarGradient] = useState('linear-gradient(135deg, #00d4ff, #3a2dff)');

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

  const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #00d4ff, #3a2dff)',
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f97316, #e11d48)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #eab308, #f97316)'
  ];

  const currentRoleObj = teamRole ? WORSHIP_ROLES.find(r => r.id === teamRole) : null;
  const roleLabel = currentRoleObj ? (currentRoleObj.label[language] || currentRoleObj.label['am']) : null;

  // Load worship role from server on mount
  useEffect(() => {
    if (!user) return;
    fetch('/account_api.php?action=get_worship_role')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          if (data.worship_role) {
            setTeamRole(data.worship_role);
            try { localStorage.setItem('wp_user_team_role', data.worship_role); } catch(e) {}
          }
          if (data.avatar_gradient) {
            setAvatarGradient(data.avatar_gradient);
            try { localStorage.setItem('wp_user_avatar_gradient', data.avatar_gradient); } catch(e) {}
          }
        }
      })
      .catch(() => {
        // Fallback to localStorage
        const lr = localStorage.getItem('wp_user_team_role');
        const lg = localStorage.getItem('wp_user_avatar_gradient');
        if (lr) setTeamRole(lr);
        if (lg) setAvatarGradient(lg);
      });
  }, [user]);

  const saveRoleAndGradient = (newRole, newGradient) => {
    setTeamRole(newRole);
    setAvatarGradient(newGradient);
    try {
      if (newRole) {
        localStorage.setItem('wp_user_team_role', newRole);
      } else {
        localStorage.removeItem('wp_user_team_role');
      }
      if (newGradient) {
        localStorage.setItem('wp_user_avatar_gradient', newGradient);
      }
    } catch (e) {}
    // Save to server
    fetch('/account_api.php?action=save_worship_role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worship_role: newRole || '',
        avatar_gradient: newGradient || ''
      })
    }).catch(() => {});
  };
  const [supportTopic, setSupportTopic] = useState('question');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportContact, setSupportContact] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportAlert, setSupportAlert] = useState({ text: '', type: '' });

  const handleSendSupport = async (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      setSupportAlert({ text: t('support.messageRequired', 'Խնդրում ենք գրել հաղորդագրության տեքստը'), type: 'err' });
      return;
    }
    setSupportSending(true);
    setSupportAlert({ text: '', type: '' });
    try {
      const res = await fetch('/account_api.php?action=send_support_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: supportTopic === 'bug' ? '🛠 Սխալի մասին հայտնում' : supportTopic === 'feature' ? '💡 Առաջարկություն' : supportTopic === 'other' ? '💬 Այլ' : '❓ Հարց կամ օգնություն',
          message: supportMessage,
          contact: supportContact
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSupportAlert({ text: data.message || t('support.sentSuccess', 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց։'), type: 'ok' });
        setSupportMessage('');
        setSupportContact('');
        setTimeout(() => {
          setSupportAlert({ text: '', type: '' });
          setIsSupportModalOpen(false);
        }, 2200);
      } else {
        setSupportAlert({ text: data.error || 'Սխալ է տեղի ունեցել', type: 'err' });
      }
    } catch {
      setSupportAlert({ text: 'Ցանցային սխալ', type: 'err' });
    } finally {
      setSupportSending(false);
    }
  };

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    let interval;
    const checkPush = () => {
      if (!window.WPPushManager) return;
      window.WPPushManager.getStatus().then(status => {
        setPushEnabled(
          !!status &&
          status.supported &&
          status.enabledBySite &&
          status.permission === 'granted' &&
          status.subscribed &&
          !status.userDisabled &&
          !status.accountDisabled &&
          !status.adminRemoved
        );
        setPushSupported(!!status && status.supported && status.enabledBySite && !status.adminRemoved);
      }).catch(console.error);
    };
    interval = setInterval(checkPush, 2000);
    checkPush();
    
    return () => clearInterval(interval);
  }, []);

  const togglePush = async () => {
    if (!window.WPPushManager) {
      alert(t('profile.pushMissingManager'));
      return;
    }
    try {
      if (pushEnabled) {
        const shouldDisable = window.confirm(t('profile.pushDisableConfirm'));
        if (!shouldDisable) {
          return;
        }
        await window.WPPushManager.disable();
        setPushEnabled(false);
      } else {
        if (window.WPPushManager.clearSuppression) {
          window.WPPushManager.clearSuppression();
        }
        const res = await window.WPPushManager.enable();
        if (res && res.ok) {
          setPushEnabled(true);
        } else {
          if (res && res.error === 'not_supported') {
            alert(t('profile.pushNotSupported'));
          } else {
            alert(t('profile.pushEnableError'));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const languageLabels = {
    'am': 'Հայերեն',
    'ru': 'Русский',
    'en': 'English'
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      navigate('/');
      return;
    }

    fetch('/user_api.php?action=get_profile')
      .then(res => res.json())
      .then(() => {
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const [favCount, setFavCount] = useState(0);
  const [setlistCount, setSetlistCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [webTab, setWebTab] = useState('workspace');

  const [editName, setEditName] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditUsername(user.username || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setSaveMsg({ text: t('auth.nameRequired', 'Անունը պարտադիր է'), type: 'err' });
      return;
    }
    setSavingProfile(true);
    setSaveMsg({ text: '', type: '' });
    try {
      const res = await fetch('/account_api.php?action=update_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          username: editUsername
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg({ text: t('settings.profile.success', 'Տվյալները հաջողությամբ պահպանվեցին։'), type: 'ok' });
        if (user) {
          user.name = editName;
          user.username = editUsername;
        }
        setTimeout(() => setSaveMsg({ text: '', type: '' }), 4000);
      } else {
        setSaveMsg({ text: data.error || 'Սխալ է տեղի ունեցել', type: 'err' });
      }
    } catch {
      setSaveMsg({ text: 'Ցանցային սխալ', type: 'err' });
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!user || isPWA) return;
    fetch('/user_favorites_api.php?action=get_favorites')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFavCount(data.length);
      })
      .catch(() => {});

    fetch('/setlists_api.php?action=list')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSetlistCount(data.length);
        else if (data?.setlists && Array.isArray(data.setlists)) setSetlistCount(data.setlists.length);
      })
      .catch(() => {});

    fetch('/friends_api.php?action=list')
      .then(res => res.json())
      .then(data => {
        if (data?.friends && Array.isArray(data.friends)) {
          const accepted = data.friends.filter(f => f.status === 'accepted');
          setFriendsCount(accepted.length);
        }
      })
      .catch(() => {});
  }, [user, isPWA]);

  if (authLoading || !user) return null;

  // PWA MODE — 100% UNTOUCHED
  if (isPWA) {
    return (
      <div className="profile-page pwa-profile-page">
        <div className="profile-header">
          <h2>{t('profile.title')}</h2>
          <p>{t('profile.desc')}</p>
        </div>

        <div className="profile-card">
          <div className="profile-avatar" style={{ background: avatarGradient }} onClick={() => setIsRoleModalOpen(true)} title="Փոխել ավատարը / դերը">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            <span className="profile-avatar-edit-icon">✏️</span>
          </div>
          <div className="profile-info">
            <h3>{user.name}</h3>
            <p className="profile-email">{user.email}</p>
            <div className="profile-role-badge-tag" onClick={() => setIsRoleModalOpen(true)}>
              {currentRoleObj ? (
                <span>{currentRoleObj.icon} {roleLabel}</span>
              ) : (
                <span>🎭 Ընտրել դերը թիմում</span>
              )}
              <span className="profile-role-edit-hint">⚙️</span>
            </div>
          </div>
        </div>

        <div className="profile-links">
          <button className="profile-link-btn" onClick={() => guardPath('/favorites', () => navigate('/favorites'))}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            {t('profile.savedSongs')}
          </button>
          
          <button className="profile-link-btn" onClick={() => guardPath('/friends', () => navigate('/friends'))}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {t('nav.friends', 'Ընկերներ / Չաթ')}
          </button>

          <button className="profile-link-btn" onClick={() => guardPath('/settings', () => navigate('/settings'))}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.1a2 2 0 0 1-1.41-.59l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2 18.59v-.1a2 2 0 0 1 .59-1.41l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.41 2h.1a2 2 0 0 1 1.41.59l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 5.41v.1a2 2 0 0 1-.59 1.41l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.39.66.6 1a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.82.33c-.21.34-.37.69-.6 1z"></path>
            </svg>
            {t('profile.accountSettings')}
          </button>

          <div className="profile-link-btn profile-push-card" style={{ cursor: 'default' }}>
            <div className="profile-push-top">
              <div className="profile-push-copy">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <div className="profile-push-text">
                  <span>{t('notifications.title', 'Ծանուցումներ')}</span>
                  <small>{pushEnabled ? t('profile.pushOn') : t('profile.pushOff')}</small>
                </div>
              </div>
              <label className="toggle-switch profile-push-toggle">
                <input type="checkbox" checked={pushEnabled} onChange={togglePush} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="profile-push-note">
              {t('profile.pushNote')}
            </div>
          </div>

          <button className="profile-link-btn" onClick={() => setIsLangModalOpen(true)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>{t('profile.language')}</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginRight: '8px' }}>
                {languageLabels[language]}
              </span>
            </div>
          </button>

          <button className="profile-link-btn" onClick={() => guardPath('/support', () => navigate('/support'))}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>{t('profile.supportTitle', 'Աջակցություն և կապ')}</span>
          </button>
        </div>

        <div className="logout-section">
          <button className="logout-btn" onClick={logout}>
            {t('profile.logout')}
          </button>
        </div>

        {isRoleModalOpen && (
          <div className="modal-overlay modal-overlay-bottom" onClick={() => setIsRoleModalOpen(false)}>
            <div className="modal-content profile-role-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🎭 Երկրպագության Թիմի Դեր & Ավատար</h3>
                <button className="modal-close" onClick={() => setIsRoleModalOpen(false)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="modal-body role-modal-body">
                <div className="role-modal-section">
                  <h4>🎨 Ընտրել Ավատարի Գույնը</h4>
                  <div className="avatar-gradients-grid">
                    {AVATAR_GRADIENTS.map((grad, i) => (
                      <button
                        key={i}
                        className={`gradient-swatch ${avatarGradient === grad ? 'active' : ''}`}
                        style={{ background: grad }}
                        onClick={() => saveRoleAndGradient(teamRole, grad)}
                      >
                        {avatarGradient === grad && <span className="swatch-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="role-modal-section">
                  <h4>📖 Ընտրել Ձեր Դերը Թիմում</h4>
                  <div className="roles-grid">
                    {WORSHIP_ROLES.map(r => (
                      <button
                        key={r.id}
                        className={`role-option-card ${teamRole === r.id ? 'active' : ''}`}
                        onClick={() => saveRoleAndGradient(teamRole === r.id ? null : r.id, avatarGradient)}
                      >
                        <span className="role-icon">{r.icon}</span>
                        <span className="role-name">{r.label[language] || r.label['am']}</span>
                        {teamRole === r.id && <span className="role-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="role-modal-save-btn" onClick={() => setIsRoleModalOpen(false)}>
                  Պահպանել
                </button>
              </div>
            </div>
          </div>
        )}

        {isLangModalOpen && (
          <div className="modal-overlay" onClick={() => setIsLangModalOpen(false)}>
            <div className="modal-content profile-lang-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{t('profile.selectLanguage')}</h3>
                <button className="modal-close" onClick={() => setIsLangModalOpen(false)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="modal-body lang-modal-options">
                {Object.entries(languageLabels).map(([code, label]) => (
                  <button
                    key={code}
                    className={`lang-option-btn ${language === code ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(code);
                      setIsLangModalOpen(false);
                    }}
                  >
                    <span className="lang-label">{label}</span>
                    {language === code && (
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isSupportModalOpen && (
          <div className="modal-overlay profile-support-overlay" onClick={() => setIsSupportModalOpen(false)}>
            <div className="modal-content profile-support-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#00d4ff" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('profile.supportTitle', 'Աջակցություն և կապ')}</h3>
                </div>
                <button className="modal-close" onClick={() => setIsSupportModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="modal-body support-modal-body">
                <p className="support-modal-desc">
                  {t('support.desc', 'Ունե՞ք հարցեր, առաջարկություններ կամ նկատել եք խնդիր։ Կապվեք մեզ հետ։')}
                </p>

                <div className="support-quick-actions">
                  <a href="https://t.me/worship_platform_bot" target="_blank" rel="noopener noreferrer" className="support-quick-btn telegram-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                    <span>Telegram Բոտ (@worship_platform_bot)</span>
                  </a>

                  <a href="mailto:worship@pmstudio.am" className="support-quick-btn email-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Էլ․ փոստ (Email)</span>
                  </a>
                </div>

                <div className="support-divider">
                  <span>{t('support.orSendDirect', 'կամ ուղարկեք հաղորդագրություն ծրագրից')}</span>
                </div>

                {supportAlert.text && (
                  <div className={`support-alert ${supportAlert.type === 'err' ? 'alert-error' : 'alert-success'}`}>
                    {supportAlert.text}
                  </div>
                )}

                <form onSubmit={handleSendSupport} className="support-form">
                  <div className="form-group">
                    <label>{t('support.topicLabel', 'Թեմա')}</label>
                    <select value={supportTopic} onChange={e => setSupportTopic(e.target.value)} className="full-width-inp">
                      <option value="question">❓ Հարց կամ օգնություն</option>
                      <option value="feature">💡 Առաջարկություն</option>
                      <option value="bug">🛠 Սխալի մասին հայտնում</option>
                      <option value="other">💬 Այլ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{t('support.contactLabel', 'Ձեր կոնտակտը (Telegram / Email / Հեռախոս)` պատասխանի համար')}</label>
                    <input
                      type="text"
                      className="full-width-inp"
                      placeholder="@username կամ email..."
                      value={supportContact}
                      onChange={e => setSupportContact(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('support.messageLabel', 'Հաղորդագրություն')}</label>
                    <textarea
                      rows="4"
                      className="full-width-inp"
                      placeholder={t('support.messagePlaceholder', 'Նկարագրեք Ձեր հարցը կամ առաջարկությունը...')}
                      value={supportMessage}
                      onChange={e => setSupportMessage(e.target.value)}
                    ></textarea>
                  </div>

                  <button type="submit" className="support-submit-btn" disabled={supportSending}>
                    {supportSending ? t('common.sending', 'Ուղարկվում է...') : t('support.sendBtn', 'Ուղարկել')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // WEBSITE DESKTOP MODE — RICH PROFILE DASHBOARD
  return (
    <div className="profile-page web-profile-page">
      <div className="web-profile-container">
        
        {/* HERO BANNER CARD */}
        <div className="web-profile-hero">
          <div className="web-profile-hero-bg" />
          <div className="web-profile-hero-content">
            <div className="web-profile-avatar-wrapper">
              <div className="web-profile-avatar" style={{ background: avatarGradient, cursor: 'pointer' }} onClick={() => setIsRoleModalOpen(true)}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                <span className="profile-avatar-edit-icon">✏️</span>
              </div>
            </div>
            
            <div className="web-profile-meta">
              <div className="web-profile-name-row">
                <h2>{user.name}</h2>
                {user.username && user.username !== user.name && (
                  <span className="web-profile-tag">@{user.username}</span>
                )}
              </div>
              <p className="web-profile-email-line">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {user.email}
              </p>
              <div className="profile-role-badge-tag" onClick={() => setIsRoleModalOpen(true)}>
                {currentRoleObj ? (
                  <span>{currentRoleObj.icon} {roleLabel}</span>
                ) : (
                  <span>🎭 Ընտրել դերը թիմում</span>
                )}
                <span className="profile-role-edit-hint">⚙️</span>
              </div>
            </div>

            <div className="web-profile-hero-actions">
              <button className="web-profile-edit-btn" onClick={() => navigate('/settings')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                {t('profile.accountSettings', 'Կարգավորումներ')}
              </button>
            </div>
          </div>

          {/* QUICK STATS BAR */}
          <div className="web-profile-stats-bar">
            <div className="web-stat-item clickable" onClick={() => navigate('/favorites')}>
              <span className="web-stat-val">{favCount}</span>
              <span className="web-stat-lbl">{t('profile.savedSongs', 'Պահպանված երգեր')}</span>
            </div>
            <div className="web-stat-divider" />
            <div className="web-stat-item clickable" onClick={() => navigate('/setlists')}>
              <span className="web-stat-val">{setlistCount}</span>
              <span className="web-stat-lbl">{t('nav.setlists', 'Երգացանկեր')}</span>
            </div>
            <div className="web-stat-divider" />
            <div className="web-stat-item clickable" onClick={() => navigate('/friends')}>
              <span className="web-stat-val">{friendsCount}</span>
              <span className="web-stat-lbl">{t('nav.friends', 'Ընկերներ')}</span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="web-profile-tabs">
          <button className={`web-tab-btn ${webTab === 'workspace' ? 'active' : ''}`} onClick={() => setWebTab('workspace')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            {t('nav.resources', 'Աշխատանքային Տարածք')}
          </button>
          <button className={`web-tab-btn ${webTab === 'account' ? 'active' : ''}`} onClick={() => setWebTab('account')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            {t('settings.tabs.profile', 'Անձնական Տվյալներ')}
          </button>
          <button className={`web-tab-btn ${webTab === 'settings' ? 'active' : ''}`} onClick={() => setWebTab('settings')}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.1a2 2 0 0 1-1.41-.59l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2 18.59v-.1a2 2 0 0 1 .59-1.41l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.41 2h.1a2 2 0 0 1 1.41.59l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 5.41v.1a2 2 0 0 1-.59 1.41l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.39.66.6 1a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.82.33c-.21.34-.37.69-.6 1z"></path></svg>
            {t('profile.accountSettings', 'Կարգավորումներ')}
          </button>
        </div>

        {/* TAB CONTENTS */}
        {webTab === 'workspace' && (
          <div className="web-profile-grid">
            <div className="web-bento-card" onClick={() => navigate('/favorites')}>
              <div className="web-bento-icon icon-gold">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div className="web-bento-body">
                <h3>{t('profile.savedSongs', 'Պահպանված երգեր')}</h3>
                <p>{favCount} {t('songs.title', 'երգ պահպանված է Ձեր անձնական հավաքածուում։')}</p>
              </div>
              <div className="web-bento-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>

            <div className="web-bento-card" onClick={() => navigate('/setlists')}>
              <div className="web-bento-icon icon-cyan">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
              </div>
              <div className="web-bento-body">
                <h3>{t('nav.setlists', 'Երգացանկեր')}</h3>
                <p>{setlistCount} {t('dashboard.manageSetlists', 'երգացանկ պատրաստ է փորձերի և ծառայությունների համար։')}</p>
              </div>
              <div className="web-bento-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>

            <div className="web-bento-card" onClick={() => navigate('/friends')}>
              <div className="web-bento-icon icon-purple">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div className="web-bento-body">
                <h3>{t('nav.friends', 'Ընկերներ / Չաթ')}</h3>
                <p>{t('megaMenu.communityDesc', 'Կապ հաստատեք թիմի անդամների հետ և կիսվեք երգացանկերով։')}</p>
              </div>
              <div className="web-bento-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>

            <div className="web-bento-card" onClick={() => navigate('/settings?tab=requests')}>
              <div className="web-bento-icon icon-green">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div className="web-bento-body">
                <h3>{t('settings.requests.title', 'Իմ Հարցումները')}</h3>
                <p>{t('settings.requests.desc', 'Նոր երգերի ավելացման կամ առաջարկած խմբագրումների կարգավիճակը։')}</p>
              </div>
              <div className="web-bento-arrow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </div>
        )}

        {webTab === 'account' && (
          <div className="web-profile-section-card">
            <div className="web-section-header">
              <h3>{t('settings.profile.title', 'Անձնական տվյալներ')}</h3>
              <p>{t('settings.profile.desc', 'Խմբագրեք Ձեր հիմնական տվյալները։')}</p>
            </div>

            {saveMsg.text && (
              <div className={`web-profile-msg ${saveMsg.type === 'err' ? 'msg-err' : 'msg-ok'}`}>
                {saveMsg.text}
              </div>
            )}
            
            <div className="web-info-fields-grid">
              <div className="web-info-field">
                <label>{t('auth.fullName', 'Անուն Ազգանուն')}</label>
                <input 
                  type="text" 
                  className="web-field-input" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="Անուն Ազգանուն"
                />
              </div>
              <div className="web-info-field">
                <label>{t('auth.username', 'Մուտքանուն')}</label>
                <input 
                  type="text" 
                  className="web-field-input" 
                  value={editUsername} 
                  onChange={e => setEditUsername(e.target.value)} 
                  placeholder="Մուտքանուն"
                />
              </div>
              <div className="web-info-field">
                <label>{t('auth.email', 'Էլ. հասցե')}</label>
                <div className="web-field-val disabled">{user.email || '—'}</div>
              </div>
              <div className="web-info-field">
                <label>Օգտատիրոջ տեսակ</label>
                <div className="web-field-val text-gold">Worship Member</div>
              </div>
            </div>

            <div className="web-section-actions">
              <button className="web-primary-btn" onClick={handleSaveProfile} disabled={savingProfile}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                {savingProfile ? 'Պահպանվում է...' : 'Պահպանել'}
              </button>
              <button className="web-secondary-btn" onClick={() => navigate('/settings')}>
                {t('settings.security.changePassword', 'Փոխել գաղտնաբառը')}
              </button>
            </div>
          </div>
        )}

        {webTab === 'settings' && (
          <div className="web-profile-section-card">
            <div className="web-section-header">
              <h3>{t('profile.accountSettings', 'Կարգավորումներ')}</h3>
              <p>{t('settings.app.desc', 'Կարգավորեք ծրագրի արտաքին տեսքը և աշխատանքի պարամետրերը։')}</p>
            </div>

            <div className="web-settings-list">
              <div className="web-setting-row" onClick={() => setIsLangModalOpen(true)}>
                <div className="web-setting-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <div className="web-setting-info">
                  <h4>{t('profile.language', 'Լեզու')}</h4>
                  <p>{languageLabels[language]}</p>
                </div>
                <button className="web-inline-btn">{t('profile.selectLanguage', 'Ընտրել')}</button>
              </div>

              <div className="web-setting-row" onClick={() => navigate('/settings')}>
                <div className="web-setting-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.1a2 2 0 0 1-1.41-.59l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2 18.59v-.1a2 2 0 0 1 .59-1.41l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.41 2h.1a2 2 0 0 1 1.41.59l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 5.41v.1a2 2 0 0 1-.59 1.41l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.39.66.6 1a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.82.33c-.21.34-.37.69-.6 1z"></path></svg>
                </div>
                <div className="web-setting-info">
                  <h4>{t('settings.title', 'Ամբողջական Կարգավորումներ')}</h4>
                  <p>{t('settings.security.title', 'Անվտանգություն, Սեսիաներ, Ծրագրի ռեժիմներ')}</p>
                </div>
                <button className="web-inline-btn">{t('megaMenu.readArticle', 'Բացել')}</button>
              </div>
            </div>

            <div className="web-logout-wrapper">
              <button className="web-logout-btn" onClick={logout}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                {t('profile.logout', 'Դուրս գալ')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role & Avatar Modal */}
      {isRoleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRoleModalOpen(false)}>
          <div className="modal-content profile-role-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎭 Երկրպագության Թիմի Դեր & Ավատար</h3>
              <button className="modal-close" onClick={() => setIsRoleModalOpen(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body role-modal-body">
              <div className="role-modal-section">
                <h4>🎨 Ընտրեք Ձեր Գույնը</h4>
                <div className="avatar-gradients-grid">
                  {AVATAR_GRADIENTS.map((grad, i) => (
                    <button
                      key={i}
                      className={`gradient-swatch ${avatarGradient === grad ? 'active' : ''}`}
                      style={{ background: grad }}
                      onClick={() => saveRoleAndGradient(teamRole, grad)}
                    >
                      {avatarGradient === grad && <span className="swatch-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="role-modal-section">
                <h4>📖 Ընտրեք Ձեր Պաշտոնը</h4>
                <div className="roles-grid">
                  {WORSHIP_ROLES.map(r => (
                    <button
                      key={r.id}
                      className={`role-option-card ${teamRole === r.id ? 'active' : ''}`}
                      onClick={() => saveRoleAndGradient(teamRole === r.id ? null : r.id, avatarGradient)}
                    >
                      <span className="role-icon">{r.icon}</span>
                      <span className="role-name">{r.label[language] || r.label['am']}</span>
                      {teamRole === r.id && <span className="role-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button className="role-modal-save-btn" onClick={() => setIsRoleModalOpen(false)}>
                Պահպանել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {isLangModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLangModalOpen(false)}>
          <div className="modal-content profile-lang-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('profile.selectLanguage')}</h3>
              <button className="modal-close" onClick={() => setIsLangModalOpen(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body lang-modal-options">
              {Object.entries(languageLabels).map(([code, label]) => (
                <button
                  key={code}
                  className={`lang-option-btn ${language === code ? 'active' : ''}`}
                  onClick={() => {
                    setLanguage(code);
                    setIsLangModalOpen(false);
                  }}
                >
                  <span className="lang-label">{label}</span>
                  {language === code && (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
