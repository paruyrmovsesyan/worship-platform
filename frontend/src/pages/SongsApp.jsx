import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { matchSongSearch } from '../utils/searchMatcher';
import './SongsApp.css';

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
  const { user } = useAuth();
  const [restoreState] = useState(readSongsRestoreState);
  const initialQuery = new URLSearchParams(location.search).get('q') || '';

  const timeText = useMemo(() => ({
    am: { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' },
    en: { today: 'Today', yesterday: 'Yesterday', days: 'days ago', weeks: 'weeks ago', months: 'months ago', years: 'years ago' },
    ru: { today: 'Сегодня', yesterday: 'Вчера', days: 'дн. назад', weeks: 'нед. назад', months: 'мес. назад', years: 'лет назад' }
  }[language] || { today: 'Այսօր', yesterday: 'Երեկ', days: 'օր առաջ', weeks: 'շաբ. առաջ', months: 'ամիս առաջ', years: 'տարի առաջ' }), [language]);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diffDays = Math.floor((new Date() - new Date(dateStr.replace(/-/g, '/'))) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return '—';
    if (diffDays <= 0) return timeText.today;
    if (diffDays === 1) return timeText.yesterday;
    if (diffDays < 7) return `${diffDays} ${timeText.days}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${timeText.weeks}`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ${timeText.months}`;
    return `${Math.floor(diffDays / 365)} ${timeText.years}`;
  };

  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      if (!localStorage.getItem('worship_user')) return new Set();
      const cached = localStorage.getItem('wp_user_favorites_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map(f => parseInt(f.song_id || f.id, 10)).filter(Boolean));
        }
      }
    } catch {}
    return new Set();
  });
  const [isLoading, setIsLoading] = useState(true);
  
  usePageReady(isLoading);
  
  // Filter and Sorting states
  const [selectedKey, setSelectedKey] = useState(restoreState?.selectedKey || 'All');
  const [activeCategory, setActiveCategory] = useState(restoreState?.activeCategory || 'all');
  const [sortBy, setSortBy] = useState(restoreState?.sortBy || 'recent');
  const [searchQuery, setSearchQuery] = useState(
    restoreState?.searchQuery ?? initialQuery
  );
  const [visibleCount, setVisibleCount] = useState(Math.max(15, Number(restoreState?.visibleCount) || 15));
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

  const filterEffectReady = useRef(false);
  const scrollRestored = useRef(false);

  // Categories config
  const categories = useMemo(() => [
    { id: 'all', label: language === 'am' ? 'Բոլորը' : language === 'ru' ? 'Все' : 'All', icon: null },
    ...(user ? [{ id: 'favorites', label: language === 'am' ? 'Իմ ընտրանին' : language === 'ru' ? 'Избранное' : 'Favorites', icon: '❤️' }] : []),
    { id: 'chords', label: language === 'am' ? 'Ակորդներով' : language === 'ru' ? 'С аккордами' : 'With Chords', icon: null },
    { id: 'lyrics', label: language === 'am' ? 'Տեքստեր' : language === 'ru' ? 'Только текст' : 'Lyrics Only', icon: '📄' },
    { id: 'fast', label: language === 'am' ? 'Արագ' : language === 'ru' ? 'Быстрые' : 'Fast', icon: '⚡' },
    { id: 'slow', label: language === 'am' ? 'Խաղաղ' : language === 'ru' ? 'Спокойные' : 'Slow', icon: '🕊' },
  ], [language, user]);

  // Extract available keys dynamically
  const availableKeys = useMemo(() => {
    const standardKeys = ['All', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Am', 'Dm', 'Em', 'F#m', 'Bm'];
    const keySet = new Set(standardKeys);
    songs.forEach(s => {
      if (s.song_key && s.song_key.trim()) {
        keySet.add(s.song_key.trim());
      }
    });
    return Array.from(keySet);
  }, [songs]);

  useEffect(() => {
    if (!filterEffectReady.current) {
      filterEffectReady.current = true;
      return;
    }
    setVisibleCount(15);
  }, [searchQuery, selectedKey, activeCategory, sortBy]);

  useEffect(() => {
    if (restoreState) return;
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery(q);
  }, [location.search, restoreState]);

  // Ensure songs-modal-open class is cleared on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('songs-modal-open');
    };
  }, []);

  const scrollToTop = (e) => {
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
    }

    const startPos = Math.max(
      window.scrollY || 0,
      window.pageYOffset || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0
    );

    const scrolledElements = [];
    const elements = document.querySelectorAll('div, main, section, article, #root, .app-container, .songs-page, .app-main');
    elements.forEach(el => {
      if (el.scrollTop > 0) {
        scrolledElements.push({ el, start: el.scrollTop });
      }
    });

    const duration = 300;
    const startTime = performance.now();

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = Math.max(
            window.scrollY || 0,
            window.pageYOffset || 0,
            document.documentElement?.scrollTop || 0,
            document.body?.scrollTop || 0
          );
          setShowBackToTop(scrollY > 150);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
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
            setFavorites(new Set(d.map(f => parseInt(f.song_id || f.id, 10)).filter(Boolean)));
            try {
              localStorage.setItem('wp_user_favorites_cache', JSON.stringify(d));
            } catch {}
          }
        })
        .catch(() => {});
    } else {
      setFavorites(new Set());
      try {
        localStorage.removeItem('wp_user_favorites_cache');
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (!user && activeCategory === 'favorites') {
      setActiveCategory('all');
    }
  }, [user, activeCategory]);

  const toggleFavorite = async (e, songId) => {
    if (e) {
      try { e.preventDefault(); } catch {}
      try { e.stopPropagation(); } catch {}
    }
    if (!user) {
      navigate('/login?next=/songs');
      return;
    }
    const numId = parseInt(songId, 10);
    const isFav = favorites.has(numId);
    
    // Optimistic UI
    const newFavs = new Set(favorites);
    if (isFav) newFavs.delete(numId);
    else newFavs.add(numId);
    setFavorites(newFavs);

    try {
      const response = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: numId })
      });
      const data = await response.json();
      if (!response.ok || typeof data.favorite !== 'boolean') {
        throw new Error(data.error || 'Favorite update failed');
      }

      setFavorites(current => {
        const synced = new Set(current);
        if (data.favorite) synced.add(numId);
        else synced.delete(numId);
        return synced;
      });

      // Synchronize localStorage cache for favorites
      try {
        const cached = localStorage.getItem('wp_user_favorites_cache');
        let list = cached ? JSON.parse(cached) : [];
        if (Array.isArray(list)) {
          if (data.favorite) {
            const existingSong = songs.find(s => parseInt(s.id, 10) === numId);
            if (existingSong && !list.some(f => parseInt(f.song_id || f.id, 10) === numId)) {
              list.unshift({ ...existingSong, song_id: numId, id: numId });
            }
          } else {
            list = list.filter(f => parseInt(f.song_id || f.id, 10) !== numId);
          }
          localStorage.setItem('wp_user_favorites_cache', JSON.stringify(list));
        }
      } catch {}
    } catch {
      setFavorites(current => {
        const rolledBack = new Set(current);
        if (isFav) rolledBack.add(numId);
        else rolledBack.delete(numId);
        return rolledBack;
      });
    }
  };

  // Filter and sort songs
  const filtered = useMemo(() => {
    return songs
      .filter(s => {
        // Search filter
        const matchQ = matchSongSearch(s, searchQuery);
        if (!matchQ) return false;

        // Key filter
        if (selectedKey !== 'All' && s.song_key !== selectedKey) {
          return false;
        }

        // Category filter
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

        if (activeCategory === 'slow' && (bpmNum <= 0 || bpmNum >= 100)) {
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
        if (sortBy === 'bpm_desc') return (parseInt(b.bpm, 10) || 0) - (parseInt(a.bpm, 10) || 0);
        if (sortBy === 'bpm_asc' || sortBy === 'bpm') return (parseInt(a.bpm, 10) || 0) - (parseInt(b.bpm, 10) || 0);
        if (sortBy === 'key') return (a.song_key || '').localeCompare(b.song_key || '');
        if (sortBy === 'recent') return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
        return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
      });
  }, [songs, searchQuery, selectedKey, activeCategory, favorites, sortBy, language]);

  const visibleSongs = filtered.slice(0, visibleCount);

  // Restore scroll state
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
        activeCategory,
        sortBy,
        visibleCount,
        savedAt: Date.now()
      }));
      sessionStorage.setItem(SONGS_RESTORE_PENDING_KEY, '1');
    } catch {}
    navigate(`/song/${songId}`);
  };

  // Random song jump
  const handleRandomSong = () => {
    const pool = filtered.length > 0 ? filtered : songs;
    if (!pool.length) return;
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    if (rnd?.id) openSong(rnd.id);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedKey('All');
    setActiveCategory('all');
    setSortBy('recent');
    if (location.search) {
      navigate('/songs', { replace: true });
    }
  };

  // Add to Setlist modal handlers
  const openSetlistModalForSong = async (e, song) => {
    if (e) {
      try { e.preventDefault(); } catch {}
      try { e.stopPropagation(); } catch {}
    }
    if (!user) {
      navigate('/login?next=/songs');
      return;
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
          target_key: setlistModalSong.song_key || null,
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
          target_key: setlistModalSong.song_key || null,
          capo: null
        })
      });

      setAddedSetlistIds(prev => ({ ...prev, [newId]: true }));
      setToastMsg(language === 'am' ? '✓ Ստեղծվեց և ավելացվեց' : language === 'ru' ? '✓ Создано и добавлено' : '✓ Created and added');
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

  const hasActiveFilters = searchQuery || selectedKey !== 'All' || activeCategory !== 'all';

  return (
    <div className="songs-page animate-fade-in">

      {/* Header */}
      <div className="songs-header">
        <div className="songs-header-top">
          <h1 className="songs-title">
            {t('songs.title')}
            <span className="count-badge">{filtered.length}</span>
          </h1>

          <button 
            type="button"
            className="random-song-btn"
            onClick={handleRandomSong}
            title={language === 'am' ? 'Պատահական երգ' : language === 'ru' ? 'Случайная песня' : 'Random Song'}
            aria-label={language === 'am' ? 'Պատահական երգ' : 'Random Song'}
          >
            <span className="random-dice-icon">🎲</span>
            <span className="random-label desk-only-inline">{language === 'am' ? 'Պատահական' : 'Random'}</span>
          </button>
        </div>

        {/* Search and Quick Controls */}
        <div className="songs-controls">
          <div className="search-box songs-search-box">
            <svg className="search-box-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="songs-search-input"
              placeholder={t('songs.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {searchQuery && (
              <button 
                type="button"
                className="search-x" 
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                  if (location.search) {
                    navigate('/songs', { replace: true });
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                  if (location.search) {
                    navigate('/songs', { replace: true });
                  }
                }}
                aria-label="Մաքրել որոնումը"
                title="Մաքրել"
              >
                <svg className="search-x-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
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

      {/* Category Pills Bar */}
      <div className="category-scroll-container">
        <div className="category-pills">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon && <span className="cat-icon">{cat.icon}</span>}
              <span className="cat-text">{cat.label}</span>
              {cat.id === 'favorites' && favorites.size > 0 && (
                <span className="cat-counter">{favorites.size}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="filter-bar">
        <div className="key-scroll-container">
          <div className="key-pills">
            {availableKeys.map(k => (
              <button key={k} className={`kp ${selectedKey === k ? 'active' : ''}`}
                onClick={() => setSelectedKey(k)}>{k}</button>
            ))}
          </div>
        </div>
        
        <div className="filter-sort-row">
          <select className="sort-sel modern-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="recent">⏱ {t('songs.sortRecent', 'Նոր ավելացված')}</option>
            <option value="title">🔤 {t('songs.sortTitle', 'Այբբենական')}</option>
            <option value="bpm_desc">⚡ Տեմպ (արագից դանդաղ)</option>
            <option value="bpm_asc">🕊 Տեմպ (դանդաղից արագ)</option>
            <option value="key">🎵 {t('songs.sortKey', 'Տոնայնություն')}</option>
          </select>
          {hasActiveFilters && (
            <button 
              type="button" 
              className="reset-filters-btn-inline"
              onClick={resetFilters}
              title="Մաքրել ֆիլտրերը"
            >
              ✕ {language === 'am' ? 'Մաքրել' : 'Clear'}
            </button>
          )}
        </div>
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
            <div className="empty-icon-wrap">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="empty-text">{t('songs.noResults')}</p>
            {hasActiveFilters && (
              <button 
                type="button" 
                className="btn btn-secondary empty-reset-btn"
                onClick={resetFilters}
              >
                {language === 'am' ? 'Մաքրել բոլոր ֆիլտրերը' : language === 'ru' ? 'Сбросить все фильтры' : 'Reset All Filters'}
              </button>
            )}
          </div>
        ) : (
          <>
            {visibleSongs.map((song, idx) => (
              <div 
                key={song.id} 
                className="track-item animate-fade-in" 
                style={{ animationDelay: `${Math.min(idx * 0.02, 0.35)}s` }} 
                onClick={() => openSong(song.id)}
              >
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
                  <div className="track-subinfo">
                    <span className="track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</span>
                    <div className="track-tags-inline">
                      {song.song_key && <span className="track-key-badge">{song.song_key}</span>}
                      {Number.parseInt(song.bpm, 10) > 0 && (
                        <span className="track-bpm-badge">{song.bpm} BPM</span>
                      )}
                    </div>
                  </div>
                </div>

                <div 
                  className="track-actions"
                  onClick={(e) => { e.stopPropagation(); }}
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  onTouchStart={(e) => { e.stopPropagation(); }}
                >
                  {/* Quick Add to Setlist */}
                  <button 
                    type="button"
                    className="action-icon-btn setlist-quick-btn"
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

                  {/* Favorite button */}
                  <button 
                    type="button"
                    className={`action-icon-btn heart-btn ${favorites.has(parseInt(song.id, 10)) ? 'active' : ''}`} 
                    onClick={(e) => toggleFavorite(e, parseInt(song.id, 10))}
                    title={favorites.has(parseInt(song.id, 10)) ? t('songs.removeFromFav', 'Remove') : t('songs.addToFav', 'Save')}
                    aria-label={favorites.has(parseInt(song.id, 10)) ? t('songs.removeFromFav', 'Remove') : t('songs.addToFav', 'Save')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" 
                      fill={favorites.has(parseInt(song.id, 10)) ? 'currentColor' : 'none'} 
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

      {/* Back to top floating button */}
      {showBackToTop && createPortal(
        <button
          type="button"
          className="songs-back-to-top"
          aria-label={t('songs.backToTop')}
          title={t('songs.backToTop')}
          onClick={scrollToTop}
          onTouchEnd={scrollToTop}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>,
        document.body
      )}

      {/* Toast Notification */}
      {toastMsg && createPortal(
        <div className="songs-app-toast animate-fade-in">
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
                  {setlistModalSong.song_key && (
                    <span className="sla-modal-key-pill">{setlistModalSong.song_key}</span>
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
