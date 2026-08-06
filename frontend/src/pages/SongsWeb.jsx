import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { matchSongSearch } from '../utils/searchMatcher';
import './SongsWeb.css';

const KEYS = ['All','C','Cm','D','Dm','E','Em','F','G','Gm','A','Am','B','Bm','Eb','Bb','F#'];

export default function SongsWeb() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

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
  usePageReady(isLoading);
  const { user } = useAuth();
  const [selectedKey, setSelectedKey] = useState('All');
  const [sortBy, setSortBy]       = useState('title');
  const [searchQuery, setSearchQuery] = useState(
    new URLSearchParams(location.search).get('q') || ''
  );
  const [visibleCount, setVisibleCount] = useState(15);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery, selectedKey, sortBy]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search]);

  const scrollToTop = (e) => {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (err) {}
    }

    const startPos = Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );

    const scrolledElements = [];
    const elements = document.querySelectorAll('div, main, section, article, #root, .app-container, .songs-web-page, .app-main');
    elements.forEach(el => {
      if (el.scrollTop > 0) {
        scrolledElements.push({ el, start: el.scrollTop });
      }
    });

    const duration = 320; // 320ms smooth animation
    const startTime = performance.now();

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth cubic ease-out curve
      const ease = 1 - Math.pow(1 - progress, 3);

      if (startPos > 0) {
        const currentY = Math.round(startPos * (1 - ease));
        window.scrollTo(0, currentY);
        if (document.documentElement) document.documentElement.scrollTop = currentY;
        if (document.body) document.body.scrollTop = currentY;
      }

      scrolledElements.forEach(({ el, start }) => {
        el.scrollTop = Math.round(start * (1 - ease));
      });

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }

    requestAnimationFrame(animateScroll);
  };

  useEffect(() => {
    const handleScroll = () => {
      const pageEl = document.querySelector('.songs-web-page');
      const mainEl = document.querySelector('main');
      const rootEl = document.querySelector('#root');
      const containerEl = document.querySelector('.app-container');
      const scrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
        pageEl?.scrollTop || 0,
        mainEl?.scrollTop || 0,
        rootEl?.scrollTop || 0,
        containerEl?.scrollTop || 0
      );
      setShowBackToTop(scrollTop > 200);
    };

    handleScroll();

    const targets = [
      window,
      document,
      document.documentElement,
      document.body,
      document.querySelector('#root'),
      document.querySelector('.app-container'),
      document.querySelector('main'),
      document.querySelector('.songs-web-page')
    ].filter(Boolean);

    targets.forEach(t => {
      t.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    });

    return () => {
      targets.forEach(t => {
        t.removeEventListener('scroll', handleScroll, { capture: true });
      });
    };
  }, []);

  useEffect(() => {
    // 1. Instant hydration from localStorage cache
    try {
      const cached = localStorage.getItem('wp_songs_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSongs(parsed);
          setIsLoading(false);
        }
      }
    } catch {}

    // 2. Fetch fresh data from API
    fetch('/api.php')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setSongs(d);
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(d));
          } catch {}
        }
        setIsLoading(false);
      })
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
      window.location.href = '/loginuser.php?next=/songs';
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
      const matchQ = matchSongSearch(s, searchQuery);
      return matchQ && (selectedKey === 'All' || s.song_key === selectedKey);
    })
    .sort((a, b) => {
      if (sortBy === 'bpm')    return (parseInt(a.bpm)||0) - (parseInt(b.bpm)||0);
      if (sortBy === 'key')    return (a.song_key||'').localeCompare(b.song_key||'');
      if (sortBy === 'recent') return (parseInt(b.id)||0) - (parseInt(a.id)||0);
    });

  const visibleSongs = filtered.slice(0, visibleCount);

  return (
    <div className="songs-web-view songs-page">

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

      {/* Filters & Sorting */}
      <div className="filter-bar">
        <div className="key-pills">
          {KEYS.map(k => (
            <button key={k} className={`kp ${selectedKey===k?'active':''}`}
              onClick={() => setSelectedKey(k)}>{k}</button>
          ))}
        </div>
        
        <select className="sort-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="title">{t('songs.sortTitle')}</option>
          <option value="recent">⏱ {t('songs.sortRecent')}</option>
          <option value="bpm">{t('songs.sortBpm')}</option>
          <option value="key">{t('songs.sortKey')}</option>
        </select>
      </div>

      {/* Song list — pure divs, NO table */}
      <div className="song-list-wrap">

        <div className="song-row header-row">
          <div className="col-name">{t('songs.tableTitle')}</div>
          <div className="col-key">{t('songs.tableKey')}</div>
          <div className="col-bpm sw-desk-only">{t('songs.tableBpm')}</div>
          <div className="col-artist sw-desk-only">{t('songs.tableAuthor')}</div>
          <div className="col-date sw-desk-only">{t('songs.tableAdded')}</div>
          <div className="col-act"></div>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="list-placeholder">{t('songs.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="list-placeholder">{t('songs.noResults')}</div>
        ) : (
          <>
            {visibleSongs.map((song, idx) => (
              <div key={song.id} className="song-row data-row"
                onClick={() => navigate(`/song/${song.id}`)}>

            <div className="col-name">
              <div
                className="s-avatar"
                style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
              >
                {song.title?.charAt(0)?.toUpperCase()}
              </div>
              <div className="s-name-block">
                <span className="s-title">{song.title}</span>
                <span className="s-artist-sm sw-desk-hide">{song.artist}</span>
              </div>
            </div>

            <div className="col-key">
              {song.song_key
                ? <span className="key-badge">{song.song_key}</span>
                : <span className="dim">—</span>}
            </div>

            <div className="col-bpm sw-desk-only dim">{Number.parseInt(song.bpm, 10) > 0 ? song.bpm : '—'}</div>
            <div className="col-artist sw-desk-only dim">{song.artist || ''}</div>
            <div className="col-date sw-desk-only dim">{getTimeAgo(song.created_at)}</div>

            <div className="col-act" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button 
                className={`icon-btn fav-btn ${favorites.has(parseInt(song.id)) ? 'is-fav' : ''}`} 
                onClick={(e) => toggleFavorite(e, parseInt(song.id))} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px' }}
                title={favorites.has(parseInt(song.id)) ? 'Հեռացնել' : 'Պահպանել'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" 
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
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '20px' }}>
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
