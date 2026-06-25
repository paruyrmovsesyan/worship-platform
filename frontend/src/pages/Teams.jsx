import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Teams.css';

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTeams();
  }, [user]);

  const fetchTeams = () => {
    fetch('/teams_api.php?action=get_teams')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setTeams(data.teams || []);
        setLoading(false);
      })
      .catch(console.error);
  };

  const handleCreateTeam = async () => {
    const name = prompt(t('teams.newTeamNamePrompt'));
    if (!name) return;

    try {
      const res = await fetch('/teams_api.php?action=create_team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.ok) fetchTeams();
      else alert(data.error);
    } catch (e) {
      alert('Network error');
    }
  };

  const handleAddMember = async (teamId) => {
    const email = prompt(t('teams.memberEmailPrompt'));
    if (!email) return;

    try {
      const res = await fetch('/teams_api.php?action=add_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, email })
      });
      const data = await res.json();
      if (data.ok) {
        alert(t('teams.addedAlert'));
        fetchTeams();
      } else if (data.error === 'limit_reached') {
        alert(data.message || 'Team limit reached.');
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const features = t('teams.featuresList', []);
  const roles = t('teams.roles', []);

  if (user) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t('nav.teams')}</h1>
          <div className="header-actions">
             <button className="btn btn-primary glow-btn" style={{ borderRadius: '99px', padding: '10px 24px' }} onClick={handleCreateTeam}>
              {t('teams.createNewTeamBtn')}
             </button>
          </div>
        </div>

        <div className="table-container" style={{ marginTop: '30px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading...</p>
          ) : teams.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>{t('teams.noTeams')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teams.map(team => (
                <div key={team.id} className="glass-panel" onClick={() => navigate(`/teams/${team.id}`, { state: { team } })} style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{team.name}</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#a0a0a5' }}>{team.members_count} {t('teams.membersCountLabel')}</span>
                      <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', color: '#ccc' }}>{team.user_role}</span>
                    </div>
                  </div>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#eef3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="teams-hero">
        <div className="teams-hero-content">
          <span className="teams-badge">{t('teams.badge')}</span>
          <h1>{t('teams.hero')}</h1>
          <p>{t('teams.subtitle')}</p>
          <div className="teams-hero-actions">
            <button className="btn-primary-cyan" onClick={() => navigate(user ? '/setlists' : '/register')}>
              {user ? t('teams.dashboard') : t('teams.ctaJoin')}
            </button>
          </div>
        </div>
        <div className="teams-hero-visual">
          <div className="team-card-stack">
            {['🎸', '🎹', '🥁', '🎤', '🎺'].map((emoji, i) => (
              <div key={i} className="team-member-chip" style={{ transform: `rotate(${(i - 2) * 5}deg) translateY(${i * 4}px)` }}>
                <span>{emoji}</span>
                <span className="chip-label">{roles[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="teams-features">
        <div className="teams-container">
          <h2 className="section-title">{t('teams.featuresTitle')}</h2>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="teams-cta">
        <div className="teams-container">
          <h2>{t('teams.ctaTitle')}</h2>
          <p>{t('teams.ctaSub')}</p>
          <button className="btn-primary-cyan" onClick={() => navigate(user ? '/setlists' : '/register')}>
            {user ? t('teams.dashboard') : t('teams.ctaJoin')}
          </button>
        </div>
      </div>
    </div>
  );
}
