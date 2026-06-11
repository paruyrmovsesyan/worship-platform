import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Teams.css';

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

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
    const name = prompt(language === 'am' ? 'Նոր թիմի անուն:' : 'New Team Name:');
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
    const email = prompt(language === 'am' ? 'Մասնակցի էլ. հասցե:' : 'Member Email:');
    if (!email) return;

    try {
      const res = await fetch('/teams_api.php?action=add_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, email })
      });
      const data = await res.json();
      if (data.ok) {
        alert(language === 'am' ? 'Ավելացվեց' : 'Added');
        fetchTeams();
      } else if (data.error === 'limit_reached') {
        setUpgradeMsg(data.message);
        setShowUpgrade(true);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const features = {
    am: [
      { icon: '👥', title: 'Թիմի Անդամներ', desc: 'Ավելացրու երաժիշտներ և վոկալիստներ: Կառավարիր դերերն ու իրավունքները:' },
      { icon: '📋', title: 'Համատեղ Երգացանկեր', desc: 'Ստեղծիր և կիսվիր երգացանկերով թիմի հետ իրական ժամանակում:' },
      { icon: '🎵', title: 'Ակորդներ', desc: 'Տրամադրիր թիմին ակորդների և բառերի հասանելիություն:' },
      { icon: '🔔', title: 'Փորձերի Ծանուցումներ', desc: 'Ուղարկիր ավտոմատ հիշեցումներ փորձերի համար:' },
      { icon: '📊', title: 'Վիճակագրություն', desc: 'Տես, թե որ երգերն են ամենաշատը օգտագործվում և հետևիր ակտիվությանը:' },
      { icon: '💬', title: 'Թիմային Չաթ', desc: 'Շփվիր անմիջապես հարթակի ներսում: Նոր հավելվածներ պետք չեն:' },
    ],
    en: [
      { icon: '👥', title: 'Team Members', desc: 'Add musicians, vocalists, and tech team members. Assign roles and manage permissions.' },
      { icon: '📋', title: 'Shared Setlists', desc: 'Build and share setlists with your entire team. Everyone sees the same plan in real time.' },
      { icon: '🎵', title: 'Chord Sheets', desc: 'Give every team member access to chord charts, lyrics, and arrangement notes.' },
      { icon: '🔔', title: 'Rehearsal Alerts', desc: 'Send automatic reminders and schedule rehearsals so no one misses a practice.' },
      { icon: '📊', title: 'Analytics', desc: 'See which songs are used most, track team activity, and measure engagement.' },
      { icon: '💬', title: 'Team Chat', desc: 'Communicate directly inside the platform. No need for separate messaging apps.' },
    ],
    ru: [
      { icon: '👥', title: 'Члены Команды', desc: 'Добавляйте музыкантов и вокалистов. Управляйте ролями и разрешениями.' },
      { icon: '📋', title: 'Общие Сет-листы', desc: 'Создавайте и делитесь сет-листами со всей командой в реальном времени.' },
      { icon: '🎵', title: 'Аккорды', desc: 'Предоставьте команде доступ к аккордам и текстам.' },
      { icon: '🔔', title: 'Уведомления о Репетициях', desc: 'Отправляйте автоматические напоминания о репетициях.' },
      { icon: '📊', title: 'Аналитика', desc: 'Смотрите, какие песни используются чаще всего, и отслеживайте активность.' },
      { icon: '💬', title: 'Командный Чат', desc: 'Общайтесь прямо на платформе. Дополнительные приложения не нужны.' },
    ]
  }[language] || features.en;

  const roles = {
    am: ['Կիթառահար', 'Դաշնակահար', 'Թմբկահար', 'Վոկալիստ', 'Փողային'],
    en: ['Guitarist', 'Pianist', 'Drummer', 'Vocalist', 'Brass'],
    ru: ['Гитарист', 'Пианист', 'Барабанщик', 'Вокалист', 'Духовые'],
  }[language] || roles.en;

  if (user) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">{t('nav.teams')}</h1>
          <div className="header-actions">
             <button className="btn btn-primary glow-btn" style={{ borderRadius: '99px', padding: '10px 24px' }} onClick={handleCreateTeam}>
              {language === 'am' ? 'Ստեղծել նոր թիմ' : 'Create New Team'}
             </button>
          </div>
        </div>

        {showUpgrade && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1c1f2e', padding: '32px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <h2 style={{ marginBottom: '16px', color: '#fff' }}>Upgrade Required</h2>
              <p style={{ color: '#aaa', marginBottom: '24px', lineHeight: '1.5' }}>{upgradeMsg}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => setShowUpgrade(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => navigate('/pricing')}>See Plans</button>
              </div>
            </div>
          </div>
        )}

        <div className="table-container" style={{ marginTop: '30px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>Loading...</p>
          ) : teams.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#888' }}>{language === 'am' ? 'Դուք դեռ թիմեր չունեք:' : 'You have no teams yet.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teams.map(team => (
                <div key={team.id} className="glass-panel" onClick={() => navigate(`/teams/${team.id}`, { state: { team } })} style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{team.name}</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#a0a0a5' }}>{team.members_count} {language === 'am' ? 'անդամ' : 'members'}</span>
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
            <button className="btn-ghost" onClick={() => navigate('/pricing')}>{t('teams.cta')} →</button>
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
          <button className="btn-primary-cyan" onClick={() => navigate('/pricing')}>{t('teams.cta')}</button>
        </div>
      </div>
    </div>
  );
}
