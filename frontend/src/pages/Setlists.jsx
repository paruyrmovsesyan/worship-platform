import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Setlists.css';

const GRADS = ['bg-purple', 'bg-blue', 'bg-cyan', 'bg-gold', 'bg-orange'];

export default function Setlists() {
  const [setlists, setSetlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
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
        alert(data.message || 'Setlist limit reached.');
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
      <div className="setlists-page animate-fade-in">
        <div className="sl-header">
          <h1 className="sl-title">
            <span>{t('nav.setlists')}</span>
          </h1>
        </div>
        <div className="login-prompt">
          <div className="prompt-icon">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2>{t('nav.login')}</h2>
          <p>{t('setlists.loginPrompt', 'Խնդրում ենք մուտք գործել՝ երգացանկեր ստեղծելու և դիտելու համար:')}</p>
          <Link to="/login?next=/setlists" className="btn btn-primary">{t('nav.login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="setlists-page animate-fade-in">
      {/* Header */}
      <div className="sl-header">
        <h1 className="sl-title" style={{ minWidth: 0, flexGrow: 1 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('nav.setlists')}</span>
          <span className="count-badge" style={{ flexShrink: 0 }}>{setlists.length}</span>
        </h1>
        <button className="btn btn-primary btn-new-set" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {t('setlists.newSetlist')}
        </button>
      </div>

      {error && <div className="error-state"><p>{error}</p></div>}

      {/* Setlists Grid */}
      <div className="sl-grid">
        {loading ? (
          <div className="sl-placeholder">
            <div className="spinner"></div>
            <p>{t('setlists.loading')}</p>
          </div>
        ) : setlists.length === 0 ? (
          <div className="sl-placeholder empty-state animate-fade-in">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <p>{t('setlists.empty')}</p>
          </div>
        ) : setlists.map((list, idx) => (
          <div key={list.id} className="sl-card animate-fade-in" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }} onClick={() => navigate(`/setlists/${list.id}`)}>
            <div className={`sl-cover ${GRADS[(list.id || idx) % GRADS.length]}`}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>
            <div className="sl-info">
              <h3>{list.name}</h3>
              <p className="sl-date">{list.service_date || t('setlists.unknownDate')}</p>
              
              <div className="sl-meta">
                <span className="sl-songs-count">{list.items_count} {t('setlists.songsCount')}</span>
                <span className="sl-badge">
                  {list.access_role === 'team' ? (
                    <><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg> {list.team_name || 'Team'}</>
                  ) : list.access_role === 'shared' ? (
                    <><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg> {t('setlists.typeShared')}</>
                  ) : (
                    <><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> {t('setlists.typePersonal')}</>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="sl-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="sl-modal" onClick={e => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{t('setlists.newSetlist')}</h2>
              <button className="sl-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <div className="sl-form-group">
              <label>Setlist Name</label>
              <input 
                type="text" 
                className="sl-input" 
                value={newSetName} 
                onChange={e => setNewSetName(e.target.value)} 
                placeholder="e.g. Sunday Service" 
                autoFocus 
              />
            </div>

            <div className="sl-form-group">
              <label>Assign to Team (Optional)</label>
              <div className="sl-select-wrapper">
                <select className="sl-select" value={newSetTeamId} onChange={e => setNewSetTeamId(e.target.value)}>
                  <option value="">-- Personal --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <svg className="sl-select-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            <div className="sl-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSetlist} disabled={!newSetName.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
