import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Songs.css';

export default function Setlists() {
  const [setlists, setSetlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  
  const [teams, setTeams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetTeamId, setNewSetTeamId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchSetlists = () => {
    fetch('/setlists_api.php?action=get_setlists')
      .then(res => res.json())
      .then(data => {
        setSetlists(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(t('setlists.errorLoad'));
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchSetlists();
    fetch('/teams_api.php?action=get_teams')
      .then(res => res.json())
      .then(data => setTeams(data.ok ? data.teams : []));
  }, [user]);

  const handleCreateSetlist = async () => {
    if (!newSetName.trim()) return;
    setIsCreating(true);

    try {
      const body = { name: newSetName };
      if (newSetTeamId) body.team_id = newSetTeamId;

      const res = await fetch('/setlists_api.php?action=create_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreateModal(false);
        setNewSetName('');
        setNewSetTeamId('');
        fetchSetlists();
        navigate(`/setlists/${data.id}`);
      } else if (data.error === 'limit_reached') {
        setShowCreateModal(false);
        setUpgradeMsg(data.message);
        setShowUpgrade(true);
      } else {
        alert(data.error || 'Failed to create setlist');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>{t('nav.login')}</h2>
          <p className="muted-text" style={{ marginTop: '16px' }}>{t('setlists.loginPrompt')}</p>
          <a href="/loginuser.php?next=/setlists" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block', borderRadius: '99px', padding: '12px 32px' }}>{t('nav.login')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('nav.setlists')} <span className="count-badge">{setlists.length}</span></h1>
        
        <div className="header-actions">
           <button className="btn btn-primary glow-btn" style={{ borderRadius: '99px', padding: '10px 24px' }} onClick={() => setShowCreateModal(true)}>
            {t('setlists.newSetlist')}
           </button>
        </div>
      </div>

      {showUpgrade && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1c1f2e', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Upgrade Required</h2>
            <p style={{ color: '#aaa', marginBottom: '24px', lineHeight: '1.5' }}>{upgradeMsg}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => setShowUpgrade(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => navigate('/pricing')}>See Plans</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: '#1c1f2e', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', color: '#fff' }}>{t('setlists.newSetlist')}</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Setlist Name</label>
              <input type="text" className="form-control" value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="e.g. Sunday Service" autoFocus />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Assign to Team (Optional)</label>
              <select className="form-control" value={newSetTeamId} onChange={e => setNewSetTeamId(e.target.value)}>
                <option value="">-- Personal --</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSetlist} disabled={!newSetName.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-state" style={{ color: 'var(--color-accent-red)' }}><p>{error}</p></div>}

      <div className="list-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>{t('setlists.loading')}</div>
        ) : setlists.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>{t('setlists.empty')}</div>
        ) : setlists.map((list) => (
          <div key={list.id} className="glass-panel" onClick={() => navigate(`/setlists/${list.id}`)} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#fff', letterSpacing: '-0.01em' }}>{list.name}</span>
              <span style={{ fontSize: '0.9rem', color: '#a0a0a5' }}>{list.service_date || t('setlists.unknownDate')}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '99px', fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>
                  {list.items_count} {t('setlists.songsCount')}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#8e8e93', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {list.access_role === 'team' ? (
                    <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> {list.team_name || 'Team'}</>
                  ) : list.access_role === 'shared' ? (
                    <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> {t('setlists.typeShared')}</>
                  ) : (
                    <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> {t('setlists.typePersonal')}</>
                  )}
                </span>
              </div>
              
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#eef3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
