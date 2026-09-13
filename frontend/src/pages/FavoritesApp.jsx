import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { matchSongSearch } from '../utils/searchMatcher';
import './FavoritesApp.css';

export default function FavoritesApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  // Instant hydration from cache
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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKey, setActiveKey] = useState('All');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('favorites_app_sort') || 'recent');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Add to Setlist Modal state
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

  // Fetch fresh favorites
  useEffect(() => {
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

  // Clean up modal class on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('songs-modal-open');
    };
  }, []);

  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const top = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
      setShowBackToTop(top > 160);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Available distinct musical keys
  const availableKeys = useMemo(() => {
    const keys = new Set();
    songs.forEach(s => {
      const k = s.target_key || s.song_key;
      if (k && k.trim()) keys.add(k.trim());
    });
    return ['All', ...Array.from(keys)];
  }, [songs]);

  // Filtered & sorted songs
  const filteredSongs = useMemo(() => {
    return songs
      .filter(s => {
        // Search
        if (searchQuery.trim()) {
          const matchQ = matchSongSearch(s, searchQuery);
          if (!matchQ) return false;
        }

        // Key
        const sKey = s.target_key || s.song_key || '';
        if (activeKey !== 'All' && sKey !== activeKey) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          const tA = getLocalizedTitle(a, language) || a.title || '';
          const tB = getLocalizedTitle(b, language) || b.title || '';
          return tA.localeCompare(tB, language === 'am' ? 'hy' : language === 'ru' ? 'ru' : 'en');
        }
        if (sortBy === 'artist') {
          return (a.artist || '').localeCompare(b.artist || '');
        }
        if (sortBy === 'bpm_desc') return (parseInt(b.bpm, 10) || 0) - (parseInt(a.bpm, 10) || 0);
        if (sortBy === 'bpm_asc') return (parseInt(a.bpm, 10) || 0) - (parseInt(b.bpm, 10) || 0);
        if (sortBy === 'key') {
          const kA = a.target_key || a.song_key || '';
          const kB = b.target_key || b.song_key || '';
          return kA.localeCompare(kB);
        }
        // default: recent / saved newest
        return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
      });
  }, [songs, searchQuery, activeKey, sortBy, language]);

  const handleSortChange = (e) => {
    const nextSort = e.target.value;
    setSortBy(nextSort);
    try {
      localStorage.setItem('favorites_app_sort', nextSort);
    } catch {}
  };

  const removeFavorite = async (e, songId) => {
    if (e) {
      try { e.preventDefault(); } catch {}
      try { e.stopPropagation(); } catch {}
    }
    const numId = parseInt(songId, 10);

    // Optimistic UI removal
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
        throw new Error(data.error || 'Update failed');
      }

      // Update cache
      try {
        const updated = previousSongs.filter(s => parseInt(s.id || s.song_id, 10) !== numId);
        localStorage.setItem('wp_user_favorites_cache', JSON.stringify(updated));
      } catch {}
    } catch {
      // Rollback on error
      setSongs(previousSongs);
    }
  };

  const openSavedSong = (songId) => {
    navigate(`/song/${songId}`);
  };

  // Random favorite song
  const handleRandomSong = () => {
    const pool = filteredSongs.length > 0 ? filteredSongs : songs;
    if (!pool.length) return;
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    if (rnd?.id) openSavedSong(rnd.id);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setActiveKey('All');
    setSortBy('recent');
  };

  // Add to Setlist Modal handlers
  const openSetlistModalForSong = async (e, song) => {
    if (e) {
      try { e.preventDefault(); } catch {}
      try { e.stopPropagation(); } catch {}
    }
    setSetlistModalSong(song);
    setSetlistSearch('');
    setIsCreatingSetlist(false);
    setNewSetName('');
    setNewSetDate('');
    setSetlistsLoading(true);
    document.body.classList.add('songs-modal-open');
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

  const closeSetlistModal = () => {
    setSetlistModalSong(null);
    document.body.classList.remove('songs-modal-open');
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
        setToastMsg(language === 'am' ? '✓ Երգն ավելացվեց երգացանկում' : language === 'ru' ? '✓ Добавлено в сет-лист' : '✓ Added to setlist');
        setTimeout(() => setToastMsg(''), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSetlistId(null);
    }
  };

  const handleCreateAndAddSetlist = async (e) => {
    if (e) e.preventDefault();
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

  const hasActiveFilters = searchQuery.trim() || activeKey !== 'All';

  if (!user) {
    return (
      <div className="fav-app-page fav-guest-page">
        <div className="fav-empty-card animate-fade-in">
          <div className="fav-empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h3>{t('favorites.loginTitle', 'Մուտք գործեք')}</h3>
          <p>{t('favorites.loginPrompt', 'Մուտք գործեք՝ ձեր պահպանված երգերը տեսնելու և սինքրոնացնելու համար:')}</p>
          <Link to="/login" className="fav-primary-btn">{t('favorites.loginBtn', 'Մուտք')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fav-app-page animate-fade-in">

      {/* Header */}
      <div className="fav-app-header">
        <div className="fav-app-header-top">
          <h1 className="fav-app-title">
            {t('favorites.title', 'Պահպանված երգեր')}
            <span className="fav-count-badge">{songs.length}</span>
          </h1>

          <div className="fav-header-actions">
            {songs.length > 0 && (
              <button 
                type="button"
                className="fav-random-btn"
                onClick={handleRandomSong}
                title={language === 'am' ? 'Պատահական երգ' : 'Random Song'}
                aria-label={language === 'am' ? 'Պատահական երգ' : 'Random Song'}
              >
                <span>🎲</span>
                <span className="desk-only-inline">{language === 'am' ? 'Պատահական' : 'Random'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {songs.length > 0 && (
          <div className="fav-search-box">
            <svg className="fav-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={t('songs.search', 'Որոնել պահպանված երգերում...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button 
                type="button"
                className="fav-search-x" 
                onClick={() => setSearchQuery('')}
                aria-label="Մաքրել որոնումը"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs (Seamless PWA Experience) */}
      <div className="fav-app-tabs">
        <button 
          className="fav-app-tab"
          type="button"
          onClick={() => navigate('/songs')}
        >
          {t('hub.categories.songs', 'Երգարան')}
        </button>
        <button 
          className="fav-app-tab active"
          type="button"
        >
          {t('favorites.title', 'Պահպանված երգեր')}
        </button>
        <button
          className="fav-app-tab"
          type="button"
          onClick={() => navigate('/transpose')}
        >
          {t('nav.transposer', 'Տրանսպոզեր')}
        </button>
      </div>

      {/* Filter and Key Selector Row */}
      {songs.length > 0 && (
        <div className="fav-filter-bar">
          {availableKeys.length > 1 && (
            <div className="fav-key-scroll">
              <div className="fav-key-pills">
                {availableKeys.map(k => (
                  <button 
                    key={k} 
                    type="button" 
                    className={`fav-kp ${activeKey === k ? 'active' : ''}`}
                    onClick={() => setActiveKey(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="fav-sort-row">
            <select className="fav-sort-select" value={sortBy} onChange={handleSortChange}>
              <option value="recent">⏱ {t('favorites.sortSavedNewest', 'Վերջին ավելացված')}</option>
              <option value="title">🔤 {t('favorites.sortTitle', 'Այբբենական')}</option>
              <option value="artist">👤 {t('favorites.sortArtist', 'Հեղինակ')}</option>
              <option value="bpm_desc">⚡ Տեմպ (արագից դանդաղ)</option>
              <option value="bpm_asc">🕊 Տեմպ (դանդաղից արագ)</option>
              <option value="key">🎵 {t('favorites.sortKey', 'Տոնայնություն')}</option>
            </select>

            {hasActiveFilters && (
              <button 
                type="button" 
                className="fav-reset-btn"
                onClick={resetFilters}
              >
                ✕ {language === 'am' ? 'Մաքրել' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Track List */}
      <div className="fav-track-list">
        {loading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="fav-track-item skeleton-item">
                <div className="fav-track-cover skeleton-box"></div>
                <div className="fav-track-info">
                  <div className="skeleton-line" style={{ width: '70%', height: '16px', marginBottom: '6px' }}></div>
                  <div className="skeleton-line" style={{ width: '40%', height: '12px' }}></div>
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="fav-empty-card animate-fade-in">
            <p>{error}</p>
            <button className="fav-primary-btn" onClick={() => window.location.reload()}>{t('favorites.retry', 'Փորձել կրկին')}</button>
          </div>
        ) : songs.length === 0 ? (
          <div className="fav-empty-card animate-fade-in">
            <div className="fav-empty-icon-wrap">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <h3>{t('favorites.noFavorites', 'Դեռ երգեր չկան')}</h3>
            <p>{t('favorites.emptyDesc', 'Դուք դեռ չունեք պահպանված երգեր: Ավելացրեք սիրելի երգերը՝ սրտիկի վրա սեղմելով:')}</p>
            <button className="fav-primary-btn" onClick={() => navigate('/songs')}>
              {t('favorites.browseSongs', 'Դիտել երգարանը')}
            </button>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="fav-empty-card animate-fade-in">
            <div className="fav-empty-icon-wrap">
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3>{t('favorites.noFilterResults', 'Երգ չի գտնվել')}</h3>
            <p>{t('favorites.noFilterResultsDesc', 'Փորձեք փոխել որոնման բառը կամ մաքրել ֆիլտրերը:')}</p>
            <button className="fav-primary-btn" onClick={resetFilters}>
              {language === 'am' ? 'Մաքրել ֆիլտրերը' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          filteredSongs.map((song, idx) => {
            const keyLabel = song.target_key || song.song_key;

            return (
              <div 
                key={song.id} 
                className="fav-track-item animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 0.02, 0.3)}s` }}
                onClick={() => openSavedSong(song.id)}
              >
                <div className="fav-track-num desk-only dim">
                  {(idx + 1).toString().padStart(2, '0')}
                </div>

                <div
                  className="fav-track-cover"
                  style={getSongCoverStyle(song.id || idx, song.title || keyLabel || '')}
                >
                  {song.title?.charAt(0)?.toUpperCase()}
                </div>

                <div className="fav-track-info">
                  <span className="fav-track-title">{getLocalizedTitle(song, language)}</span>
                  <div className="fav-track-sub">
                    <span className="fav-track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</span>
                    <div className="fav-track-tags">
                      {keyLabel && <span className="fav-key-tag">{keyLabel}</span>}
                      {Number.parseInt(song.bpm, 10) > 0 && (
                        <span className="fav-bpm-tag">{song.bpm} BPM</span>
                      )}
                    </div>
                  </div>
                </div>

                <div 
                  className="fav-track-actions"
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                  {/* Quick Add to Setlist */}
                  <button
                    type="button"
                    className="fav-action-btn setlist-btn"
                    onClick={(e) => openSetlistModalForSong(e, song)}
                    title={t('songView.addToSetlist', 'Ավելացնել երգացանկում')}
                    aria-label={t('songView.addToSetlist', 'Ավելացնել երգացանկում')}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="16" y1="16" x2="16" y2="22"></line>
                      <line x1="13" y1="19" x2="19" y2="19"></line>
                    </svg>
                  </button>

                  {/* Remove heart */}
                  <button 
                    type="button"
                    className="fav-action-btn heart-btn active"
                    onClick={(e) => removeFavorite(e, song.id)}
                    title={t('favorites.removeFromFav', 'Remove')}
                    aria-label={t('favorites.removeFromFav', 'Remove')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Back to Top */}
      {showBackToTop && createPortal(
        <button
          type="button"
          className="fav-back-to-top"
          onClick={scrollToTop}
          aria-label={t('songs.backToTop', 'Բարձրանալ վերև')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>,
        document.body
      )}

      {/* Toast Notification */}
      {toastMsg && createPortal(
        <div className="fav-toast animate-fade-in">
          {toastMsg}
        </div>,
        document.body
      )}

      {/* Add to Setlist Bottom Sheet Modal */}
      {setlistModalSong && createPortal(
        <div className="sla-modal-overlay" onClick={closeSetlistModal}>
          <div className="sla-modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sla-modal-handle"></div>

            {/* Header */}
            <div className="sla-modal-header">
              <div className="sla-modal-header-info">
                <h2 className="sla-modal-title">{t('songView.addToSetlist', 'Ավելացնել երգացանկում')}</h2>
                <div className="sla-modal-song-badge">
                  <span className="sla-modal-song-name">{getLocalizedTitle(setlistModalSong, language)}</span>
                  {(setlistModalSong.target_key || setlistModalSong.song_key) && (
                    <span className="sla-modal-key-pill">{setlistModalSong.target_key || setlistModalSong.song_key}</span>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                className="sla-modal-close-btn" 
                onClick={closeSetlistModal}
                aria-label="Փակել"
              >
                ✕
              </button>
            </div>

            {/* Setlist Search */}
            {userSetlists.length > 3 && (
              <div className="sla-modal-search">
                <input
                  type="text"
                  placeholder="Փնտրել երգացանկ..."
                  value={setlistSearch}
                  onChange={e => setSetlistSearch(e.target.value)}
                />
              </div>
            )}

            {/* Setlists List */}
            <div className="sla-modal-body">
              {setlistsLoading ? (
                <div className="sla-modal-loading">
                  <div className="sla-spinner"></div>
                  <span>Բեռնվում են երգացանկերը...</span>
                </div>
              ) : filteredSetlists.length === 0 ? (
                <div className="sla-modal-empty">
                  {userSetlists.length === 0 ? 'Դուք դեռ չունեք ստեղծած երգացանկեր:' : 'Երգացանկ չի գտնվել:'}
                </div>
              ) : (
                <div className="sla-setlists-list">
                  {filteredSetlists.map(sl => {
                    const isAdded = !!addedSetlistIds[sl.id];
                    const isAdding = addingSetlistId === sl.id;

                    return (
                      <div key={sl.id} className="sla-setlist-item">
                        <div className="sla-setlist-meta">
                          <span className="sla-setlist-name">{sl.name}</span>
                          <span className="sla-setlist-sub">
                            {sl.items_count || 0} երգ {sl.service_date ? `• ${sl.service_date}` : ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`sla-add-btn ${isAdded ? 'added' : ''}`}
                          disabled={isAdding || isAdded}
                          onClick={() => addSongToSetlist(sl.id)}
                        >
                          {isAdding ? '...' : isAdded ? '✓ Ավելացված է' : '+ Ավելացնել'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Setlist Inline Accordion */}
            <div className="sla-modal-footer">
              {!isCreatingSetlist ? (
                <button
                  type="button"
                  className="sla-create-toggle-btn"
                  onClick={() => setIsCreatingSetlist(true)}
                >
                  <span className="sla-plus-circle">+</span>
                  <span>Ստեղծել նոր երգացանկ</span>
                </button>
              ) : (
                <form className="sla-create-form" onSubmit={handleCreateAndAddSetlist}>
                  <div className="sla-create-inputs">
                    <input
                      type="text"
                      className="sla-input"
                      placeholder="Երգացանկի անվանումը *"
                      value={newSetName}
                      onChange={e => setNewSetName(e.target.value)}
                      autoFocus
                      required
                    />
                    <input
                      type="date"
                      className="sla-input sla-input-date"
                      value={newSetDate}
                      onChange={e => setNewSetDate(e.target.value)}
                    />
                  </div>
                  <div className="sla-create-actions">
                    <button
                      type="button"
                      className="sla-btn-cancel"
                      onClick={() => setIsCreatingSetlist(false)}
                    >
                      Չեղարկել
                    </button>
                    <button
                      type="submit"
                      className="sla-btn-submit"
                      disabled={createSetlistLoading || !newSetName.trim()}
                    >
                      {createSetlistLoading ? '...' : 'Ստեղծել և ավելացնել'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
