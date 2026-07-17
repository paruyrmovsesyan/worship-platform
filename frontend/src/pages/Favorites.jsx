import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { DEFAULT_SAVED_SONG_SORT, normalizeSavedSongSort, sortSavedSongs } from '../utils/savedSongs';
import { usePageReady } from '../hooks/usePageReady';
import './Favorites.css';

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [activeKeyFilter, setActiveKeyFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => normalizeSavedSongSort(localStorage.getItem('favorites_sort') || DEFAULT_SAVED_SONG_SORT));
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  usePageReady(loading);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const loadFavorites = useCallback(() => {
    if (!user) {
      setSongs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch('/user_favorites_api.php?action=get_favorites')
      .then(res => {
        if (!res.ok) throw new Error('API fetch failed');
        return res.json();
      })
      .then(data => {
        setSongs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(t('favorites.errorLoad'));
        setLoading(false);
      });
  }, [user, t]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const availableKeys = useMemo(() => {
    const counts = new Map();
    songs.forEach(song => {
      const key = song.target_key || song.song_key;
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([key]) => key);
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const keyFiltered = activeKeyFilter === 'all'
      ? songs
      : songs.filter(song => (song.target_key || song.song_key) === activeKeyFilter);

    return sortSavedSongs(
      keyFiltered,
      sortBy,
      song => getLocalizedTitle(song, language),
      language
    );
  }, [activeKeyFilter, language, songs, sortBy]);

  const handleSortChange = (event) => {
    const nextSort = normalizeSavedSongSort(event.target.value);
    setSortBy(nextSort);
    localStorage.setItem('favorites_sort', nextSort);
  };

  const sortOptions = [
    ['saved_newest', t('favorites.sortSavedNewest')],
    ['saved_oldest', t('favorites.sortSavedOldest')],
    ['title_asc', t('favorites.sortTitle')],
    ['artist_asc', t('favorites.sortArtist')],
    ['key_asc', t('favorites.sortKey')],
    ['bpm_asc', t('favorites.sortBpmAsc')],
    ['bpm_desc', t('favorites.sortBpmDesc')],
  ];
  const activeSortLabel = sortOptions.find(([value]) => value === sortBy)?.[1] || sortOptions[0][1];

  useEffect(() => {
    if (!filterOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.body.classList.add('favorites-filter-open');
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('favorites-filter-open');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [filterOpen]);

  const openSavedSong = (songId) => {
    const params = new URLSearchParams({ list: 'favorites', sort: sortBy });
    if (activeKeyFilter !== 'all') params.set('key', activeKeyFilter);
    navigate(`/song/${songId}?${params.toString()}`);
  };

  useEffect(() => {
    if (activeKeyFilter === 'all') return;
    if (!availableKeys.includes(activeKeyFilter)) {
      setActiveKeyFilter('all');
    }
  }, [activeKeyFilter, availableKeys]);

  const removeFavorite = async (songId) => {
    if (!window.confirm(t('favorites.confirmRemove'))) return;
    try {
      const res = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId })
      });
      const data = await res.json();
      if (!res.ok || typeof data.favorite !== 'boolean') {
        throw new Error(data.error || 'Favorite update failed');
      }
      if (data.favorite === false) {
        setSongs(prev => prev.filter(s => String(s.id) !== String(songId)));
      }
    } catch (err) {
      console.error(err);
      setError(t('favorites.errorLoad'));
    }
  };

  if (!user) {
    return (
      <div className="favorites-page favorites-guest-page">
        <div className="fav-empty animate-fade-in">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>{t('favorites.loginTitle')}</h3>
          <p>{t('favorites.loginPrompt')}</p>
          <Link to="/login" className="fav-cta-btn">{t('favorites.loginBtn')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Hero Header */}
      <div className="fav-hero">
        <div className="fav-hero-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div className="fav-hero-info">
          <span className="fav-hero-type">{t('favorites.playlist')}</span>
          <h1 className="fav-hero-title">{t('favorites.title')}</h1>
          <div className="fav-hero-meta">
            <span>{user?.name || 'User'}</span> • {songs.length} {t('favorites.savedSongs')}
          </div>
        </div>
      </div>

      <div className="fav-content">
        {/* Play Action Row */}
        {songs.length > 0 && !loading && (
          <div className="fav-action-row animate-fade-in">
            <button
              className="fav-action-pill primary"
              onClick={() => filteredSongs[0] && openSavedSong(filteredSongs[0].id)}
              disabled={filteredSongs.length === 0}
            >
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>{t('favorites.openFirst')}</span>
            </button>
            <button className="fav-action-pill secondary" onClick={() => navigate('/songs')}>
              <span>{t('favorites.browseSongs')}</span>
            </button>
          </div>
        )}

        {songs.length > 0 && !loading && (
          <button className="fav-filter-trigger animate-fade-in" type="button" onClick={() => setFilterOpen(true)}>
            <span className="fav-filter-trigger-icon">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </span>
            <span className="fav-filter-trigger-copy">
              <strong>{t('favorites.filterAndSort')}</strong>
              <small>{activeSortLabel}{activeKeyFilter !== 'all' ? ` · ${activeKeyFilter}` : ''}</small>
            </span>
            {activeKeyFilter !== 'all' && <span className="fav-filter-count">1</span>}
            <svg className="fav-filter-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {loading ? (
          <div className="fav-track-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="fav-track-item skeleton-item">
                <div className="fav-track-img skeleton-box"></div>
                <div className="fav-track-info">
                  <div className="skeleton-line" style={{ width: '200px', height: '16px', marginBottom: '6px' }}></div>
                  <div className="skeleton-line" style={{ width: '120px', height: '12px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="fav-empty animate-fade-in">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>{error}</h3>
            <button className="fav-cta-btn" onClick={loadFavorites}>{t('favorites.retry')}</button>
          </div>
        ) : (
          <div className="fav-track-list">
            {filteredSongs.map((song, idx) => (
              <div 
                key={song.id} 
                className="fav-track-item animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
                onClick={() => openSavedSong(song.id)}
              >
                <div className="fav-track-num">{idx + 1}</div>

                <div
                  className="fav-track-img"
                  style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
                >
                  <span className="fav-track-key">{song.target_key || song.song_key || '?'}</span>
                </div>

                <div className="fav-track-info">
                  <div className="fav-track-title">{getLocalizedTitle(song, language)}</div>
                  <div className="fav-track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</div>
                </div>
                
                <div className="fav-track-meta">
                  {(song.target_key || song.song_key) && <span className="fav-track-badge">{song.target_key || song.song_key}</span>}
                  {Number.parseInt(song.bpm, 10) > 0 && <span className="fav-track-badge fav-track-bpm">BPM {song.bpm}</span>}
                  
                  <button 
                    className="fav-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(song.id);
                    }}
                    title={t('favorites.removeFromFav', 'Remove')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {songs.length === 0 && (
              <div className="fav-empty animate-fade-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <h3>{t('favorites.noFavorites')}</h3>
                <p>{t('favorites.emptyDesc')}</p>
                <button className="fav-cta-btn" onClick={() => navigate('/songs')}>{t('favorites.browseSongs')}</button>
              </div>
            )}

            {songs.length > 0 && filteredSongs.length === 0 && (
              <div className="fav-empty animate-fade-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 5h18"></path>
                  <path d="M6 12h12"></path>
                  <path d="M10 19h4"></path>
                </svg>
                <h3>{t('favorites.noFilterResults')}</h3>
                <p>{t('favorites.noFilterResultsDesc')}</p>
                <button className="fav-cta-btn" onClick={() => setActiveKeyFilter('all')}>{t('favorites.filterReset')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {filterOpen && createPortal(
        <div className="fav-filter-backdrop" role="presentation" onMouseDown={() => setFilterOpen(false)}>
          <section className="fav-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="fav-filter-title" onMouseDown={event => event.stopPropagation()}>
            <div className="fav-filter-sheet-handle" aria-hidden="true" />
            <header className="fav-filter-sheet-header">
              <h2 id="fav-filter-title">{t('favorites.filterAndSort')}</h2>
              <button type="button" className="fav-filter-close" onClick={() => setFilterOpen(false)} aria-label={t('common.close', 'Փակել')}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="fav-filter-section">
              <label htmlFor="favorites-sort">{t('favorites.sortLabel')}</label>
              <div className="fav-filter-select-wrap">
                <select id="favorites-sort" value={sortBy} onChange={handleSortChange}>
                  {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>

            <div className="fav-filter-section">
              <span className="fav-filter-section-label">{t('favorites.keyFilter')}</span>
              <div className="fav-filter-key-grid">
                <button type="button" className={activeKeyFilter === 'all' ? 'active' : ''} onClick={() => setActiveKeyFilter('all')}>{t('favorites.filterAll')}</button>
                {availableKeys.map(key => (
                  <button key={key} type="button" className={activeKeyFilter === key ? 'active' : ''} onClick={() => setActiveKeyFilter(key)}>{key}</button>
                ))}
              </div>
            </div>

            <footer className="fav-filter-sheet-actions">
              <button type="button" className="fav-filter-reset" onClick={() => {
                setActiveKeyFilter('all');
                setSortBy(DEFAULT_SAVED_SONG_SORT);
                localStorage.setItem('favorites_sort', DEFAULT_SAVED_SONG_SORT);
              }}>{t('favorites.resetFilters')}</button>
              <button type="button" className="fav-filter-apply" onClick={() => setFilterOpen(false)}>{t('favorites.applyFilters')}</button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
