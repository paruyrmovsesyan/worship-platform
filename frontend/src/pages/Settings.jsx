import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useIsPWA } from '../hooks/useIsPWA';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getLocalizedTitle } from '../utils/titleParser';
import './Settings.css';

export default function Settings() {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isPWA = useIsPWA();
  const isMobile = useMediaQuery('(max-width: 900px)');

  const [activeTab, setActiveTab] = useState(isMobile ? null : 'profile');
  const [msg, setMsg] = useState({ text: '', type: '' });

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

  // Requests States
  const [requests, setRequests] = useState([]);

  // Danger States
  const [delPass, setDelPass] = useState('');
  const [showDelModal, setShowDelModal] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchEmailStatus();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  // Adjust active tab when switching between mobile/desktop resize
  useEffect(() => {
    if (!isMobile && !activeTab) {
      setActiveTab('profile');
    }
  }, [isMobile]);

  const showMsg = (text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  // --- API Calls ---
  const fetchEmailStatus = async () => {
    try {
      const res = await fetch('/account_api.php?action=email_status');
      const data = await res.json();
      if (data.ok) setEmailStatus(data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/account_api.php?action=get_active_sessions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else if (data.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
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
  };

  // --- Handlers ---
  const handleSaveProfile = async () => {
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
      const res = await fetch('/account_api.php?action=update_email', {
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
      const res = await fetch('/account_api.php?action=send_verify', { method: 'POST' });
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
      const res = await fetch('/account_api.php?action=update_password', {
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

  if (!user) return null;

  // Render Functions
  const renderSidebar = () => {
    const menuItems = [
      { id: 'profile', label: t('settings.tabs.profile'), icon: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
      { id: 'security', label: t('settings.tabs.security'), icon: <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
      { id: 'sessions', label: t('settings.tabs.sessions'), icon: <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> },
      { id: 'requests', label: t('settings.tabs.requests'), icon: <svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> },
      { id: 'danger', label: t('settings.tabs.danger'), icon: <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>, isDanger: true }
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
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="" />
              </div>

            <div className="form-group">
              <label>{t('settings.profile.birthDate')}</label>
              <input type="date" className="full-width-inp" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label>{t('settings.profile.gender')}</label>
              <select className="full-width-inp" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">...</option>
                <option value="male">{t('settings.profile.genderMale')}</option>
                <option value="female">{t('settings.profile.genderFemale')}</option>
                <option value="other">{t('settings.profile.genderOther')}</option>
                <option value="prefer_not_to_say">...</option>
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

  return (
    <div className={`settings-page ${isPWA ? 'pwa-mode' : ''}`}>
      
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
