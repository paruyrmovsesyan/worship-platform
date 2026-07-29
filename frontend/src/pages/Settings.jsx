import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useIsPWA } from '../hooks/useIsPWA';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getLocalizedTitle } from '../utils/titleParser';
import { APP_THEMES, applyAppTheme, getStoredAppTheme } from '../utils/appTheme';
import './Settings.css';

const hasWhitespace = (value) => /\s/u.test(String(value));
const APP_INFO_CACHE_KEY = 'wp_cached_app_info';
const APP_VERSION_FALLBACK = '2.6.9';
const DEFAULT_ABOUT_LICENSES = [
  { name: 'React / React DOM', license: 'MIT License' },
  { name: 'React Router', license: 'MIT License' },
];

function getCachedAppInfo() {
  const fallback = {
    version: localStorage.getItem('wp_seen_app_version') || APP_VERSION_FALLBACK,
    releaseType: '',
    summary: '',
    updatedAt: '',
    about: null,
  };

  try {
    const cached = JSON.parse(localStorage.getItem(APP_INFO_CACHE_KEY) || 'null');
    return cached && typeof cached === 'object' ? { ...fallback, ...cached } : fallback;
  } catch {
    return fallback;
  }
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const isPWA = useIsPWA();
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [activeTab, setActiveTab] = useState(() => {
    if (!user) return 'app';
    return isMobile ? null : 'profile';
  });
  const [msg, setMsg] = useState({ text: '', type: '' });

  // App Settings States
  const [appTheme, setAppTheme] = useState(getStoredAppTheme);
  const [keepAwake, setKeepAwake] = useState(localStorage.getItem('keepAwake') === 'true');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('reduceMotion') === 'true');
  const [oledMode, setOledMode] = useState(localStorage.getItem('oledMode') === 'true');
  const [chordColor, setChordColor] = useState(localStorage.getItem('chordColor') || 'gold');
  const [outlinedChords, setOutlinedChords] = useState(localStorage.getItem('outlinedChords') === 'true');
  const [appInfo, setAppInfo] = useState(getCachedAppInfo);

  // Profile States
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  
  // Email States
  const [emailStatus, setEmailStatus] = useState({ email: '', pending_email: '', verified: false, pending: false });
  const [newEmail, setNewEmail] = useState('');

  // Password States
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Sessions States
  const [sessions, setSessions] = useState([]);
  const [rememberBusy, setRememberBusy] = useState(false);

  // Requests States
  const [requests, setRequests] = useState([]);

  // Danger States
  const [delPass, setDelPass] = useState('');
  const [showDelModal, setShowDelModal] = useState(false);

  const showMsg = useCallback((text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  }, []);

  // --- API Calls ---
  const fetchEmailStatus = useCallback(async () => {
    try {
      const res = await fetch('/account_api.php?action=email_status');
      const data = await res.json();
      if (data.ok) setEmailStatus(data.status);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const source = isPWA ? 'pwa' : 'web';
      const res = await fetch(`/account_api.php?action=get_active_sessions&source=${encodeURIComponent(source)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else if (data.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isPWA]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/account_api.php?action=get_my_song_requests');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data.ok && data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchEmailStatus();
    }
  }, [user, fetchEmailStatus]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab, fetchSessions, fetchRequests]);

  useEffect(() => {
    if (!isPWA || activeTab !== 'about') return;

    let cancelled = false;
    fetch('/version_manifest.php', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error('version_manifest');
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const nextInfo = {
          version: data.app_version || APP_VERSION_FALLBACK,
          releaseType: data.app_release_type || '',
          summary: data.app_release_summary || '',
          updatedAt: data.updated_at || '',
          about: data.app_about && typeof data.app_about === 'object' ? data.app_about : null,
        };
        setAppInfo(nextInfo);
        localStorage.setItem(APP_INFO_CACHE_KEY, JSON.stringify(nextInfo));
      })
      .catch(() => {
        // Keep the last cached app information available offline.
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, isPWA]);

  // Adjust active tab when switching between mobile/desktop resize
  useEffect(() => {
    if (!isMobile && !activeTab) {
      setActiveTab('profile');
    }
  }, [isMobile, activeTab]);

  // --- Handlers ---
  const handleAppThemeChange = (nextTheme) => {
    if (nextTheme === appTheme) return;

    setAppTheme(nextTheme);
    if (nextTheme === APP_THEMES.LIGHT) {
      setOledMode(false);
      localStorage.setItem('oledMode', 'false');
      if (chordColor === 'white') {
        setChordColor('gold');
        localStorage.setItem('chordColor', 'gold');
        document.body.classList.remove('chord-color-white');
      }
    } else {
      if (chordColor === 'black') {
        setChordColor('gold');
        localStorage.setItem('chordColor', 'gold');
        document.body.classList.remove('chord-color-black');
      }
    }
    applyAppTheme(nextTheme);
    showMsg(t('settings.app.saved', 'Պահպանված է'));
  };

  const aboutLanguage = language === 'am' ? 'hy' : language;
  const aboutConfig = appInfo.about && typeof appInfo.about === 'object' ? appInfo.about : {};
  const aboutTagline = aboutConfig.tagline?.[aboutLanguage]
    || aboutConfig.tagline?.hy
    || t('settings.about.tagline');
  const aboutLicenseText = aboutConfig.license_text?.[aboutLanguage]
    || aboutConfig.license_text?.hy
    || t('settings.about.licenseText');
  const aboutLicenses = Array.isArray(aboutConfig.licenses) && aboutConfig.licenses.length
    ? aboutConfig.licenses
    : DEFAULT_ABOUT_LICENSES;
  const openAboutLink = (url, fallback) => {
    const destination = typeof url === 'string' && url.trim() ? url.trim() : fallback;
    if (destination.startsWith('/') && !destination.startsWith('//')) {
      navigate(destination);
      return;
    }
    window.location.assign(destination);
  };

  const handleSaveProfile = async () => {
    if (username.trim() && hasWhitespace(username)) {
      showMsg(t('auth.invalidUsernameSpaces'), 'err');
      return;
    }

    try {
      const res = await fetch('/account_api.php?action=update_profile', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ 
          name,
          username,
          birth_date: birthDate,
          gender,
          phone_number: phoneNumber
        })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.profile.success'));
        // If we had a context update function, we'd call it here
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const res = await fetch('/account_api.php?action=update_email_only', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.security.emailSent')); // Email sent to verify new email
        setNewEmail('');
        fetchEmailStatus();
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleSendVerify = async () => {
    try {
      const res = await fetch('/account_api.php?action=send_verify_email', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.security.emailSent'));
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleChangePass = async () => {
    try {
      const res = await fetch('/account_api.php?action=change_password', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ current_password: curPass, new_password: newPass })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.security.passChanged'));
        setCurPass('');
        setNewPass('');
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleForgotPass = () => {
    navigate('/login?action=forgot');
  };

  const handleDeleteSession = async (id) => {
    try {
      const res = await fetch('/account_api.php?action=delete_session', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ session_id: id })
      });
      const data = await res.json();
      if (data.ok) fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseOtherSessions = async () => {
    try {
      const res = await fetch('/account_api.php?action=delete_other_sessions', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.sessions.closeOther')); // Just say close other
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentSession = sessions.find(s => s.is_current) || null;
  const rememberEnabled = Boolean(currentSession?.remembered);

  const handleToggleRemember = async () => {
    setRememberBusy(true);
    try {
      const action = rememberEnabled ? 'disable_remember_me' : 'enable_remember_me';
      const res = await fetch(`/account_api.php?action=${action}`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ source: isPWA ? 'pwa' : 'web' })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(rememberEnabled ? t('settings.sessions.rememberUpdatedOff') : t('settings.sessions.rememberUpdatedOn'));
        fetchSessions();
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    } finally {
      setRememberBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!delPass) return showMsg('Password required', 'err');
    try {
      const res = await fetch('/account_api.php?action=delete_account', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password: delPass })
      });
      const data = await res.json();
      if (data.ok) {
        logout();
      } else {
        showMsg(data.error || 'Error', 'err');
        setShowDelModal(false);
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  // Render Functions
  const renderSidebar = () => {
    const menuItems = [
      { id: 'app', label: t('settings.tabs.app', 'Ծրագրի կարգավորումներ'), icon: <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> },
      ...(isPWA ? [
        { id: 'about', label: t('settings.tabs.about'), icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> }
      ] : []),
      ...(user ? [
        { id: 'profile', label: t('settings.tabs.profile'), icon: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
        { id: 'security', label: t('settings.tabs.security'), icon: <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
        { id: 'sessions', label: t('settings.tabs.sessions'), icon: <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> },
        { id: 'requests', label: t('settings.tabs.requests'), icon: <svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> },
        { id: 'danger', label: t('settings.tabs.danger'), icon: <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>, isDanger: true }
      ] : [])
    ];

    return (
      <div className="settings-sidebar">
        <h2 className="settings-menu-title">{t('settings.title')}</h2>
        <div className="settings-menu-list">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              className={`settings-menu-item ${activeTab === item.id ? 'active' : ''} ${item.isDanger ? 'danger-item' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="menu-item-left">
                <div className="menu-icon">{item.icon}</div>
                <span>{item.label}</span>
              </div>
              <svg className="menu-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="settings-main-pane">
        {isMobile && activeTab && (
          <button className="settings-back-btn" onClick={() => setActiveTab(null)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            {t('auth.back')}
          </button>
        )}

        {!user && (
          <div className="settings-card mb-4" style={{ background: 'linear-gradient(135deg, rgba(58, 45, 255, 0.12), rgba(0, 212, 255, 0.08))', border: '1px solid rgba(58, 45, 255, 0.25)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{t('auth.notLoggedInTitle', 'Դուք մուտք չեք գործել')}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{t('auth.notLoggedInDesc', 'Մուտք գործեք՝ պրոֆիլը, երգացանկերը և ֆավորիտները կառավարելու համար:')}</p>
              </div>
              <button className="btn btn-primary" style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.9rem' }} onClick={() => navigate('/loginuser.php')}>
                {t('auth.login', 'Մուտք')}
              </button>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="settings-sections fade-in">
            <div className="settings-card mb-4" style={{ marginBottom: '1.5rem' }}>
              <h3>{t('settings.profile.title')}</h3>
              <div className="form-group">
                <label>{t('settings.profile.name')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="" />
              </div>

              <div className="form-group">
                <label>{t('auth.username') || 'Username'}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="" pattern="[^\s]+" />
              </div>

            <div className="form-group">
              <label>{t('settings.profile.birthDate')}</label>
              <input type="date" className="full-width-inp" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label>{t('settings.profile.gender')}</label>
              <select className="full-width-inp" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">...</option>
                <option value="male">{t('settings.profile.genderMale', 'Արական')}</option>
                <option value="female">{t('settings.profile.genderFemale', 'Իգական')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('settings.profile.phone')}</label>
              <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+374..." />
            </div>

            <button className="settings-btn" onClick={handleSaveProfile}>{t('settings.profile.save')}</button>
            </div>

            <div className="settings-card">
              <h3>{t('settings.security.title')}</h3>
              <div className="email-status-box">
              <div className="status-info">
                <span>Email:</span> <strong>{user?.email}</strong>
              </div>
              <div className="status-info mt-1">
                <span>{t('settings.security.emailStatus')}:</span>
                {emailStatus.verified ? (
                  <span className="badge badge-success">{t('settings.security.verified')}</span>
                ) : (
                  <span className="badge badge-warning">{t('settings.security.unverified')}</span>
                )}
              </div>
              {emailStatus.pending && (
                <div className="status-info mt-2">
                  <span>Pending:</span>
                  <span className="text-muted">{emailStatus.pending_email}</span>
                </div>
              )}
            </div>

            <div className="form-group mt-3">
              <label>{t('settings.security.newEmail')}</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@example.com" />
            </div>

            <div className="btn-row">
              <button className="settings-btn secondary" onClick={handleUpdateEmail}>{t('settings.security.changeEmail')}</button>
              {!emailStatus.verified && (
                <button className="settings-btn" onClick={handleSendVerify}>{t('settings.security.sendVerify')}</button>
              )}
            </div>
            </div>
          </div>
        )}

        {/* APP TAB */}
        {activeTab === 'app' && (
          <div className="settings-sections fade-in">
            <div className="settings-card">
              <div className="card-header-flex" style={{ marginBottom: '1rem' }}>
                <h3>{t('settings.tabs.app', 'Ծրագրի կարգավորումներ')}</h3>
                <span className="menu-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></span>
              </div>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                {t('settings.app.desc', 'Կարգավորեք ծրագրի արտաքին տեսքը և աշխատանքի պարամետրերը:')}
              </p>

              <div className="app-theme-setting" style={{ marginBottom: '1.5rem' }}>
                <div className="app-theme-copy">
                  <strong>{t('settings.app.themeMode', 'Գունային ռեժիմ')}</strong>
                  <p className="text-muted">
                    {t('settings.app.themeModeDesc', 'Ընտրեք ծրագրի բաց կամ մութ տեսքը։')}
                  </p>
                </div>
                <div className="app-theme-segmented" role="radiogroup" aria-label={t('settings.app.themeMode', 'Գունային ռեժիմ')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={appTheme === APP_THEMES.DARK}
                    className={appTheme === APP_THEMES.DARK ? 'active' : ''}
                    onClick={() => handleAppThemeChange(APP_THEMES.DARK)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.8 6.8 0 0 0 21 12.8Z" /></svg>
                    <span>{t('settings.app.darkTheme', 'Մութ')}</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={appTheme === APP_THEMES.LIGHT}
                    className={appTheme === APP_THEMES.LIGHT ? 'active' : ''}
                    onClick={() => handleAppThemeChange(APP_THEMES.LIGHT)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>
                    <span>{t('settings.app.lightTheme', 'Բաց')}</span>
                  </button>
                </div>
              </div>

              <div className="remember-device-card" style={{ marginBottom: '1.5rem' }}>
                <div className="remember-device-copy">
                  <div className="remember-device-title-row">
                    <strong>{t('settings.app.keepAwake', 'Միշտ արթուն էկրան')}</strong>
                    <span className={`badge ${keepAwake ? 'badge-success' : 'badge-warning'}`}>
                      {keepAwake ? t('settings.app.enabled', 'Միացված է') : t('settings.app.disabled', 'Անջատված է')}
                    </span>
                  </div>
                  <p className="text-muted">
                    {t('settings.app.keepAwakeDesc', 'Երգերի բառերը կարդալիս էկրանը չի անջատվի։')}
                  </p>
                </div>
                <button
                  className="settings-btn secondary small"
                  onClick={() => {
                    const newVal = !keepAwake;
                    setKeepAwake(newVal);
                    localStorage.setItem('keepAwake', newVal ? 'true' : 'false');
                    showMsg(t('settings.app.saved', 'Պահպանված է'));
                  }}
                >
                  {keepAwake ? t('settings.app.disable', 'Անջատել') : t('settings.app.enable', 'Միացնել')}
                </button>
              </div>

              <div className="remember-device-card" style={{ marginBottom: '1.5rem' }}>
                <div className="remember-device-copy">
                  <div className="remember-device-title-row">
                    <strong>{t('settings.app.reduceMotion', 'Պարզեցված անիմացիաներ')}</strong>
                    <span className={`badge ${reduceMotion ? 'badge-success' : 'badge-warning'}`}>
                      {reduceMotion ? t('settings.app.enabled', 'Միացված է') : t('settings.app.disabled', 'Անջատված է')}
                    </span>
                  </div>
                  <p className="text-muted">
                    {t('settings.app.reduceMotionDesc', 'Անջատում է էջերի անցումների էֆեկտները ավելի արագ աշխատանքի համար։')}
                  </p>
                </div>
                <button
                  className="settings-btn secondary small"
                  onClick={() => {
                    const newVal = !reduceMotion;
                    setReduceMotion(newVal);
                    localStorage.setItem('reduceMotion', newVal ? 'true' : 'false');
                    document.body.classList.toggle('reduce-motion', newVal);
                    showMsg(t('settings.app.saved', 'Պահպանված է'));
                  }}
                >
                  {reduceMotion ? t('settings.app.disable', 'Անջատել') : t('settings.app.enable', 'Միացնել')}
                </button>
              </div>

              <div className="remember-device-card" style={{ marginBottom: '1.5rem' }}>
                <div className="remember-device-copy">
                  <div className="remember-device-title-row">
                    <strong>{t('settings.app.oledMode', 'OLED Մութ ռեժիմ (Իրական սև)')}</strong>
                    <span className={`badge ${oledMode ? 'badge-success' : 'badge-warning'}`}>
                      {oledMode ? t('settings.app.enabled', 'Միացված է') : t('settings.app.disabled', 'Անջատված է')}
                    </span>
                  </div>
                  <p className="text-muted">
                    {t('settings.app.oledModeDesc', 'Օգտագործում է բացարձակ սև գույնը (OLED էկրանների համար՝ մարտկոց խնայելու նպատակով)։')}
                  </p>
                  {appTheme === APP_THEMES.LIGHT && (
                    <p className="oled-theme-note">{t('settings.app.oledDarkOnly', 'Հասանելի է միայն մութ ռեժիմում։')}</p>
                  )}
                </div>
                <button
                  className="settings-btn secondary small"
                  disabled={appTheme === APP_THEMES.LIGHT}
                  onClick={() => {
                    const newVal = !oledMode;
                    setOledMode(newVal);
                    localStorage.setItem('oledMode', newVal ? 'true' : 'false');
                    document.body.classList.toggle('oled-mode', newVal);
                    window.dispatchEvent(new CustomEvent('wp-theme-change'));
                    showMsg(t('settings.app.saved', 'Պահպանված է'));
                  }}
                >
                  {oledMode ? t('settings.app.disable', 'Անջատել') : t('settings.app.enable', 'Միացնել')}
                </button>
              </div>

              <div className="remember-device-card" style={{ marginBottom: '1.5rem' }}>
                <div className="remember-device-copy">
                  <div className="remember-device-title-row">
                    <strong>{t('settings.app.outlinedChords', 'Շրջանակված ակորդներ')}</strong>
                    <span className={`badge ${outlinedChords ? 'badge-success' : 'badge-warning'}`}>
                      {outlinedChords ? t('settings.app.enabled', 'Միացված է') : t('settings.app.disabled', 'Անջատված է')}
                    </span>
                  </div>
                  <p className="text-muted">
                    {t('settings.app.outlinedChordsDesc', 'Ակորդները ցուցադրվում են որպես առանձին կոճակներ՝ ավելի հեշտ կարդալու համար։')}
                  </p>
                </div>
                <button
                  className="settings-btn secondary small"
                  onClick={() => {
                    const newVal = !outlinedChords;
                    setOutlinedChords(newVal);
                    localStorage.setItem('outlinedChords', newVal ? 'true' : 'false');
                    document.body.classList.toggle('outlined-chords', newVal);
                    showMsg(t('settings.app.saved', 'Պահպանված է'));
                  }}
                >
                  {outlinedChords ? t('settings.app.disable', 'Անջատել') : t('settings.app.enable', 'Միացնել')}
                </button>
              </div>

              <div className="form-group" style={{ padding: '0 10px', marginBottom: '20px' }}>
                <label style={{ fontWeight: '600', marginBottom: '10px', display: 'block' }}>{t('settings.app.chordColor', 'Ակորդների գույն')}</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(() => {
                    const isLightMode = document.body.classList.contains('light-mode') || appTheme === APP_THEMES.LIGHT;
                    return [
                      { id: 'gold', label: t('settings.app.colorGold', 'Ոսկեգույն'), color: '#3A2DFF' },
                      { id: 'blue', label: t('settings.app.colorBlue', 'Կապույտ'), color: '#00D4FF' },
                      { id: 'green', label: t('settings.app.colorGreen', 'Կանաչ'), color: '#4ADE80' },
                      { id: 'red', label: t('settings.app.colorRed', 'Կարմիր'), color: '#FF4A4A' },
                      !isLightMode && { id: 'white', label: t('settings.app.colorWhite', 'Սպիտակ'), color: '#FFFFFF', border: '1px solid #d1d5db' },
                      isLightMode && { id: 'black', label: t('settings.app.colorBlack', 'Սև'), color: '#000000', border: '1px solid #4b5563' }
                    ].filter(Boolean);
                  })().map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`settings-btn ${chordColor === c.id ? '' : 'secondary'}`}
                      style={{ padding: '6px 12px' }}
                      onClick={() => {
                        const oldC = chordColor;
                        setChordColor(c.id);
                        localStorage.setItem('chordColor', c.id);
                        if (oldC && oldC !== 'gold') document.body.classList.remove(`chord-color-${oldC}`);
                        if (c.id !== 'gold') document.body.classList.add(`chord-color-${c.id}`);
                        showMsg(t('settings.app.saved', 'Պահպանված է'));
                      }}
                    >
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color, marginRight: '6px', verticalAlign: 'middle', border: c.border || 'none' }}></span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ABOUT APP TAB — PWA only */}
        {isPWA && activeTab === 'about' && (
          <div className="settings-sections fade-in about-app-section">
            <div className="settings-card about-app-card">
              <div className="about-app-identity">
                <img src="/user_uploaded_logo.png" alt="" className="about-app-logo" />
                <div>
                  <h3>Worship Platform</h3>
                  <p>{aboutTagline}</p>
                </div>
              </div>

              <div className="about-version-block">
                <span>{t('settings.about.version')}</span>
                <strong>{appInfo.version || APP_VERSION_FALLBACK}</strong>
              </div>

              <div className="about-info-list">
                <div className="about-info-row">
                  <span>{t('settings.about.status')}</span>
                  <strong style={{ color: appInfo.maintenanceActive ? '#ff453a' : appInfo.scheduledMaintenanceActive ? '#ff9500' : '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: appInfo.maintenanceActive ? '#ff453a' : appInfo.scheduledMaintenanceActive ? '#ff9500' : '#4ade80', boxShadow: appInfo.maintenanceActive ? '0 0 8px rgba(255, 69, 58, 0.6)' : appInfo.scheduledMaintenanceActive ? '0 0 8px rgba(255, 149, 0, 0.6)' : '0 0 8px rgba(74, 222, 128, 0.6)' }}></span>
                    {appInfo.maintenanceActive
                      ? t('settings.about.statusMaintenance')
                      : appInfo.scheduledMaintenanceActive
                        ? t('settings.about.statusScheduled')
                        : t('settings.about.statusActive')}
                  </strong>
                </div>
                <div className="about-info-row">
                  <span>{t('settings.about.platform')}</span>
                  <strong>PWA</strong>
                </div>
                <div className="about-info-row">
                  <span>{t('settings.about.offline')}</span>
                  <strong>{t('settings.about.available')}</strong>
                </div>
                {appInfo.releaseType && (
                  <div className="about-info-row">
                    <span>{t('settings.about.releaseType')}</span>
                    <strong>{t(`settings.about.releaseTypes.${appInfo.releaseType}`)}</strong>
                  </div>
                )}
                {appInfo.updatedAt && (
                  <div className="about-info-row">
                    <span>{t('settings.about.updated')}</span>
                    <strong>{new Date(appInfo.updatedAt).toLocaleDateString(language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US')}</strong>
                  </div>
                )}
              </div>

              {appInfo.summary && <p className="about-release-summary">{appInfo.summary}</p>}

              <div className="about-legal-section">
                <h4>{t('settings.about.licenseTitle')}</h4>
                <p>{aboutLicenseText}</p>
                <div className="about-license-list">
                  {aboutLicenses.map((item, index) => (
                    <div key={`${item.name || 'license'}-${index}`}>
                      <strong>{item.name}</strong>
                      <span>{item.license}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="about-link-row">
                <button type="button" onClick={() => openAboutLink(aboutConfig.privacy_url, '/privacy')}>{t('settings.about.privacy')}</button>
                <button type="button" onClick={() => openAboutLink(aboutConfig.terms_url, '/terms')}>{t('settings.about.terms')}</button>
                <button type="button" onClick={() => openAboutLink(aboutConfig.support_url, '/support')}>{t('settings.about.support')}</button>
              </div>

              <p className="about-copyright">
                © {aboutConfig.copyright_year || '2026'} {aboutConfig.owner || 'PM Studio'}. {t('settings.about.rights')}
              </p>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="settings-sections fade-in">
            <div className="settings-card">
              <div className="card-header-flex" style={{ marginBottom: '1rem' }}>
                <h3>{t('settings.security.changePassword')}</h3>
                <span className="menu-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></span>
              </div>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                {t('settings.security.desc')}
              </p>
              
              <div className="form-group">
                <label>{t('settings.security.oldPassword')}</label>
                <div className="inp-icon-wrap">
                  <input type={showCurPass ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="••••••••" />
                  <button className="eye-btn" onClick={() => setShowCurPass(!showCurPass)}>👁</button>
                </div>
              </div>

              <div className="form-group">
                <label>{t('settings.security.newPassword')}</label>
                <div className="inp-icon-wrap">
                  <input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" />
                  <button className="eye-btn" onClick={() => setShowNewPass(!showNewPass)}>👁</button>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: '2rem' }}>
                <button className="settings-btn" onClick={handleChangePass}>{t('settings.security.savePassword')}</button>
                <button className="settings-btn secondary" onClick={handleForgotPass}>{t('settings.security.forgotPassword')}</button>
              </div>
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="settings-sections fade-in">
            <div className="settings-card">
              <div className="card-header-flex" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="menu-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></span>
                  <h3 style={{ marginBottom: 0 }}>{t('settings.sessions.title')}</h3>
                </div>
                <button className="settings-btn secondary small" onClick={handleCloseOtherSessions}>{t('settings.sessions.closeOther')}</button>
              </div>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                {t('settings.sessions.desc')}
              </p>

              <div className="remember-device-card">
                <div className="remember-device-copy">
                  <div className="remember-device-title-row">
                    <strong>{t('settings.sessions.rememberTitle')}</strong>
                    <span className={`badge ${rememberEnabled ? 'badge-success' : 'badge-warning'}`}>
                      {rememberEnabled ? t('settings.sessions.rememberEnabled') : t('settings.sessions.rememberDisabled')}
                    </span>
                  </div>
                  <p className="text-muted">
                    {rememberEnabled ? t('settings.sessions.rememberDescOn') : t('settings.sessions.rememberDescOff')}
                  </p>
                </div>
                <button
                  className={`settings-btn ${rememberEnabled ? 'secondary' : ''}`}
                  onClick={handleToggleRemember}
                  disabled={rememberBusy}
                >
                  {rememberBusy
                    ? t('auth.pleaseWait')
                    : (rememberEnabled ? t('settings.sessions.rememberDisableBtn') : t('settings.sessions.rememberEnableBtn'))}
                </button>
              </div>
              
              <div className="sessions-list mt-3">
                {sessions.map(s => (
                  <div key={s.id} className="session-item">
                    <div className="session-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{s.device_name || s.browser || 'Unknown Device'}</strong>
                        {s.session_origin && s.session_origin !== 'unknown' && s.session_origin !== 'Անհայտ' && (
                          <span className="badge badge-info">{s.session_origin}</span>
                        )}
                      </div>
                      <div className="session-meta">
                        {s.platform && <span>{s.platform}</span>}
                        <span>{s.ip_address}</span>
                        <span>{new Date(s.last_used_at || s.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {s.is_current && <span className="badge badge-success">{t('settings.sessions.currentDevice')}</span>}
                        {s.remembered && <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>{t('settings.sessions.remembered')}</span>}
                      </div>
                    </div>
                    {!s.is_current && (
                      <button className="settings-btn danger outline small" onClick={() => handleDeleteSession(s.id)}>{t('settings.sessions.logout')}</button>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-muted">{t('settings.sessions.empty')}</p>}
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="settings-sections fade-in">
            <div className="settings-card">
              <div className="card-header-flex" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="menu-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg></span>
                  <h3 style={{ marginBottom: 0 }}>{t('settings.requests.title')}</h3>
                </div>
              </div>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                {t('settings.requests.desc')}
              </p>
              
              <div className="requests-list mt-3">
                {requests.map(r => (
                  <div key={r.id} className="request-item">
                    <div className="req-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>{getLocalizedTitle(r, language)}</strong>
                        {r.artist && <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{r.artist}</span>}
                      </div>
                      <span className={`badge req-${r.status}`} style={{ whiteSpace: 'nowrap', marginLeft: '1rem' }}>{r.status_label}</span>
                    </div>
                    
                    <div className="req-meta" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--color-accent-cyan)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                        {r.request_type === 'new' ? '🎵' : '✏️'} {r.request_type_label}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        🕒 {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {r.review_note && (
                      <div className="req-note" style={{ marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid var(--color-accent-cyan)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('settings.requests.adminNote')}</div>
                        <div style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.5' }}>{r.review_note}</div>
                      </div>
                    )}
                  </div>
                ))}
                {requests.length === 0 && <p className="text-muted">{t('settings.requests.empty')}</p>}
              </div>
            </div>
          </div>
        )}

        {/* DANGER TAB */}
        {activeTab === 'danger' && (
          <div className="settings-card danger-card fade-in">
            <h3 style={{color: '#ff453a'}}>{t('settings.danger.title')}</h3>
            <p className="text-muted">{t('settings.danger.desc')}</p>
            
            <button className="settings-btn danger mt-3" onClick={() => setShowDelModal(true)}>{t('settings.danger.deleteBtn')}</button>
          </div>
        )}
      </div>
    );
  };

  const pageClasses = [
    'settings-page',
    isPWA ? 'pwa-mode' : '',
    !activeTab ? 'settings-menu-screen' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={pageClasses}>
      
      {msg.text && (
        <div className={`settings-msg ${msg.type === 'err' ? 'msg-error' : 'msg-success'}`}>
          {msg.text}
        </div>
      )}

      <div className="settings-layout">
        {(!isMobile || !activeTab) && renderSidebar()}
        {(!isMobile || activeTab) && renderContent()}
      </div>

      {/* Delete Modal */}
      {showDelModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{color: '#ff453a', marginTop: 0}}>{t('settings.danger.modalTitle')}</h3>
            <p>{t('settings.danger.modalDesc')}</p>
            
            <input type="password" value={delPass} onChange={e => setDelPass(e.target.value)} placeholder="••••••••" className="full-width-inp mt-2" />
            
            <div className="btn-row mt-3" style={{justifyContent: 'flex-end'}}>
              <button className="settings-btn secondary" onClick={() => setShowDelModal(false)}>{t('settings.danger.cancel')}</button>
              <button className="settings-btn danger" onClick={handleDeleteAccount}>{t('settings.danger.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
