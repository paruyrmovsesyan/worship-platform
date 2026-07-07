import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { fallbackNews, fetchNewsList, formatNewsDate } from '../utils/news';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import './MobileHub.css';

export default function MobileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  
  const [recentSongs, setRecentSongs] = useState([]);
  const [upcomingSetlist, setUpcomingSetlist] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [newsItems, setNewsItems] = useState(fallbackNews);
  const [logoSrc, setLogoSrc] = useState('/platform_logo.png');
  const { guardPath } = usePwaOfflineGuard();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');

  const formatSyncStamp = (value) => {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
  };

  useEffect(() => {
    const readSyncTime = () => {
      try {
        setLastSyncAt(localStorage.getItem('wp_last_sync_at') || '');
      } catch (e) {
        setLastSyncAt('');
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      readSyncTime();
    };

    const handleOffline = () => {
      setIsOffline(true);
      readSyncTime();
    };

    const handleStorage = (event) => {
      if (!event || event.key === 'wp_last_sync_at') {
        readSyncTime();
      }
    };

    readSyncTime();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  
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
      fetch('/user_favorites_api.php?action=get_favorites')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFavorites(data.slice(0, 6));
          }
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsList({ language, limit: 2, featured: true })
      .then(items => {
        if (!cancelled) setNewsItems(items.length ? items : fallbackNews);
      })
      .catch(() => {
        if (!cancelled) setNewsItems(fallbackNews);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

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

  const openFavorites = () => {
    guardPath('/favorites', () => navigate('/favorites'));
  };

  return (
    <div className="mobile-hub animate-fade-in">
      <div className="hub-header">
        <button className="hub-logo-btn" type="button" onClick={() => navigate('/')} aria-label="Worship Platform">
          <img
            src={logoSrc}
            alt=""
            className={`hub-logo-img ${logoSrc === '/splash-logo-white.png' ? 'hub-logo-img-square' : ''}`}
            onError={() => {
              if (logoSrc !== '/splash-logo-white.png') {
                setLogoSrc('/splash-logo-white.png');
              }
            }}
          />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ marginRight: '8px' }}>
            <LanguageSwitcher />
          </div>
          <button className="icon-btn" style={{ border: 'none' }} onClick={() => guardPath('/notifications', () => navigate('/notifications'))}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>
        </div>
      </div>

      <div className="hub-content">
        {isOffline && (
          <div className="hub-offline-card">
            <div className="hub-offline-head">
              <span className="hub-offline-dot"></span>
              <strong>{t('chat.offline')}</strong>
            </div>
            <div className="hub-offline-meta">
              <span>Օֆֆլայն հասանելի են երգերը և պահված տվյալները</span>
              <span>Վերջին sync: {formatSyncStamp(lastSyncAt)}</span>
            </div>
          </div>
        )}
        
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
                fontSize: '1.1rem',
                width: '100%',
                outline: 'none',
                fontWeight: '500'
              }}
            />
          </form>
          
          <div className="hub-categories-grid">
            <button className="hub-cat-card" onClick={() => guardPath('/songs', () => navigate('/songs'))}>
              <div className="cat-icon bg-cyan"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>
              <span className="cat-text">{t('hub.categories.songs')}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/setlists', () => navigate('/setlists'))}>
              <div className="cat-icon bg-gold"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></div>
              <span className="cat-text">{t('hub.categories.setlists')}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/friends', () => navigate('/friends'))}>
              <div className="cat-icon bg-green"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <span className="cat-text">{t('hub.categories.teams')}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/song-request', () => navigate('/song-request'))}>
              <div className="cat-icon bg-orange"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
              <span className="cat-text">{t('songRequest.title', 'Խնդրել Երգ')}</span>
            </button>
          </div>
        </div>

        {/* Dashboard: Upcoming Service */}
        {user && (
          <div className="upcoming-card">
            <div className="card-bg-glow"></div>
            <div className="card-content">
              <h2 className="card-label">{t('hub.upcomingService')}:<br/>{upcomingSetlist ? upcomingSetlist.name : 'Sunday AM'}</h2>
              <p>{getFormattedDate()}</p>
              
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '16px' }}
                onClick={() => guardPath(upcomingSetlist ? `/setlists/${upcomingSetlist.id}` : '/setlists', () => {
                  if (upcomingSetlist) navigate(`/setlists/${upcomingSetlist.id}`);
                  else navigate('/setlists');
                })}
              >
                {t('hub.startRehearsal')}
              </button>
            </div>
          </div>
        )}

        {/* My Favorites (Horizontal Scroll) */}
        {user && favorites.length > 0 && (
          <div className="section-block">
            <div className="section-title section-title-action">
              <div>
                <h3>{t('hub.myFavorites')}</h3>
                <p className="section-subtitle">{favorites.length} {t('favorites.savedSongs')}</p>
              </div>
              <button className="section-link-btn" type="button" onClick={openFavorites}>
                {t('favorites.title')}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="horizontal-scroll hub-horizontal">
              {favorites.map((song, i) => {
                const songId = song.song_id || song.id;
                return (
                <div key={song.id || songId} className="hub-fav-card" onClick={() => guardPath(`/song/${songId}?list=favorites`, () => navigate(`/song/${songId}?list=favorites`))}>
                  <div
                    className="hub-fav-cover"
                    style={getSongCoverStyle(songId || i, song.song_title || song.artist || '')}
                  >
                    <div className="hub-fav-cover-badge">♥</div>
                    <span className="hub-fav-cover-key">{song.song_key || t('favorites.favoriteTag')}</span>
                  </div>
                  <div className="fav-info">
                    <h4>{getLocalizedTitle(song, language)}</h4>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Feed: Recently Added Chords */}
        <div className="section-block">
          <div className="section-title">
            <h3>{t('hub.recentChords')}</h3>
          </div>
          
          <div className="recent-songs-scroll">
            {recentSongs.map((song, i) => (
              <div key={song.id} className="recent-song-card" onClick={() => guardPath(`/song/${song.id}`, () => navigate(`/song/${song.id}`))}>
                <div
                  className="recent-song-cover"
                  style={getSongCoverStyle(song.id || i, song.title || song.song_key || '')}
                >
                  <div className="recent-song-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <span className="recent-song-key">{song.song_key || '?'}</span>
                </div>
                <div className="recent-song-info">
                  <h4>{getLocalizedTitle(song, language)}</h4>
                  <p>{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</p>
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
            {newsItems.slice(0, 2).map((item, i) => (
              <div key={item.slug || i} className="hub-news-card" onClick={() => guardPath(`/news/${item.slug}`, () => navigate(`/news/${item.slug}`))}>
                <div
                  className={`news-img img-${i + 1}`}
                  style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}
                />
                <div className="news-content">
                  <span className="news-date">{formatNewsDate(item.published_at || item.date, language)}</span>
                  <h4>{item.title}</h4>
                  <p>{item.excerpt || item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
