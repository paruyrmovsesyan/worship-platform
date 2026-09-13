import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { matchSongSearch } from '../utils/searchMatcher';
import './SongsWeb.css';

export default function SongsWeb() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const timeText = useMemo(() => {
    return {
      am: { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' },
      en: { today: 'Today', yesterday: 'Yesterday', days: 'days ago', weeks: 'weeks ago', months: 'months ago', years: 'years ago' },
      ru: { today: 'Сегодня', yesterday: 'Вчера', days: 'дн. назад', weeks: 'нед. назад', months: 'мес. назад', years: 'лет назад' }
    }[language] || { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' };
  }, [language]);

  const getTimeAgo = useCallback((dateStr) => {
    if (!dateStr) return '—';
    const diffDays = Math.floor((new Date() - new Date(dateStr.replace(/-/g, '/'))) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return '—';
    if (diffDays <= 0) return timeText.today;
    if (diffDays === 1) return timeText.yesterday;
    if (diffDays < 7) return `${diffDays} ${timeText.days}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${timeText.weeks}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ${timeText.months}`;
    return `${Math.floor(diffDays / 365)} ${timeText.years}`;
  }, [timeText]);

  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  usePageReady(isLoading);

  // Filters and controls
  const [selectedKey, setSelectedKey] = useState('All');
  const [activeCategory, setActiveCategory] = useState('all'); // all, favorites, chords, lyrics, fast, slow
  const [sortBy, setSortBy] = useState('title');
  const [searchQuery, setSearchQuery] = useState(
    new URLSearchParams(location.search).get('q') || ''
  );
  const [visibleCount, setVisibleCount] = useState(24);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // View Mode: 'grid' or 'table'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('wp_web_songs_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('wp_web_songs_view_mode', mode);
    } catch {}
  };

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

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedKey, activeCategory, sortBy]);

  // Sync URL search param
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search]);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = document.querySelector('.sw-hero-search-input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Back to top scroll handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const targets = document.querySelectorAll('div, main, section, #root, .app-container');
    targets.forEach(el => {
      if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
      setShowBackToTop(scrollTop > 260);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hydrate songs & favorites
  useEffect(() => {
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
            setFavorites(new Set(d.map(f => parseInt(f.id, 10))));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Toggle favorite
  const toggleFavorite = async (e, songId) => {
    e.stopPropagation();
    if (!user) {
      navigate('/loginuser.php?next=/songs');
      return;
    }
    const isFav = favorites.has(songId);

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

  // Random song jump
  const handleRandomSong = () => {
    const pool = filtered.length > 0 ? filtered : songs;
    if (!pool.length) return;
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    if (rnd?.id) navigate(`/song/${rnd.id}`);
  };

  // Setlist modal operations
  const openSetlistModalForSong = async (e, song) => {
    e.stopPropagation();
    if (!user) {
      navigate('/loginuser.php?next=/songs');
      return;
    }
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
      } else if (data.ok) {
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
          target_key: setlistModalSong.song_key || null,
          capo: null
        })
      });
      const data = await res.json();
      if (data.ok) {
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
      if (!createData.ok || !createData.id) {
        throw new Error(createData.message || createData.error || 'Failed to create setlist');
      }

      const newId = Number(createData.id);
      await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: newId,
          song_id: Number(setlistModalSong.id),
          target_key: setlistModalSong.song_key || null,
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

  // Extract all musical keys present in catalog
  const availableKeys = useMemo(() => {
    const standardKeys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Am', 'Dm', 'Em', 'F#m', 'Bm'];
    const keySet = new Set(standardKeys);
    songs.forEach(s => {
      if (s.song_key && s.song_key.trim()) {
        keySet.add(s.song_key.trim());
      }
    });
    return ['All', ...Array.from(keySet)];
  }, [songs]);

  // Statistics
  const stats = useMemo(() => {
    const total = songs.length;
    let withChords = 0;
    let withLyrics = 0;
    songs.forEach(s => {
      if (s.chords && s.chords.trim().length > 0) withChords++;
      if ((s.lyrics && s.lyrics.trim().length > 0) || (s.chords && /[\u0530-\u058F\u0400-\u04FF]/.test(s.chords))) withLyrics++;
    });
    return {
      total,
      withChords,
      withLyrics,
      favoritesCount: favorites.size
    };
  }, [songs, favorites]);

  // Filter & Sort
  const filtered = useMemo(() => {
    return songs
      .filter(s => {
        const matchQ = matchSongSearch(s, searchQuery);
        if (!matchQ) return false;

        if (selectedKey !== 'All' && s.song_key !== selectedKey) {
          return false;
        }

        if (activeCategory === 'favorites' && !favorites.has(parseInt(s.id, 10))) {
          return false;
        }

        const hasChords = !!(s.chords && s.chords.trim().length > 0);
        const hasLyrics = !!(
          (s.lyrics && s.lyrics.trim().length > 0) ||
          (s.chords && /[\u0530-\u058F\u0400-\u04FF]/.test(s.chords))
        );

        if (activeCategory === 'chords' && !hasChords) {
          return false;
        }

        if (activeCategory === 'lyrics' && !hasLyrics) {
          return false;
        }

        const bpmNum = parseInt(s.bpm, 10) || 0;
        if (activeCategory === 'fast' && bpmNum < 100) {
          return false;
        }

        if (activeCategory === 'slow' && (bpmNum <= 0 || bpmNum > 100)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          const tA = getLocalizedTitle(a.title, language) || a.title || '';
          const tB = getLocalizedTitle(b.title, language) || b.title || '';
          return tA.localeCompare(tB, language === 'am' ? 'hy' : language === 'ru' ? 'ru' : 'en');
        }
        if (sortBy === 'recent') return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
        if (sortBy === 'bpm_asc') return (parseInt(a.bpm, 10) || 0) - (parseInt(b.bpm, 10) || 0);
        if (sortBy === 'bpm_desc') return (parseInt(b.bpm, 10) || 0) - (parseInt(a.bpm, 10) || 0);
        if (sortBy === 'key') return (a.song_key || '').localeCompare(b.song_key || '');
        return 0;
      });
  }, [songs, searchQuery, selectedKey, activeCategory, favorites, sortBy, language]);

  const visibleSongs = filtered.slice(0, visibleCount);

  return (
    <div className="songs-web-view songs-page">
      <div className="sw-container">

        {/* ── HERO BANNER ────────────────────────────────────────── */}
        <section className="sw-hero animate-fade-in">
          <div className="sw-hero-content">
            <div className="sw-hero-badge">
              <span className="sw-badge-dot"></span>
              <span>{language === 'am' ? 'Հոգևոր Երգերի Գրադարան' : language === 'ru' ? 'Библиотека Песен' : 'Worship Songs Library'}</span>
            </div>

            <h1 className="sw-hero-title">
              {t('songs.title')}
              <span className="sw-hero-count">{songs.length}</span>
            </h1>

            <p className="sw-hero-lead">
              {language === 'am'
                ? 'Ուսումնասիրեք, փնտրեք և կատարեք հոգևոր երգեր՝ ճշգրիտ ակորդներով, տոնայնություններով և տեմպով:'
                : language === 'ru'
                ? 'Изучайте, ищите и исполняйте песни прославления с точными аккордами, тональностями и темпом.'
                : 'Explore, search and practice worship songs with verified chords, transpositions, and tempo.'}
            </p>

            {/* Quick Actions in Hero */}
            <div className="sw-hero-actions">
              <button
                type="button"
                className="sw-action-btn sw-random-btn"
                onClick={handleRandomSong}
                title={language === 'am' ? 'Պատահական երգ' : 'Random Song'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"></polyline>
                  <line x1="4" y1="20" x2="21" y2="3"></line>
                  <polyline points="21 16 21 21 16 21"></polyline>
                  <line x1="15" y1="15" x2="21" y2="21"></line>
                  <line x1="4" y1="4" x2="9" y2="9"></line>
                </svg>
                <span>{language === 'am' ? '🎲 Պատահական երգ' : '🎲 Random Song'}</span>
              </button>

              <button
                type="button"
                className="sw-action-btn sw-suggest-btn"
                onClick={() => navigate('/song-request')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>{language === 'am' ? 'Առաջարկել նոր երգ' : 'Suggest Song'}</span>
              </button>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="sw-hero-stats">
            <div className="sw-stat-card">
              <span className="sw-stat-num">{stats.total}</span>
              <span className="sw-stat-lbl">{language === 'am' ? 'Երգեր' : 'Songs'}</span>
            </div>
            <div className="sw-stat-divider"></div>
            <div className="sw-stat-card">
              <span className="sw-stat-num">{stats.withChords}</span>
              <span className="sw-stat-lbl">{language === 'am' ? 'Ակորդներով' : 'Chords'}</span>
            </div>
            <div className="sw-stat-divider"></div>
            <div className="sw-stat-card">
              <span className="sw-stat-num">{stats.favoritesCount}</span>
              <span className="sw-stat-lbl">{language === 'am' ? 'Նախընտրած' : 'Saved'}</span>
            </div>
          </div>
        </section>

        {/* ── SEARCH & FILTER CONSOLE ─────────────────────────── */}
        <div className="sw-console-card">
          {/* Main Search Row */}
          <div className="sw-search-row">
            <div className="sw-search-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="sw-hero-search-input"
                placeholder={t('songs.search', 'Որոնել երգեր, հեղինակներ, խոսքեր...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="sw-search-right">
                {searchQuery ? (
                  <button
                    type="button"
                    className="sw-search-clear"
                    onClick={() => { setSearchQuery(''); navigate('/songs'); }}
                    title="Մաքրել"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="sw-search-shortcut" title="Սեղմեք / արագ որոնման համար">/</span>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="sw-sort-wrapper">
              <select className="sw-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="title">{language === 'am' ? '🔤 Անվանում (Ա-Ֆ)' : 'Title (A-Z)'}</option>
                <option value="recent">{language === 'am' ? '⏱ Վերջին ավելացված' : 'Newest'}</option>
                <option value="bpm_asc">{language === 'am' ? '🥁 Տեմպ (BPM աճող)' : 'BPM (Low-High)'}</option>
                <option value="bpm_desc">{language === 'am' ? '🥁 Տեմպ (BPM նվազող)' : 'BPM (High-Low)'}</option>
                <option value="key">{language === 'am' ? '🎵 Տոնայնություն' : 'Musical Key'}</option>
              </select>
            </div>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="sw-view-switcher">
              <button
                type="button"
                className={`sw-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('grid')}
                title={language === 'am' ? 'Քարտերով տեսք' : 'Grid View'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>
              <button
                type="button"
                className={`sw-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('table')}
                title={language === 'am' ? 'Աղյուսակով տեսք' : 'Table View'}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="18" x2="20" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="sw-category-tabs">
            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span>{language === 'am' ? 'Բոլորը' : 'All'}</span>
              <span className="sw-cat-count">{songs.length}</span>
            </button>

            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveCategory('favorites')}
            >
              <span>❤️ {language === 'am' ? 'Իմ ընտրանին' : 'Favorites'}</span>
              <span className="sw-cat-count">{favorites.size}</span>
            </button>

            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'chords' ? 'active' : ''}`}
              onClick={() => setActiveCategory('chords')}
            >
              <span>{language === 'am' ? 'Ակորդներով' : 'With Chords'}</span>
              <span className="sw-cat-count">{stats.withChords}</span>
            </button>

            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'lyrics' ? 'active' : ''}`}
              onClick={() => setActiveCategory('lyrics')}
            >
              <span>📄 {language === 'am' ? 'Տեքստեր' : 'Lyrics'}</span>
              <span className="sw-cat-count">{stats.withLyrics}</span>
            </button>

            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'fast' ? 'active' : ''}`}
              onClick={() => setActiveCategory('fast')}
            >
              <span>⚡ {language === 'am' ? 'Արագ տեմպ (100+)' : 'Fast'}</span>
            </button>

            <button
              type="button"
              className={`sw-cat-tab ${activeCategory === 'slow' ? 'active' : ''}`}
              onClick={() => setActiveCategory('slow')}
            >
              <span>🕊 {language === 'am' ? 'Խաղաղ (≤ 100)' : 'Slow'}</span>
            </button>
          </div>

          {/* Musical Key Pills */}
          <div className="sw-key-bar">
            <span className="sw-key-bar-label">{language === 'am' ? 'Տոնայնություն՝' : 'Key:'}</span>
            <div className="sw-key-scroll">
              {availableKeys.map(k => (
                <button
                  key={k}
                  type="button"
                  className={`sw-kp ${selectedKey === k ? 'active' : ''}`}
                  onClick={() => setSelectedKey(k)}
                >
                  {k === 'All' ? (language === 'am' ? 'Բոլորը' : 'All') : k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RESULTS SUMMARY ─────────────────────────────────── */}
        <div className="sw-results-meta">
          <span className="sw-results-text">
            {language === 'am'
              ? `Գտնվել է ${filtered.length} երգ`
              : `Found ${filtered.length} songs`}
            {(searchQuery || selectedKey !== 'All' || activeCategory !== 'all') && (
              <button
                type="button"
                className="sw-reset-filters-link"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKey('All');
                  setActiveCategory('all');
                }}
              >
                {language === 'am' ? 'Մաքրել ֆիլտրերը' : 'Reset filters'}
              </button>
            )}
          </span>
        </div>

        {/* ── MAIN CONTENT AREA ───────────────────────────────── */}
        {isLoading ? (
          <div className="sw-loading-box">
            <div className="sw-spinner"></div>
            <span>{t('songs.loading', 'Բեռնվում են երգերը...')}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sw-empty-box animate-fade-in">
            <div className="sw-empty-icon">🔍</div>
            <h3>{t('songs.noResults', 'Երգեր չեն գտնվել')}</h3>
            <p>
              {searchQuery
                ? `«${searchQuery}» հարցմամբ համապատասխան երգեր չկան:`
                : 'Փորձեք փոխել ընտրված տոնայնությունը կամ կատեգորիան:'}
            </p>
            <button
              type="button"
              className="sw-empty-reset-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedKey('All');
                setActiveCategory('all');
              }}
            >
              {language === 'am' ? 'Տեսնել բոլոր երգերը' : 'Show all songs'}
            </button>
          </div>
        ) : viewMode === 'grid' ? (

          /* ── 1. GRID CARDS VIEW ────────────────────────────── */
          <div className="sw-cards-grid animate-fade-in">
            {visibleSongs.map((song, idx) => {
              const isFav = favorites.has(parseInt(song.id, 10));
              const localizedTitle = getLocalizedTitle(song.title, language);
              const bpmNum = parseInt(song.bpm, 10);
              const hasChords = !!(song.chords && song.chords.trim().length > 0);

              return (
                <article
                  key={song.id}
                  className="sw-card"
                  onClick={() => navigate(`/song/${song.id}`)}
                >
                  <div className="sw-card-top">
                    <div
                      className="sw-card-avatar"
                      style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
                    >
                      {song.title?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="sw-card-badges">
                      {song.song_key && (
                        <span className="sw-badge-key" title="Տոնայնություն">{song.song_key}</span>
                      )}
                      {bpmNum > 0 && (
                        <span className="sw-badge-bpm" title="BPM">{bpmNum} bpm</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`sw-card-fav-btn ${isFav ? 'is-fav' : ''}`}
                      onClick={(e) => toggleFavorite(e, parseInt(song.id, 10))}
                      title={isFav ? 'Հեռացնել ընտրանուց' : 'Պահպանել ընտրանում'}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="sw-card-body">
                    <h3 className="sw-card-title" title={localizedTitle}>
                      {localizedTitle}
                    </h3>
                    <p className="sw-card-artist">
                      {song.artist || (language === 'am' ? 'Անհայտ հեղինակ' : 'Unknown')}
                    </p>
                  </div>

                  <div className="sw-card-footer">
                    <div className="sw-card-tags">
                      {hasChords ? (
                        <span className="sw-tag-chords">{language === 'am' ? 'Ակորդներ' : 'Chords'}</span>
                      ) : (
                        <span className="sw-tag-lyrics">📄 {language === 'am' ? 'Տեքստ' : 'Lyrics'}</span>
                      )}
                      <span className="sw-card-date">{getTimeAgo(song.created_at)}</span>
                    </div>

                    <div className="sw-card-actions">
                      <button
                        type="button"
                        className="sw-card-setlist-btn"
                        onClick={(e) => openSetlistModalForSong(e, song)}
                        title="Ավելացնել երգացանկում"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="16" y1="16" x2="16" y2="22"></line>
                          <line x1="13" y1="19" x2="19" y2="19"></line>
                        </svg>
                      </button>

                      <span className="sw-card-open-link">
                        {language === 'am' ? 'Դիտել' : 'View'} →
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (

          /* ── 2. TABLE / LIST VIEW ──────────────────────────── */
          <div className="sw-table-wrap animate-fade-in">
            <div className="sw-table-head">
              <div className="sw-th-title">{t('songs.tableTitle', 'Անվանում')}</div>
              <div className="sw-th-key">{t('songs.tableKey', 'Տոն.')}</div>
              <div className="sw-th-bpm">{t('songs.tableBpm', 'BPM')}</div>
              <div className="sw-th-artist">{t('songs.tableAuthor', 'Հեղինակ')}</div>
              <div className="sw-th-date">{t('songs.tableAdded', 'Ավելացված')}</div>
              <div className="sw-th-actions"></div>
            </div>

            <div className="sw-table-body">
              {visibleSongs.map((song, idx) => {
                const isFav = favorites.has(parseInt(song.id, 10));
                const localizedTitle = getLocalizedTitle(song.title, language);
                const bpmNum = parseInt(song.bpm, 10);
                const hasChords = !!(song.chords && song.chords.trim().length > 0);

                return (
                  <div
                    key={song.id}
                    className="sw-table-row"
                    onClick={() => navigate(`/song/${song.id}`)}
                  >
                    <div className="sw-td-title">
                      <div
                        className="sw-row-avatar"
                        style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
                      >
                        {song.title?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="sw-row-title-block">
                        <span className="sw-row-name">{localizedTitle}</span>
                        <div className="sw-row-sub">
                          <span className="sw-row-artist-mobile">{song.artist || '—'}</span>
                          {hasChords && <span className="sw-row-chords-badge">Chords</span>}
                        </div>
                      </div>
                    </div>

                    <div className="sw-td-key">
                      {song.song_key ? (
                        <span className="sw-table-key-pill">{song.song_key}</span>
                      ) : (
                        <span className="sw-dim">—</span>
                      )}
                    </div>

                    <div className="sw-td-bpm">
                      {bpmNum > 0 ? (
                        <span className="sw-table-bpm-val">{bpmNum}</span>
                      ) : (
                        <span className="sw-dim">—</span>
                      )}
                    </div>

                    <div className="sw-td-artist">
                      <span className="sw-artist-text">{song.artist || '—'}</span>
                    </div>

                    <div className="sw-td-date">
                      <span className="sw-dim">{getTimeAgo(song.created_at)}</span>
                    </div>

                    <div className="sw-td-actions" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="sw-row-btn"
                        onClick={(e) => openSetlistModalForSong(e, song)}
                        title="Ավելացնել երգացանկում"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="16" y1="16" x2="16" y2="22"></line>
                          <line x1="13" y1="19" x2="19" y2="19"></line>
                        </svg>
                      </button>

                      <button
                        type="button"
                        className={`sw-row-btn sw-row-fav ${isFav ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(e, parseInt(song.id, 10))}
                        title={isFav ? 'Հեռացնել' : 'Պահպանել'}
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="sw-row-open-btn"
                        onClick={() => navigate(`/song/${song.id}`)}
                      >
                        {t('songs.openReader', 'Բացել')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PAGINATION / LOAD MORE ──────────────────────────── */}
        {visibleCount < filtered.length && (
          <div className="sw-load-more-wrap">
            <button
              type="button"
              className="sw-load-more-btn"
              onClick={() => setVisibleCount(v => v + 24)}
            >
              <span>{t('songs.loadMore', 'Ցուցադրել ավելին')}</span>
              <span className="sw-load-badge">{filtered.length - visibleCount}</span>
            </button>
            <p className="sw-load-meta">
              Ցուցադրված է {visibleCount} երգ {filtered.length}-ից
            </p>
          </div>
        )}

      </div>

      {/* ── FLOATING BACK TO TOP ─────────────────────────────── */}
      {showBackToTop && createPortal(
        <button
          type="button"
          className="sw-back-to-top"
          aria-label={t('songs.backToTop', 'Բարձրանալ վերև')}
          title={t('songs.backToTop', 'Բարձրանալ վերև')}
          onClick={scrollToTop}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>,
        document.body
      )}

      {/* ── ADD TO SETLIST MODAL (WEB) ───────────────────────── */}
      {setlistModalSong && createPortal(
        <div className="sw-modal-overlay" onClick={() => setSetlistModalSong(null)}>
          <div className="sw-modal-content animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="sw-modal-header">
              <div className="sw-modal-header-info">
                <h3>{language === 'am' ? 'Ավելացնել երգացանկում' : 'Add to Setlist'}</h3>
                <span className="sw-modal-song-name">
                  {getLocalizedTitle(setlistModalSong.title, language)}
                  {setlistModalSong.song_key && ` • Տոն՝ ${setlistModalSong.song_key}`}
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
                    placeholder="Երգացանկի անուն"
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
              ) : userSetlists.length > 0 ? (
                userSetlists
                  .filter(sl => (sl.name || '').toLowerCase().includes(setlistSearch.toLowerCase().trim()))
                  .map(sl => {
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

      {/* Toast Notification */}
      {toastMsg && createPortal(
        <div className="sw-toast-notification animate-fade-in">
          {toastMsg}
        </div>,
        document.body
      )}
    </div>
  );
}
