import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import './SongsApp.css';

const KEYS = ['All','C','Cm','D','Dm','E','Em','F','G','Gm','A','Am','B','Bm','Eb','Bb','F#'];
const SONGS_VIEW_STATE_KEY = 'songs_app_view_state_v1';
const SONGS_RESTORE_PENDING_KEY = 'songs_app_restore_pending';

function readSongsRestoreState() {
  try {
    if (sessionStorage.getItem(SONGS_RESTORE_PENDING_KEY) !== '1') return null;
    const saved = JSON.parse(sessionStorage.getItem(SONGS_VIEW_STATE_KEY) || 'null');
    if (!saved || Date.now() - Number(saved.savedAt || 0) > 30 * 60 * 1000) {
      sessionStorage.removeItem(SONGS_RESTORE_PENDING_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export default function SongsApp() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [restoreState] = useState(readSongsRestoreState);
  const initialQuery = new URLSearchParams(location.search).get('q') || '';

  const timeText = {
    am: { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' },
    en: { today: 'Today', yesterday: 'Yesterday', days: 'days ago', weeks: 'weeks ago', months: 'months ago', years: 'years ago' },
    ru: { today: 'Сегодня', yesterday: 'Вчера', days: 'дн. назад', weeks: 'нед. назад', months: 'мес. назад', years: 'лет назад' }
  }[language] || { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diffDays = Math.floor((new Date() - new Date(dateStr.replace(/-/g, '/'))) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return '—';
    if (diffDays <= 0) return timeText.today;
    if (diffDays === 1) return timeText.yesterday;
    if (diffDays < 7) return `${diffDays} ${timeText.days}`;
    if (diffDays < 30) return `${Math.floor(diffDays/7)} ${timeText.weeks}`;
    if (diffDays < 365) return `${Math.floor(diffDays/30)} ${timeText.months}`;
    return `${Math.floor(diffDays/365)} ${timeText.years}`;
  };

  const [songs, setSongs]         = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  usePageReady(isLoading);
  
  const [selectedKey, setSelectedKey] = useState(restoreState?.selectedKey || 'All');
  const [sortBy, setSortBy]       = useState(restoreState?.sortBy || 'recent');
  const [searchQuery, setSearchQuery] = useState(
    restoreState?.searchQuery ?? initialQuery
  );
  const [visibleCount, setVisibleCount] = useState(Math.max(15, Number(restoreState?.visibleCount) || 15));
  const [showBackToTop, setShowBackToTop] = useState(false);
  const filterEffectReady = useRef(false);
  const scrollRestored = useRef(false);

  useEffect(() => {
    if (!filterEffectReady.current) {
      filterEffectReady.current = true;
      return;
    }
    setVisibleCount(15);
  }, [searchQuery, selectedKey, sortBy]);

  useEffect(() => {
    if (restoreState) return;
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search, restoreState]);

  const scrollToTop = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targets = [
      window,
      document.documentElement,
      document.body,
      document.querySelector('#root'),
      document.querySelector('.app-container'),
      document.querySelector('main'),
      document.querySelector('.songs-page'),
      document.querySelector('.app-main')
    ].filter(Boolean);

    targets.forEach(target => {
      try {
        if (typeof target.scrollTo === 'function') {
          target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
        target.scrollTop = 0;
      } catch (err) {
        target.scrollTop = 0;
      }
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const pageEl = document.querySelector('.songs-page');
      const mainEl = document.querySelector('main');
      const rootEl = document.querySelector('#root');
      const scrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
        pageEl?.scrollTop || 0,
        mainEl?.scrollTop || 0,
        rootEl?.scrollTop || 0
      );
      setShowBackToTop(scrollTop > 200);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  useEffect(() => {
    fetch('/api.php')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSongs(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));

    if (user) {
      fetch('/user_favorites_api.php?action=get_favorites')
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            setFavorites(new Set(d.map(f => parseInt(f.id))));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const toggleFavorite = async (e, songId) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login?next=/songs');
      return;
    }
    const isFav = favorites.has(songId);
    
    // Optimistic UI
    const newFavs = new Set(favorites);
    if (isFav) newFavs.delete(songId);
    else newFavs.add(songId);
    setFavorites(newFavs);

    try {
      const response = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId })
      });
      const data = await response.json();
      if (!response.ok || typeof data.favorite !== 'boolean') {
        throw new Error(data.error || 'Favorite update failed');
      }

      setFavorites(current => {
        const synced = new Set(current);
        if (data.favorite) synced.add(songId);
        else synced.delete(songId);
        return synced;
      });
    } catch {
      setFavorites(current => {
        const rolledBack = new Set(current);
        if (isFav) rolledBack.add(songId);
        else rolledBack.delete(songId);
        return rolledBack;
      });
    }
  };

  const filtered = songs
    .filter(s => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchQ = !q 
        || s.title?.toLowerCase().includes(q) 
        || s.title_hy?.toLowerCase().includes(q)
        || s.title_ru?.toLowerCase().includes(q)
        || s.title_en?.toLowerCase().includes(q)
        || s.title_lat?.toLowerCase().includes(q)
        || s.artist?.toLowerCase().includes(q)
        || s.lyrics?.toLowerCase().includes(q)
        || s.tags?.toLowerCase().includes(q);
      
      // Key filter
      return matchQ && (selectedKey === 'All' || s.song_key === selectedKey);
    })
    .sort((a, b) => {
      if (sortBy === 'bpm')    return (parseInt(a.bpm)||0) - (parseInt(b.bpm)||0);
      if (sortBy === 'key')    return (a.song_key||'').localeCompare(b.song_key||'');
      if (sortBy === 'recent') return (parseInt(b.id)||0) - (parseInt(a.id)||0);
      return (a.title||'').localeCompare(b.title||'');
    });

  const visibleSongs = filtered.slice(0, visibleCount);

  useEffect(() => {
    if (isLoading || !restoreState || scrollRestored.current) return undefined;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({
          top: Math.min(Math.max(0, Number(restoreState.scrollY) || 0), maxScroll),
          left: 0,
          behavior: 'auto'
        });
        scrollRestored.current = true;
        sessionStorage.removeItem(SONGS_RESTORE_PENDING_KEY);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [isLoading, restoreState, visibleSongs.length]);

  const openSong = (songId) => {
    try {
      sessionStorage.setItem(SONGS_VIEW_STATE_KEY, JSON.stringify({
        scrollY: window.scrollY,
        searchQuery,
        selectedKey,
        sortBy,
        visibleCount,
        savedAt: Date.now()
      }));
      sessionStorage.setItem(SONGS_RESTORE_PENDING_KEY, '1');
    } catch {}
    navigate(`/song/${songId}`);
  };

  return (
    <div className="songs-page animate-fade-in">

      {/* Header */}
      <div className="songs-header">
        <h1 className="songs-title">
          {t('songs.title')}
          <span className="count-badge">{filtered.length}</span>
        </h1>

        <div className="songs-controls">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={t('songs.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-x" onClick={() => { setSearchQuery(''); navigate('/songs'); }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="songs-tabs">
        <button 
          className="songs-tab active"
          type="button"
        >
          {t('hub.categories.songs', 'Բոլորը')}
        </button>
        {user && (
          <button 
            className="songs-tab"
            type="button"
            onClick={() => navigate('/favorites')}
          >
            {t('favorites.title', 'Պահպանված երգեր')}
          </button>
        )}
        <button
          className="songs-tab"
          type="button"
          onClick={() => navigate('/transpose')}
        >
          {t('nav.transposer')}
        </button>
      </div>

      {/* Filters & Sorting */}
      <div className="filter-bar">
        <div className="key-scroll-container">
          <div className="key-pills">
            {KEYS.map(k => (
              <button key={k} className={`kp ${selectedKey===k?'active':''}`}
                onClick={() => setSelectedKey(k)}>{k}</button>
            ))}
          </div>
        </div>
        
        <select className="sort-sel modern-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="title">{t('songs.sortTitle')}</option>
          <option value="recent">⏱ {t('songs.sortRecent')}</option>
          <option value="bpm">{t('songs.sortBpm')}</option>
          <option value="key">{t('songs.sortKey')}</option>
        </select>
      </div>

      {/* Track List */}
      <div className="track-list">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="track-item skeleton-item">
                <div className="track-cover skeleton-box"></div>
                <div className="track-info">
                  <div className="skeleton-line title-line"></div>
                  <div className="skeleton-line artist-line"></div>
                </div>
                <div className="track-meta">
                  <div className="skeleton-box badge-line"></div>
                </div>
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="list-placeholder empty-state animate-fade-in">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            <p>{t('songs.noResults')}</p>
          </div>
        ) : (
          <>
            {visibleSongs.map((song, idx) => (
              <div key={song.id} className="track-item animate-fade-in" style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }} onClick={() => openSong(song.id)}>
            
            <div className="track-number desk-only dim">
              {(idx + 1).toString().padStart(2, '0')}
            </div>

            <div
              className="track-cover"
              style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
            >
              {song.title?.charAt(0)?.toUpperCase()}
            </div>

            <div className="track-info">
              <span className="track-title">{getLocalizedTitle(song, language)}</span>
              <span className="track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</span>
            </div>

            <div className="track-meta">
              {song.song_key && <span className="track-key-badge">{song.song_key}</span>}
              <span className="track-date desk-only">{getTimeAgo(song.created_at)}</span>
              {Number.parseInt(song.bpm, 10) > 0 && <span className="track-bpm desk-only dim">{song.bpm} BPM</span>}
            </div>

            <div className="track-actions">
              <button 
                className={`heart-btn ${favorites.has(parseInt(song.id)) ? 'active' : ''}`} 
                onClick={(e) => toggleFavorite(e, parseInt(song.id))}
                title={favorites.has(parseInt(song.id)) ? t('songs.removeFromFav', 'Remove') : t('songs.addToFav', 'Save')}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" 
                  fill={favorites.has(parseInt(song.id)) ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>

          </div>
            ))}
            {visibleCount < filtered.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '24px', gridColumn: '1 / -1' }}>
                <button 
                  className="btn load-more-btn" 
                  onClick={() => setVisibleCount(v => v + 15)} 
                >
                  {t('songs.loadMore', 'Load More')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showBackToTop && createPortal(
        <button
          type="button"
          className="songs-back-to-top"
          aria-label={t('songs.backToTop')}
          title={t('songs.backToTop')}
          onClick={scrollToTop}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>,
        document.body
      )}
    </div>
  );
}
