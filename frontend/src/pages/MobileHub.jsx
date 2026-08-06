import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { sortSavedSongs } from '../utils/savedSongs';
import { fallbackNews, getCachedNewsList, fetchNewsList, formatNewsDate, formatNewsVersion, getNewsImageUrl } from '../utils/news';
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
  const [newsItems, setNewsItems] = useState(() => getCachedNewsList(language));
  const [logoSrc, setLogoSrc] = useState('/wolarm_youth.png');
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
    // 1. Instant hydration from localStorage cache
    try {
      const cachedSongs = localStorage.getItem('wp_songs_cache');
      if (cachedSongs) {
        const parsed = JSON.parse(cachedSongs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSongs(parsed.slice(0, 5));
        }
      }
      const cachedFavs = localStorage.getItem('wp_user_favorites_cache');
      if (cachedFavs) {
        const parsed = JSON.parse(cachedFavs);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {}

    // Fetch recent songs from API
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentSongs(data.slice(0, 5));
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(data));
          } catch {}
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
        .then(res => {
          if (!res.ok) throw new Error('Saved songs request failed');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setFavorites(data);
            try {
              localStorage.setItem('wp_user_favorites_cache', JSON.stringify(data));
            } catch {}
          }
        })
        .catch(err => console.error(err));
    } else {
      setFavorites([]);
      setUpcomingSetlist(null);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsList({ language, limit: 10 })
      .then(items => {
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setNewsItems(items);
        }
      })
      .catch(() => {
        if (!cancelled) setNewsItems(getCachedNewsList(language));
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

  const visibleFavorites = useMemo(() => sortSavedSongs(
    favorites,
    'saved_newest',
    song => getLocalizedTitle(song, language),
    language
  ).slice(0, 6), [favorites, language]);

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
          <button className="icon-btn" style={{ border: 'none' }} onClick={() => navigate('/settings')} title={t('settings.title', 'Կարգավորումներ')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
          <button
            className="icon-btn"
            style={{
              border: 'none',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
            onClick={() => guardPath('/notifications', () => navigate('/notifications'))}
            onTouchEnd={(e) => {
              e.preventDefault();
              guardPath('/notifications', () => navigate('/notifications'));
            }}
            title={t('notifications.title', 'Ծանուցումներ')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
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
            <button className="hub-cat-card hub-cat-card-wide" onClick={() => guardPath('/transpose', () => navigate('/transpose'))}>
              <div className="cat-icon bg-transpose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M7 4 4 7l3 3M20 17H4m13-3 3 3-3 3" /></svg></div>
              <span className="cat-text">{t('hub.categories.transposer')}</span>
              <svg className="hub-cat-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        {/* Dashboard: Upcoming Service */}
        {user && upcomingSetlist && (
          <div className="upcoming-card">
            <div className="upcoming-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
                <path d="m9.5 15 1.7 1.7 3.6-3.7" />
              </svg>
            </div>
            <div className="upcoming-card-content">
              <span className="upcoming-card-label">{t('hub.upcomingService')}</span>
              <h2>{upcomingSetlist.name}</h2>
              <p>{getFormattedDate()}</p>
            </div>
            <button
              type="button"
              className="upcoming-card-action"
              aria-label={t('hub.startRehearsal')}
              onClick={() => guardPath(`/setlists/${upcomingSetlist.id}`, () => {
                navigate(`/setlists/${upcomingSetlist.id}`);
              })}
            >
              <span>{t('hub.startRehearsal')}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
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
                {t('favorites.viewAll')}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            
            <div className="hub-horizontal">
              {visibleFavorites.map((song, i) => {
                const songId = song.song_id || song.id;
                const savedKey = song.target_key || song.song_key || '?';
                const songTitle = getLocalizedTitle(song, language);
                return (
                <button
                  key={song.id || songId}
                  type="button"
                  className="hub-fav-card"
                  aria-label={songTitle}
                  onClick={() => guardPath(`/song/${songId}?list=favorites&sort=saved_newest`, () => navigate(`/song/${songId}?list=favorites&sort=saved_newest`))}
                >
                  <div
                    className="hub-fav-cover"
                    style={getSongCoverStyle(songId || i, song.title || songTitle || savedKey)}
                  >
                    <div className="hub-fav-cover-badge" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    </div>
                    <span className="hub-fav-cover-key">{savedKey}</span>
                  </div>
                  <div className="fav-info">
                    <h4>{songTitle}</h4>
                    <p className="hub-fav-meta">
                      <span>{t('favorites.keyTag')} {savedKey}</span>
                      {Number.parseInt(song.bpm, 10) > 0 && <span>BPM {song.bpm}</span>}
                    </p>
                  </div>
                </button>
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
                  style={item.image_url ? { backgroundImage: `url("${getNewsImageUrl(item)}")` } : undefined}
                />
                <div className="news-content">
                  {item.release_version ? <span className="news-release-version">{formatNewsVersion(item.release_version)}</span> : null}
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
