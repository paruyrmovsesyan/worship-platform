import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

export default function Settings() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Profile States
  const [name, setName] = useState(user?.name || '');
  
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

  const showMsg = (text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  // --- API Calls ---
  const fetchEmailStatus = async () => {
    try {
      const res = await fetch('/account_api.php?action=email_status');
      const data = await res.json();
      if (res.ok) {
        setEmailStatus(data);
        if (!newEmail && !data.pending) setNewEmail(data.email);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/account_api.php?action=get_active_sessions');
      const data = await res.json();
      if (res.ok) setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/account_api.php?action=get_my_song_requests');
      const data = await res.json();
      if (res.ok) setRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Actions ---
  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/account_api.php?action=update_profile', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.ok) showMsg(t('settings.profile_saved', 'Պրոֆիլը պահպանվեց'));
      else showMsg(data.error || 'Error', 'err');
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const res = await fetch('/account_api.php?action=update_email_only', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.email_updated', 'Էլ․ փոստը թարմացվեց, խնդրում ենք հաստատել։'));
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
      if (data.ok) showMsg(t('settings.verify_sent', 'Հաստատման նամակն ուղարկված է։ Ստուգեք Ձեր էլ. փոստը։'));
      else showMsg(data.error || 'Error', 'err');
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleChangePass = async () => {
    try {
      const res = await fetch('/account_api.php?action=change_password', {
        method: 'POST',
        body: JSON.stringify({ current_password: curPass, new_password: newPass })
      });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.pass_changed', 'Գաղտնաբառը փոխվեց'));
        setCurPass('');
        setNewPass('');
      } else {
        showMsg(data.error || 'Error', 'err');
      }
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleForgotPass = async () => {
    try {
      const res = await fetch('/account_api.php?action=forgot_password_email', { method: 'POST' });
      const data = await res.json();
      if (data.ok) showMsg(t('settings.reset_sent', 'Գաղտնաբառի վերականգնման նամակն ուղարկվեց։'));
      else showMsg(data.error || 'Error', 'err');
    } catch (e) {
      showMsg('Network error', 'err');
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      const res = await fetch('/account_api.php?action=delete_session', {
        method: 'POST',
        body: JSON.stringify({ session_id: id })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.logged_out) logout();
        else fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseOtherSessions = async () => {
    try {
      const res = await fetch('/account_api.php?action=delete_other_sessions', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showMsg(t('settings.others_closed', 'Մյուս բոլոր սեսիաները փակվեցին։'));
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/account_api.php?action=delete_account', {
        method: 'POST',
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

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>{t('Settings', 'Կարգավորումներ')}</h2>
        <p>{t('Manage your account preferences and security.', 'Կառավարեք Ձեր հաշվի անվտանգությունն ու կարգավորումները։')}</p>
      </div>

      {msg.text && (
        <div className={`settings-msg ${msg.type === 'err' ? 'msg-error' : 'msg-success'}`}>
          {msg.text}
        </div>
      )}

      <div className="settings-tabs">
        <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Պրոֆիլ</button>
        <button className={activeTab === 'email' ? 'active' : ''} onClick={() => setActiveTab('email')}>Էլ․ փոստ</button>
        <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>Անվտանգություն</button>
        <button className={activeTab === 'sessions' ? 'active' : ''} onClick={() => setActiveTab('sessions')}>Սեսիաներ</button>
        <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>Հարցումներ</button>
        <button className={activeTab === 'danger' ? 'active danger-tab' : 'danger-tab'} onClick={() => setActiveTab('danger')}>Վտանգավոր</button>
      </div>

      <div className="settings-content">
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="settings-card">
            <h3>Անձնական տվյալներ</h3>
            <div className="form-group">
              <label>Անուն</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Քո անունը" />
            </div>
            <button className="settings-btn" onClick={handleSaveProfile}>Պահպանել</button>
          </div>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <div className="settings-card">
            <h3>Էլ․ փոստի հաստատում</h3>
            <div className="email-status-box">
              <div className="status-info">
                <span>Վիճակ՝</span>
                {emailStatus.verified ? (
                  <span className="badge badge-success">Հաստատված է</span>
                ) : (
                  <span className="badge badge-warning">Հաստատված չէ</span>
                )}
              </div>
              {emailStatus.pending && (
                <div className="status-info mt-2">
                  <span>Սպասող՝</span>
                  <span className="text-muted">{emailStatus.pending_email}</span>
                </div>
              )}
            </div>

            <div className="form-group mt-3">
              <label>Նոր էլ․ փոստ</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@example.com" />
            </div>

            <div className="btn-row">
              <button className="settings-btn secondary" onClick={handleUpdateEmail}>Փոխել էլ․ փոստը</button>
              <button className="settings-btn" onClick={handleSendVerify}>Ուղարկել հաստատման նամակ</button>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="settings-card">
            <h3>Անվտանգություն</h3>
            
            <div className="form-group">
              <label>Ներկայիս գաղտնաբառ</label>
              <div className="inp-icon-wrap">
                <input type={showCurPass ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="••••••••" />
                <button className="eye-btn" onClick={() => setShowCurPass(!showCurPass)}>👁</button>
              </div>
            </div>

            <div className="form-group">
              <label>Նոր գաղտնաբառ</label>
              <div className="inp-icon-wrap">
                <input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" />
                <button className="eye-btn" onClick={() => setShowNewPass(!showNewPass)}>👁</button>
              </div>
            </div>

            <div className="btn-row">
              <button className="settings-btn" onClick={handleChangePass}>Փոխել գաղտնաբառը</button>
              <button className="settings-btn secondary" onClick={handleForgotPass}>Մոռացել եմ գաղտնաբառը</button>
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="settings-card">
            <div className="card-header-flex">
              <h3>Ակտիվ սեսիաներ</h3>
              <button className="settings-btn secondary small" onClick={handleCloseOtherSessions}>Փակել մյուսները</button>
            </div>
            <p className="text-muted">Այստեղ երևում են սարքերը, որտեղ բացված է քո հաշիվը։</p>
            
            <div className="sessions-list">
              {sessions.map(s => (
                <div key={s.id} className="session-item">
                  <div className="session-info">
                    <strong>{s.device_name || s.browser || 'Unknown Device'}</strong>
                    <div className="session-meta">
                      {s.platform && <span>{s.platform}</span>}
                      <span>{s.ip_address}</span>
                      <span>{new Date(s.last_used_at || s.created_at).toLocaleString()}</span>
                    </div>
                    {s.is_current && <span className="badge badge-success mt-1">Ընթացիկ սարք</span>}
                  </div>
                  <button className="settings-btn danger outline small" onClick={() => handleDeleteSession(s.id)}>Դուրս գալ</button>
                </div>
              ))}
              {sessions.length === 0 && <p>No sessions found.</p>}
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="settings-card">
            <h3>Իմ ուղարկած հարցումները</h3>
            <p className="text-muted">Նոր երգերի կամ խմբագրումների հարցումների կարգավիճակը։</p>
            <div className="requests-list mt-3">
              {requests.map(r => (
                <div key={r.id} className="request-item">
                  <div className="req-header">
                    <strong>{r.title}</strong>
                    <span className={`badge req-${r.status}`}>{r.status_label}</span>
                  </div>
                  <div className="req-meta">
                    Տեսակը՝ {r.request_type_label} <br/>
                    Ամսաթիվ՝ {new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.review_note && (
                    <div className="req-note">
                      <strong>Ադմինի նշում.</strong> {r.review_note}
                    </div>
                  )}
                </div>
              ))}
              {requests.length === 0 && <p className="text-muted">Դուք դեռ չունեք ուղարկված հարցումներ։</p>}
            </div>
          </div>
        )}

        {/* DANGER TAB */}
        {activeTab === 'danger' && (
          <div className="settings-card danger-card">
            <h3 style={{color: '#ff453a'}}>Վտանգավոր գործողություն</h3>
            <p className="text-muted">Օգտահաշվի ջնջումը անշրջելի է։ Կկորչեն պահպանած երգերը և ամբողջ տվյալները։</p>
            
            <button className="settings-btn danger mt-3" onClick={() => setShowDelModal(true)}>Ջնջել օգտահաշիվը</button>
          </div>
        )}

      </div>

      {/* Delete Modal */}
      {showDelModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{color: '#ff453a', marginTop: 0}}>Հաստատում</h3>
            <p>Սա վերջնականապես կջնջի քո օգտահաշիվը։ Շարունակելու համար գրիր գաղտնաբառը։</p>
            
            <input type="password" value={delPass} onChange={e => setDelPass(e.target.value)} placeholder="••••••••" className="full-width-inp" />
            
            <div className="btn-row mt-3" style={{justifyContent: 'flex-end'}}>
              <button className="settings-btn secondary" onClick={() => setShowDelModal(false)}>Չեղարկել</button>
              <button className="settings-btn danger" onClick={handleDeleteAccount}>Ջնջել վերջնականապես</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
