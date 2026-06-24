import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import './MobileHub.css';

export default function MobileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [recentSongs, setRecentSongs] = useState([]);
  const [upcomingSetlist, setUpcomingSetlist] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Fetch recent songs
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentSongs(data.slice(0, 5));
        }
      })
      .catch(err => console.error(err));

    // Fetch user specific data
    if (user) {
      // Fetch setlists
      fetch('/setlists_api.php?action=get_setlists')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setUpcomingSetlist(data[0]);
          }
        })
        .catch(err => console.error(err));

      // Fetch favorites
      fetch('/user_favorites_api.php')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFavorites(data.slice(0, 6));
          }
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  const getFormattedDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' | 10:30 AM';
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/songs?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/songs');
    }
  };

  return (
    <div className="mobile-hub animate-fade-in">
      <div className="hub-header">
        <h1>Worship Platform</h1>
        <button className="icon-btn" style={{ border: 'none' }} onClick={() => navigate('/notifications')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
      </div>

      <div className="hub-content">
        
        {/* Hero Search & Categories */}
        <div className="hub-hero">
          <form className="hub-search-box" onSubmit={handleSearchSubmit}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" onClick={handleSearchSubmit} style={{cursor: 'pointer'}}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder={t('hub.searchPlaceholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: '1.05rem',
                width: '100%',
                outline: 'none'
              }}
            />
          </form>
          
          <div className="hub-categories">
            <button className="hub-cat-btn" onClick={() => navigate('/songs')}>
              <div className="cat-icon bg-cyan"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>
              <span>{t('hub.categories.songs')}</span>
            </button>
            <button className="hub-cat-btn" onClick={() => navigate('/setlists')}>
              <div className="cat-icon bg-gold"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
              <span>{t('hub.categories.setlists')}</span>
            </button>
            <button className="hub-cat-btn" onClick={() => navigate('/teams')}>
              <div className="cat-icon bg-green"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <span>{t('hub.categories.teams')}</span>
            </button>
            <button className="hub-cat-btn" onClick={() => navigate('/song-request')}>
              <div className="cat-icon bg-orange"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
              <span>{t('songRequest.title', 'Խնդրել Երգ')}</span>
            </button>
          </div>
        </div>

        {/* Dashboard: Upcoming Service */}
        <div className="upcoming-card">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h2 className="card-label">{t('hub.upcomingService')}:<br/>{upcomingSetlist ? upcomingSetlist.name : 'Sunday AM'}</h2>
            <p>{getFormattedDate()}</p>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => upcomingSetlist ? navigate(`/setlists/${upcomingSetlist.id}`) : navigate('/setlists')}
            >
              {t('hub.startRehearsal')}
            </button>
          </div>
        </div>

        {/* My Favorites (Horizontal Scroll) */}
        {user && favorites.length > 0 && (
          <div className="section-block">
            <div className="section-title">
              <h3>{t('hub.myFavorites')}</h3>
            </div>
            
            <div className="horizontal-scroll hub-horizontal">
              {favorites.map((song, i) => (
                <div key={song.id} className="hub-fav-card" onClick={() => navigate(`/song/${song.song_id}`)}>
                  <div className="fav-icon">♥</div>
                  <div className="fav-info">
                    <h4>{song.song_title}</h4>
                    <p>{song.artist || 'Worship Team'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed: Recently Added Chords */}
        <div className="section-block">
          <div className="section-title">
            <h3>{t('hub.recentChords')}</h3>
          </div>
          
          <div className="recent-list">
            {recentSongs.map((song, i) => (
              <div key={song.id} className="recent-item" onClick={() => navigate(`/song/${song.id}`)}>
                <div className="recent-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                </div>
                <div className="hub-item-info">
                  <h4>{getLocalizedTitle(song.title, language)}</h4>
                  <p>{song.artist || t('songs.unknownArtist', 'Unknown Artist')}<br/>{t('songView.key', 'Key:')} {song.song_key || '?'}</p>
                </div>
                <div className="recent-time">
                  {i === 0 ? '3h' : i === 1 ? '1d' : '3d'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed: Latest News */}
        <div className="section-block">
          <div className="section-title">
            <h3>{t('hub.latestNews')}</h3>
          </div>
          <div className="news-feed-list">
            {(t('landing.newsItems', { returnObjects: true }) || []).slice(0, 2).map((item, i) => (
              <div key={i} className="hub-news-card" onClick={() => navigate('/news')}>
                <div className={`news-img img-${i + 1}`} />
                <div className="news-content">
                  <span className="news-date">{item.date}</span>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
