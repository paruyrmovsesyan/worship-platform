import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function TeamView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [team, setTeam] = useState(location.state?.team || null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isOwner = team?.user_role === 'owner';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // If team wasn't passed in state, we should probably fetch it, 
    // but for now we'll just fetch members
    if (!team) {
      fetch('/teams_api.php?action=get_teams')
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            const found = data.teams.find(t => t.id === parseInt(id));
            if (found) setTeam(found);
            else setError('Team not found');
          }
        });
    }

    fetchMembers();
  }, [id, user]);

  const fetchMembers = () => {
    fetch(`/teams_api.php?action=get_members&team_id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setMembers(data.members || []);
        } else {
          setError(data.error || 'Failed to load members');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Network error');
        setLoading(false);
      });
  };

  const handleAddMember = async () => {
    const email = prompt(language === 'am' ? 'Մուտքագրեք նոր անդամի էլ. հասցեն:' : 'Enter new member email:');
    if (!email) return;

    try {
      const res = await fetch('/teams_api.php?action=add_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: id, email })
      });
      const data = await res.json();
      if (data.ok) {
        fetchMembers();
      } else {
        alert(data.error || data.message || 'Failed to add member');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm(language === 'am' ? 'Համոզվա՞ծ եք:' : 'Are you sure you want to remove this member?')) return;
    
    try {
      const res = await fetch('/teams_api.php?action=remove_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: id, user_id: userId })
      });
      const data = await res.json();
      if (data.ok) {
        fetchMembers();
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(language === 'am' ? 'Համոզվա՞ծ եք, որ ուզում եք ջնջել այս թիմը:' : 'Are you sure you want to delete this team entirely?')) return;
    
    try {
      const res = await fetch('/teams_api.php?action=delete_team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: id })
      });
      const data = await res.json();
      if (data.ok) {
        navigate('/teams');
      } else {
        alert(data.error || 'Failed to delete team');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  if (loading) return <div className="page-container"><p style={{textAlign: 'center', marginTop: '50px'}}>Loading...</p></div>;
  
  if (error && !team) return <div className="page-container"><p style={{color: '#ff4a6a', textAlign: 'center', marginTop: '50px'}}>{error}</p></div>;

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={() => navigate('/teams')} style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="page-title">{team ? team.name : 'Team Details'}</h1>
        </div>
        
        {isOwner && (
          <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleDeleteTeam} style={{ color: '#ff4a6a', borderColor: 'rgba(255,74,106,0.3)' }}>
              {language === 'am' ? 'Ջնջել Թիմը' : 'Delete Team'}
            </button>
            <button className="btn btn-primary glow-btn" onClick={handleAddMember} style={{ borderRadius: '99px', padding: '10px 24px' }}>
              {language === 'am' ? '+ Ավելացնել Անդամ' : '+ Add Member'}
            </button>
          </div>
        )}
      </div>

      <div className="card glass-panel" style={{ padding: '32px', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', color: '#eef3ff' }}>
          {language === 'am' ? 'Թիմի Անդամներ' : 'Team Members'}
        </h2>
        
        {members.length === 0 ? (
          <p style={{ color: '#888' }}>{language === 'am' ? 'Այս թիմում դեռ անդամներ չկան:' : 'No members in this team yet.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#fff' }}>{member.name}</span>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>{member.email}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', color: '#ccc' }}>
                    {member.role}
                  </span>
                  {isOwner && (
                    <button className="icon-btn" onClick={() => handleRemoveMember(member.user_id)} style={{ width: '32px', height: '32px', color: '#ff4a6a', borderColor: 'transparent' }} title="Remove">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
