import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { DEFAULT_SAVED_SONG_SORT, normalizeSavedSongSort, sortSavedSongs } from '../utils/savedSongs';
import { usePageReady } from '../hooks/usePageReady';
import { matchSongSearch } from '../utils/searchMatcher';
import './Favorites.css';
import './SongsWeb.css';

export default function FavoritesWeb() {
  // 1. Instant hydration from localStorage cache
  const [songs, setSongs] = useState(() => {
    try {
      const cached = localStorage.getItem('wp_user_favorites_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeKeyFilter, setActiveKeyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(() => normalizeSavedSongSort(localStorage.getItem('favorites_sort') || DEFAULT_SAVED_SONG_SORT));
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('wp_user_favorites_cache');
      return !(cached && JSON.parse(cached).length > 0);
    } catch {
      return true;
    }
  });

  usePageReady(loading);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  // Add to setlist modal state
  const [setlistModalSong, setSetlistModalSong] = useState(null);
  const [userSetlists, setUserSetlists] = useState([]);
  const [setlistsLoading, setSetlistsLoading] = useState(false);
  const [setlistSearch, setSetlistSearch] = useState('');
  const [addingSetlistId, setAddingSetlistId] = useState(null);
  const [addedSetlistIds, setAddedSetlistIds] = useState({});
  const [isCreatingSetlist, setIsCreatingSetlist] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState('');
  const [createSetlistLoading, setCreateSetlistLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadFavorites = useCallback(() => {
    if (!user) {
      setSongs([]);
      setLoading(false);
      return;
    }

    fetch('/user_favorites_api.php?action=get_favorites')
      .then(res => {
        if (!res.ok) throw new Error('API fetch failed');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setSongs(data);
          try {
            localStorage.setItem('wp_user_favorites_cache', JSON.stringify(data));
          } catch {}
        }
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
    let list = songs;

    if (searchQuery.trim()) {
      list = list.filter(song => matchSongSearch(song, searchQuery));
    }

    if (activeKeyFilter !== 'all') {
      list = list.filter(song => (song.target_key || song.song_key) === activeKeyFilter);
    }

    return sortSavedSongs(
      list,
      sortBy,
      song => getLocalizedTitle(song, language),
      language
    );
  }, [songs, searchQuery, activeKeyFilter, sortBy, language]);

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

  const handleRandomSong = () => {
    const pool = filteredSongs.length > 0 ? filteredSongs : songs;
    if (!pool.length) return;
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    if (rnd?.id) openSavedSong(rnd.id);
  };

  useEffect(() => {
    if (activeKeyFilter === 'all') return;
    if (!availableKeys.includes(activeKeyFilter)) {
      setActiveKeyFilter('all');
    }
  }, [activeKeyFilter, availableKeys]);

  const removeFavorite = async (songId) => {
    const numId = parseInt(songId, 10);
    const previousSongs = [...songs];
    setSongs(prev => prev.filter(s => parseInt(s.id || s.song_id, 10) !== numId));

    try {
      const res = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: numId })
      });
      const data = await res.json();
      if (!res.ok || typeof data.favorite !== 'boolean') {
        throw new Error(data.error || 'Favorite update failed');
      }

      try {
        const updated = previousSongs.filter(s => parseInt(s.id || s.song_id, 10) !== numId);
        localStorage.setItem('wp_user_favorites_cache', JSON.stringify(updated));
      } catch {}
    } catch (err) {
      setSongs(previousSongs);
      setError(t('favorites.errorLoad'));
    }
  };

  // Add to setlist operations
  const openSetlistModalForSong = async (e, song) => {
    e.stopPropagation();
    setSetlistModalSong(song);
    setSetlistSearch('');
    setIsCreatingSetlist(false);
    setNewSetName('');
    setNewSetDate('');
    setSetlistsLoading(true);
    try {
      const res = await fetch('/setlists_api.php?action=get_setlists', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserSetlists(data);
      } else if (data?.ok) {
        setUserSetlists(data.setlists || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSetlistsLoading(false);
    }
  };

  const addSongToSetlist = async (setId) => {
    if (addingSetlistId || !setlistModalSong) return;
    setAddingSetlistId(setId);
    try {
      const res = await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: setId,
          song_id: Number(setlistModalSong.id),
          target_key: setlistModalSong.target_key || setlistModalSong.song_key || null,
          capo: null
        })
      });
      const data = await res.json();
      if (data?.ok) {
        setAddedSetlistIds(prev => ({ ...prev, [setId]: true }));
        setUserSetlists(prev => prev.map(s => s.id === setId ? { ...s, items_count: (s.items_count || 0) + 1 } : s));
        setToastMsg(language === 'am' ? '✓ Երգն ավելացվեց երգացանկում' : '✓ Added to setlist');
        setTimeout(() => setToastMsg(''), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSetlistId(null);
    }
  };

  const handleCreateAndAddSetlist = async (e) => {
    e.preventDefault();
    const nameTrimmed = newSetName.trim();
    if (!nameTrimmed || createSetlistLoading || !setlistModalSong) return;
    setCreateSetlistLoading(true);

    try {
      const createRes = await fetch('/setlists_api.php?action=create_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrimmed,
          service_date: newSetDate || null
        })
      });
      const createData = await createRes.json();
      if (!createData?.ok || !createData.id) {
        throw new Error(createData?.message || createData?.error || 'Failed to create setlist');
      }

      const newId = Number(createData.id);
      await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: newId,
          song_id: Number(setlistModalSong.id),
          target_key: setlistModalSong.target_key || setlistModalSong.song_key || null,
          capo: null
        })
      });

      setAddedSetlistIds(prev => ({ ...prev, [newId]: true }));
      setToastMsg(language === 'am' ? '✓ Ստեղծվեց և ավելացվեց' : '✓ Created and added');
      setTimeout(() => setToastMsg(''), 2500);

      const newSl = {
        id: newId,
        name: nameTrimmed,
        service_date: newSetDate || null,
        items_count: 1,
        can_edit: 1,
        access_role: 'owner'
      };
      setUserSetlists(prev => [newSl, ...prev]);
      setIsCreatingSetlist(false);
      setNewSetName('');
      setNewSetDate('');
    } catch (err) {
      alert(err.message || 'Error creating setlist');
    } finally {
      setCreateSetlistLoading(false);
    }
  };

  const filteredSetlists = useMemo(() => {
    if (!setlistSearch.trim()) return userSetlists;
    const q = setlistSearch.toLowerCase();
    return userSetlists.filter(sl => (sl.name || '').toLowerCase().includes(q));
  }, [userSetlists, setlistSearch]);

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
        {/* Search and Play Action Row */}
        {songs.length > 0 && (
          <div className="fav-web-controls animate-fade-in">
            <div className="fav-web-search">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={t('songs.search', 'Որոնել պահպանված երգերում...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="fav-web-search-x" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="fav-action-row">
              <button
                className="fav-action-pill primary"
                onClick={() => filteredSongs[0] && openSavedSong(filteredSongs[0].id)}
                disabled={filteredSongs.length === 0}
              >
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <span>{t('favorites.openFirst')}</span>
              </button>
              <button className="fav-action-pill secondary" onClick={handleRandomSong}>
                <span>🎲 {language === 'am' ? 'Պատահական' : 'Random'}</span>
              </button>
              <button className="fav-action-pill secondary" onClick={() => navigate('/songs')}>
                <span>{t('favorites.browseSongs')}</span>
              </button>
            </div>
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
                  
                  {/* Quick Add to Setlist button */}
                  <button
                    type="button"
                    className="fav-setlist-quick-btn"
                    onClick={(e) => openSetlistModalForSong(e, song)}
                    title={t('songView.addToSetlist', 'Ավելացնել երգացանկում')}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="16" y1="16" x2="16" y2="22"></line>
                      <line x1="13" y1="19" x2="19" y2="19"></line>
                    </svg>
                  </button>

                  {/* Remove from favorites */}
                  <button 
                    type="button"
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
                <button className="fav-cta-btn" onClick={() => { setActiveKeyFilter('all'); setSearchQuery(''); }}>
                  {t('favorites.filterReset', 'Մաքրել ֆիլտրերը')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Modal Sheet */}
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

      {/* Setlist Modal (Web) */}
      {setlistModalSong && createPortal(
        <div className="sw-modal-overlay" onClick={() => setSetlistModalSong(null)}>
          <div className="sw-modal-content animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="sw-modal-header">
              <div className="sw-modal-header-info">
                <h3>{language === 'am' ? 'Ավելացնել երգացանկում' : 'Add to Setlist'}</h3>
                <span className="sw-modal-song-name">
                  {getLocalizedTitle(setlistModalSong, language)}
                  {(setlistModalSong.target_key || setlistModalSong.song_key) && ` • Տոն՝ ${setlistModalSong.target_key || setlistModalSong.song_key}`}
                </span>
              </div>
              <button
                type="button"
                className="sw-modal-close-btn"
                onClick={() => setSetlistModalSong(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="sw-modal-toolbar">
              <input
                type="text"
                className="sw-modal-search"
                placeholder={language === 'am' ? 'Փնտրել երգացանկ...' : 'Search setlists...'}
                value={setlistSearch}
                onChange={e => setSetlistSearch(e.target.value)}
              />
              <button
                type="button"
                className={`sw-modal-new-toggle ${isCreatingSetlist ? 'active' : ''}`}
                onClick={() => setIsCreatingSetlist(!isCreatingSetlist)}
              >
                {isCreatingSetlist ? '✕' : '➕ Նոր'}
              </button>
            </div>

            {/* Inline Creation Box */}
            {isCreatingSetlist && (
              <form className="sw-modal-create-form" onSubmit={handleCreateAndAddSetlist}>
                <div className="sw-modal-create-inputs">
                  <input
                    type="text"
                    placeholder="Երգացանկի անուն *"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    autoFocus
                    required
                  />
                  <input
                    type="date"
                    value={newSetDate}
                    onChange={e => setNewSetDate(e.target.value)}
                  />
                </div>
                <div className="sw-modal-create-btns">
                  <button type="button" onClick={() => setIsCreatingSetlist(false)}>Չեղարկել</button>
                  <button type="submit" disabled={createSetlistLoading || !newSetName.trim()}>
                    {createSetlistLoading ? '...' : 'Ստեղծել և ավելացնել'}
                  </button>
                </div>
              </form>
            )}

            {/* Setlists List */}
            <div className="sw-modal-list">
              {setlistsLoading ? (
                <div className="sw-modal-loading">
                  <div className="sw-spinner-sm"></div>
                </div>
              ) : filteredSetlists.length > 0 ? (
                filteredSetlists.map(sl => {
                  const isAdded = !!addedSetlistIds[sl.id];
                  const isAdding = addingSetlistId === sl.id;

                  return (
                    <div
                      key={sl.id}
                      className={`sw-modal-row ${isAdded ? 'added' : ''}`}
                      onClick={() => !isAdding && !isAdded && addSongToSetlist(sl.id)}
                    >
                      <div className="sw-modal-row-info">
                        <span className="sw-modal-row-title">{sl.name}</span>
                        <span className="sw-modal-row-date">
                          {sl.service_date ? `📅 ${sl.service_date}` : 'Անամսաթիվ'} • {sl.items_count || 0} երգ
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`sw-modal-row-btn ${isAdded ? 'added' : ''}`}
                        disabled={isAdding || isAdded}
                      >
                        {isAdding ? '...' : isAdded ? '✓ Ավելացվեց' : '+ Ավելացնել'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="sw-modal-empty">
                  {language === 'am' ? 'Երգացանկեր չեն գտնվել' : 'No setlists found'}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toastMsg && createPortal(
        <div className="fav-toast animate-fade-in">{toastMsg}</div>,
        document.body
      )}
    </div>
  );
}
