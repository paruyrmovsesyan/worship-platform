import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { saveRecentSongSearch } from '../utils/recentSearches';
import { sortSavedSongs } from '../utils/savedSongs';
import {
  getCachedNewsList,
  fetchNewsList,
  formatNewsDate,
  formatNewsVersion,
  getNewsImageUrl,
} from '../utils/news';
import { scoreSongSearch, highlightText } from '../utils/searchMatcher';
import { BIBLE_READING_PLANS } from '../utils/bibleData';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import { useHorizontalDragScroll } from '../hooks/useHorizontalDragScroll';
import { useFeatureFlags } from '../utils/featureFlags';
import { PlatformAnnouncementBanner } from '../components/PlatformAnnouncementGuard';
import { getTodayDevotional, TOPIC_COLLECTIONS } from '../utils/devotionalData';
import { nativeShare, triggerHaptic } from '../utils/nativeFeatures';
import './MobileHub.css';

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function getRelativeDateLabel(dateStr, lang) {
  if (!dateStr) return null;
  const cleanDate = String(dateStr).slice(0, 10);
  const target = new Date(`${cleanDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const dict = {
    am: {
      today: 'Այսօր',
      tomorrow: 'Վաղը',
      yesterday: 'Երեկ',
      inDays: (n) => `${n} օրից`,
      daysAgo: (n) => `${n} օր առաջ`,
    },
    en: {
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      inDays: (n) => `in ${n}d`,
      daysAgo: (n) => `${n}d ago`,
    },
    ru: {
      today: 'Сегодня',
      tomorrow: 'Завтра',
      yesterday: 'Вчера',
      inDays: (n) => `через ${n} дн.`,
      daysAgo: (n) => `${n} дн. назад`,
    },
  }[lang] || {
    today: 'Այսօր',
    tomorrow: 'Վաղը',
    yesterday: 'Երեկ',
    inDays: (n) => `${n} օրից`,
    daysAgo: (n) => `${n} օր առաջ`,
  };

  if (diffDays === 0) return dict.today;
  if (diffDays === 1) return dict.tomorrow;
  if (diffDays === -1) return dict.yesterday;
  if (diffDays > 1) return dict.inDays(diffDays);
  if (diffDays < -1) return dict.daysAgo(Math.abs(diffDays));
  return null;
}

function readBibleHubSummary() {
  try {
    const lastRead = JSON.parse(localStorage.getItem('wp_bible_last_read_v1') || 'null');
    const streakRaw = JSON.parse(localStorage.getItem('wp_bible_streak_v1') || 'null');
    const userState = JSON.parse(localStorage.getItem('wp_bible_user_state_v1') || 'null');
    const extraProgress = JSON.parse(localStorage.getItem('wp_bible_plans_progress_v1') || '{}') || {};
    const savedPlanId = localStorage.getItem('wp_bible_active_plan_v1');

    const plan =
      BIBLE_READING_PLANS.find((p) => p.id === savedPlanId) || BIBLE_READING_PLANS[0];
    const completedDays =
      plan.id === 'essentials_14'
        ? (Array.isArray(userState?.plan_days) ? userState.plan_days : [])
        : (Array.isArray(extraProgress[plan.id]) ? extraProgress[plan.id] : []);
    const nextDay = plan.days.find((d) => !completedDays.includes(d.day)) || null;
    const percent = Math.round((completedDays.length / Math.max(1, plan.days.length)) * 100);

    return {
      lastRead,
      streak: Number(streakRaw?.count) || 0,
      plan,
      completedCount: completedDays.length,
      totalDays: plan.days.length,
      percent,
      nextDay,
    };
  } catch {
    const fallbackPlan = BIBLE_READING_PLANS[0];
    return {
      lastRead: null,
      streak: 0,
      plan: fallbackPlan,
      completedCount: 0,
      totalDays: fallbackPlan.days.length,
      percent: 0,
      nextDay: fallbackPlan.days[0] || null,
    };
  }
}

function renderHighlighted(text, query) {
  const chunks = highlightText(text, query);
  return chunks.map((chunk, idx) =>
    chunk.highlight ? (
      <mark key={idx} className="hub-search-mark">
        {chunk.text}
      </mark>
    ) : (
      <React.Fragment key={idx}>{chunk.text}</React.Fragment>
    ),
  );
}

export default function MobileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isVisible, isSoon, isBeta } = useFeatureFlags();
  const { guardPath } = usePwaOfflineGuard();

  const [allSongs, setAllSongs] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('wp_songs_cache') || 'null');
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  });
  const recentSongs = useMemo(() => allSongs.slice(0, 10), [allSongs]);
  const [upcomingSetlist, setUpcomingSetlist] = useState(null);
  const [userSetlists, setUserSetlists] = useState([]);
  const [churchCalendarItems, setChurchCalendarItems] = useState([]);
  const [selectedDayStr, setSelectedDayStr] = useState(getTodayStr);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [rsvpState, setRsvpState] = useState({});
  const [favorites, setFavorites] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('wp_user_favorites_cache') || 'null');
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  });
  const [newsItems, setNewsItems] = useState(() => getCachedNewsList(language));
  const [logoSrc, setLogoSrc] = useState('/icon-192-v7.png');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState(() => {
    try {
      return localStorage.getItem('wp_last_sync_at') || '';
    } catch {
      return '';
    }
  });
  const [bibleSummary, setBibleSummary] = useState(readBibleHubSummary);
  const [votdCopied, setVotdCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  const todayDevotional = useMemo(() => getTodayDevotional(), []);
  const toolsScrollRef = useHorizontalDragScroll();
  const favScrollRef = useHorizontalDragScroll();
  const recentScrollRef = useHorizontalDragScroll();
  const topicsScrollRef = useHorizontalDragScroll();

  const formatSyncStamp = (value) => {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    const readSyncTime = () => {
      try {
        setLastSyncAt(localStorage.getItem('wp_last_sync_at') || '');
      } catch {
        setLastSyncAt('');
      }
    };

    const refreshBible = () => setBibleSummary(readBibleHubSummary());

    const handleOnline = () => {
      setIsOffline(false);
      readSyncTime();
    };

    const handleOffline = () => {
      setIsOffline(true);
      readSyncTime();
    };

    const handleStorage = (event) => {
      if (!event || event.key === 'wp_last_sync_at') readSyncTime();
      if (!event || String(event.key || '').startsWith('wp_bible_')) refreshBible();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', refreshBible);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', refreshBible);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = controller ? controller.signal : undefined;

    fetch('/api.php', { signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setAllSongs(data);
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(data));
          } catch { /* ignore storage quota */ }
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('Songs sync skipped:', err?.message || err);
        }
      });

    fetch('/church_api.php?action=get_calendar', { credentials: 'include', signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.items)) {
          setChurchCalendarItems(data.items);
        }
      })
      .catch(() => { /* ignore optional calendar error */ });

    if (user) {
      fetch('/setlists_api.php?action=get_setlists', { credentials: 'include', cache: 'no-store', signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          if (Array.isArray(data) && data.length > 0) {
            setUserSetlists(data);
            const todayStr = getTodayStr();
            const upcoming = data
              .filter((s) => s.service_date && String(s.service_date).slice(0, 10) >= todayStr && s.status !== 'archived')
              .sort((a, b) => String(a.service_date).localeCompare(String(b.service_date)))[0];
            setUpcomingSetlist(upcoming || null);
          } else if (Array.isArray(data)) {
            setUserSetlists([]);
            setUpcomingSetlist(null);
          }
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.warn('Setlists sync skipped:', err?.message || err);
          }
        });

      fetch('/user_favorites_api.php?action=get_favorites', { credentials: 'include', cache: 'no-store', signal })
        .then((res) => {
          if (res.status === 401 || res.status === 403 || res.status === 503) return null;
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (cancelled || !Array.isArray(data)) return;
          setFavorites(data);
          try {
            localStorage.setItem('wp_user_favorites_cache', JSON.stringify(data));
          } catch { /* ignore storage quota */ }
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.warn('Saved songs sync skipped:', err?.message || err);
          }
        });
    }

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchNewsList({ language, limit: 8 })
      .then((items) => {
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

  const formatSetlistServiceDate = useCallback(
    (dateStr) => {
      if (!dateStr) return '';
      try {
        const cleanDate = String(dateStr).slice(0, 10);
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (!Number.isNaN(d.getTime())) {
            const loc = language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US';
            const formatted = d.toLocaleDateString(loc, { month: 'long', day: 'numeric' });
            const relLabel = getRelativeDateLabel(cleanDate, language);
            return relLabel ? `${formatted} · ${relLabel}` : formatted;
          }
        }
        return cleanDate;
      } catch {
        return dateStr;
      }
    },
    [language],
  );

  const liveSearchData = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2 || allSongs.length === 0) {
      return { total: 0, items: [] };
    }
    const matches = [];
    for (let i = 0; i < allSongs.length; i += 1) {
      const song = allSongs[i];
      const res = scoreSongSearch(song, q, language);
      if (res.matches && res.score > 0) {
        matches.push({ song, score: res.score, snippet: res.snippet });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    return {
      total: matches.length,
      items: matches.slice(0, 4),
    };
  }, [searchQuery, allSongs, language]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    searchInputRef.current?.blur();
    document.activeElement?.blur();
    setSearchFocused(false);
    const q = searchQuery.trim();
    if (q) {
      saveRecentSongSearch(q);
      navigate(`/songs?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/songs');
    }
  };

  const openLiveSong = (song) => {
    const q = searchQuery.trim();
    if (q) saveRecentSongSearch(q);
    triggerHaptic('light');
    setSearchFocused(false);
    guardPath(`/song/${song.id}`, () => navigate(`/song/${song.id}`));
  };

  const openFavorites = () => {
    guardPath('/favorites', () => navigate('/favorites'));
  };

  const visibleFavorites = useMemo(
    () =>
      sortSavedSongs(
        favorites,
        'saved_newest',
        (song) => getLocalizedTitle(song, language),
        language,
      ).slice(0, 10),
    [favorites, language],
  );

  const greetingText = useMemo(() => {
    const h = new Date().getHours();
    const firstName = (user?.name || user?.username || '').split(' ')[0];
    const greet =
      language === 'ru'
        ? h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
        : language === 'en'
        ? h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
        : h < 12 ? 'Բարի լույս' : h < 18 ? 'Բարի օր' : 'Բարի երեկո';
    return firstName ? `${greet}, ${firstName}` : greet;
  }, [user, language]);

  const todayFormatted = useMemo(() => {
    const loc = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'hy-AM';
    return new Date().toLocaleDateString(loc, { day: 'numeric', month: 'long' });
  }, [language]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const dayIdx = today.getDay();
    const mondayOffset = dayIdx === 0 ? -6 : 1 - dayIdx;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const shortDays =
      language === 'ru'
        ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        : language === 'en'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Երկ', 'Երք', 'Չոր', 'Հնգ', 'Ուր', 'Շբթ', 'Կիր'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const daySetlists = user
        ? userSetlists.filter((s) => String(s.service_date || '').slice(0, 10) === dateStr)
        : [];
      const dayEvents = churchCalendarItems.filter(
        (ev) => String(ev.date || '').slice(0, 10) === dateStr,
      );
      return {
        dateStr,
        dayNum: d.getDate(),
        label: shortDays[i],
        isToday: dateStr === getTodayStr(),
        hasService: daySetlists.length > 0 || dayEvents.length > 0,
        setlists: daySetlists,
        events: dayEvents,
      };
    });
  }, [language, user, userSetlists, churchCalendarItems]);

  const selectedDayInfo =
    weekDays.find((d) => d.dateStr === selectedDayStr) || weekDays.find((d) => d.isToday);
  const dailyVerse = todayDevotional.verse;
  const dailyQuote = todayDevotional.quote;
  const activeTopic = TOPIC_COLLECTIONS[activeTopicIdx] || TOPIC_COLLECTIONS[0];

  const handleQuickEventRsvp = async (ev) => {
    const key = `${ev.kind || 'event'}_${ev.id}`;
    const already = rsvpState[key] === 'going' || ev.my_rsvp === 'going';
    const nextStatus = already ? 'cant' : 'going';
    triggerHaptic(nextStatus === 'going' ? 'success' : 'light');
    setRsvpState((prev) => ({ ...prev, [key]: nextStatus }));
    if (!user) return;
    try {
      await fetch('/church_api.php?action=set_rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          target_type: ev.kind || 'event',
          target_id: ev.id,
          status: nextStatus,
        }),
      });
    } catch { /* ignore RSVP network error */ }
  };

  const handleCopyVotd = async () => {
    const text = `«${dailyVerse.text[language] || dailyVerse.text.am}» — ${dailyVerse.ref[language] || dailyVerse.ref.am}`;
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('success');
      setVotdCopied(true);
      setTimeout(() => setVotdCopied(false), 1800);
    } catch { /* ignore clipboard error */ }
  };

  const showLiveResults = searchFocused && searchQuery.trim().length >= 2;

  return (
    <div className="mobile-hub animate-fade-in">
      {/* Top Glass Header */}
      <header className="hub-header">
        <button
          className="hub-logo-btn"
          type="button"
          onClick={() => navigate('/')}
          aria-label="Worship Platform"
        >
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
          <div className="hub-brand-meta">
            <span className="hub-brand-name">Worship</span>
            <span className="hub-brand-date">{todayFormatted}</span>
          </div>
        </button>

        <div className="hub-header-actions">
          <div className="hub-lang-slot">
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            className="hub-header-icon-btn"
            onClick={() => guardPath('/notifications', () => navigate('/notifications'))}
            title={t('notifications.title', 'Ծանուցումներ')}
            aria-label={t('notifications.title', 'Ծանուցումներ')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button
            type="button"
            className="hub-header-icon-btn"
            onClick={() => navigate('/settings')}
            title={t('settings.title', 'Կարգավորումներ')}
            aria-label={t('settings.title', 'Կարգավորումներ')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="hub-content">
        <PlatformAnnouncementBanner embedded navigate={navigate} language={language} />

        {/* Editorial Greeting & Quick Resume */}
        <div className="hub-today-greeting">
          <div className="hub-greeting-copy">
            <span className="hub-today-eyebrow">
              {language === 'ru' ? 'СЕГОДНЯ' : language === 'en' ? 'TODAY' : 'ԱՅՍՕՐ'}
            </span>
            <h1 className="hub-today-title">{greetingText}</h1>
          </div>
          <div className="hub-greeting-chips">
            {bibleSummary.streak > 0 && (
              <button
                type="button"
                className="hub-streak-pill"
                onClick={() => guardPath('/bible', () => navigate('/bible?tab=my'))}
                title={language === 'ru' ? 'Дней подряд' : language === 'en' ? 'Reading Streak' : 'Օր անընդմեջ'}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                <span>{bibleSummary.streak}</span>
              </button>
            )}
            {bibleSummary.lastRead?.book && (
              <button
                type="button"
                className="hub-resume-pill"
                onClick={() =>
                  guardPath('/bible', () =>
                    navigate(
                      `/bible?book=${bibleSummary.lastRead.book}&chapter=${bibleSummary.lastRead.chapter}&tr=${bibleSummary.lastRead.translation || ''}`,
                    ),
                  )
                }
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>
                  {bibleSummary.lastRead.bookName} {bibleSummary.lastRead.chapter}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Instant Smart Search (Top-of-Feed Access) */}
        <div className="hub-search-wrap" ref={searchWrapRef}>
          <form className="hub-search-box" onSubmit={handleSearchSubmit}>
            <button type="submit" className="hub-search-icon-btn" aria-label="Որոնել">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" className="hub-search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className="hub-search-input"
              placeholder={t('hub.searchPlaceholder', 'Որոնել երգեր, հեղինակներ, խոսքեր...')}
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit(e);
                } else if (e.key === 'Escape') {
                  setSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {searchQuery ? (
              <button
                type="button"
                className="hub-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Մաքրել"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
            <button type="submit" className="hub-search-btn-badge">
              {language === 'ru' ? 'Найти' : language === 'en' ? 'Search' : 'Որոնել'}
            </button>
          </form>

          {showLiveResults && (
            <div className="hub-live-search-panel">
              {liveSearchData.items.length > 0 ? (
                <>
                  {liveSearchData.items.map(({ song, snippet }) => {
                    const title = getLocalizedTitle(song, language);
                    return (
                      <button
                        key={song.id}
                        type="button"
                        className="hub-live-search-row"
                        onClick={() => openLiveSong(song)}
                      >
                        <span className="hub-live-key">{song.song_key || '♪'}</span>
                        <div className="hub-live-meta">
                          <strong>{renderHighlighted(title, searchQuery)}</strong>
                          <small>
                            {snippet
                              ? renderHighlighted(snippet, searchQuery)
                              : (song.artist || t('songs.unknownArtist', 'Անհայտ հեղինակ'))}
                          </small>
                        </div>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="hub-live-chevron">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    );
                  })}
                  {liveSearchData.total > 4 && (
                    <button
                      type="button"
                      className="hub-live-search-all"
                      onClick={handleSearchSubmit}
                    >
                      <span>
                        {language === 'ru'
                          ? `Все результаты (${liveSearchData.total})`
                          : language === 'en'
                          ? `See all results (${liveSearchData.total})`
                          : `Տեսնել բոլոր արդյունքները (${liveSearchData.total})`}
                      </span>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="hub-live-search-empty">
                  {language === 'ru'
                    ? 'Ничего не найдено'
                    : language === 'en'
                    ? 'No songs found'
                    : 'Երգեր չեն գտնվել'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Offline Notice */}
        {isOffline && (
          <div className="hub-offline-card">
            <div className="hub-offline-head">
              <span className="hub-offline-dot" />
              <strong>{t('chat.offline')}</strong>
            </div>
            <div className="hub-offline-meta">
              <span>Օֆֆլայն հասանելի են երգերը և պահված տվյալները</span>
              <span>Վերջին sync: {formatSyncStamp(lastSyncAt)}</span>
            </div>
          </div>
        )}

        {/* Primary 4-Action Quick Launch Dock */}
        <nav className="hub-quick-dock" aria-label="Հիմնական բաժիններ">
          <button
            type="button"
            className="hub-dock-item"
            onClick={() => {
              triggerHaptic('light');
              guardPath('/songs', () => navigate('/songs'));
            }}
          >
            <span className="hub-dock-ico tone-amber">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </span>
            <span className="hub-dock-label">{t('hub.categories.songs')}</span>
          </button>

          <button
            type="button"
            className="hub-dock-item"
            onClick={() => {
              triggerHaptic('light');
              guardPath('/setlists', () => navigate('/setlists'));
            }}
          >
            <span className="hub-dock-ico tone-emerald">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </span>
            <span className="hub-dock-label">{t('hub.categories.setlists')}</span>
          </button>

          <button
            type="button"
            className="hub-dock-item"
            onClick={() => {
              triggerHaptic('light');
              guardPath('/bible', () => navigate('/bible'));
            }}
          >
            <span className="hub-dock-ico tone-gold">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <span className="hub-dock-label">
              {language === 'ru' ? 'Библия' : language === 'en' ? 'Bible' : 'Աստվածաշունչ'}
            </span>
          </button>

          <button
            type="button"
            className="hub-dock-item"
            onClick={() => {
              triggerHaptic('light');
              guardPath('/church', () => navigate('/church'));
            }}
          >
            <span className="hub-dock-ico tone-indigo">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v5" />
                <path d="M9.5 4.5h5" />
                <path d="M4 22V11l8-5 8 5v11" />
                <path d="M9 22v-6h6v6" />
              </svg>
            </span>
            <span className="hub-dock-label">
              {language === 'ru' ? 'Церковь' : language === 'en' ? 'Church' : 'Եկեղեցի'}
            </span>
          </button>
        </nav>

        {/* Secondary Compact Tools & Explore Strip (Zero vertical clutter) */}
        <div className="hub-tools-strip" ref={toolsScrollRef}>
          <button
            type="button"
            className="hub-tool-pill"
            onClick={() => guardPath('/media', () => navigate('/media'))}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>{language === 'ru' ? 'Медиа и Радио' : language === 'en' ? 'Media & Radio' : 'Մեդիա և Ռադիո'}</span>
          </button>

          <button
            type="button"
            className="hub-tool-pill"
            onClick={() => guardPath('/church?tab=rehearsals', () => navigate('/church?tab=rehearsals'))}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{language === 'ru' ? 'Репетиции' : language === 'en' ? 'Rehearsals' : 'Փորձեր'}</span>
          </button>

          <button
            type="button"
            className="hub-tool-pill"
            onClick={() => guardPath('/friends', () => navigate('/friends'))}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{t('hub.categories.teams')}</span>
          </button>

          <button
            type="button"
            className="hub-tool-pill"
            onClick={() => guardPath('/transpose', () => navigate('/transpose'))}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M7 4 4 7l3 3M20 17H4m13-3 3 3-3 3" />
            </svg>
            <span>{t('hub.categories.transposer')}</span>
          </button>

          <button
            type="button"
            className="hub-tool-pill"
            onClick={() => guardPath('/song-request', () => navigate('/song-request'))}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>{t('songRequest.title', 'Խնդրել Երգ')}</span>
          </button>

          {isVisible('pro_studio') && (
            <button
              type="button"
              className={`hub-tool-pill ${isSoon('pro_studio') ? 'is-soon' : ''}`}
              disabled={isSoon('pro_studio')}
              onClick={() => {
                if (isSoon('pro_studio')) return;
                guardPath('/studio', () => navigate('/studio'));
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
              </svg>
              <span>Pro Studio</span>
              {isSoon('pro_studio') ? (
                <em className="hub-tool-tag is-soon">Շուտով</em>
              ) : isBeta('pro_studio') ? (
                <em className="hub-tool-tag is-beta">BETA</em>
              ) : null}
            </button>
          )}
        </div>

        {/* Upcoming Service Banner (Priority for Logged-in Musicians) */}
        {user && upcomingSetlist && (
          <div className="upcoming-card">
            <div className="upcoming-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
                <path d="m9.5 15 1.7 1.7 3.6-3.7" />
              </svg>
            </div>
            <div className="upcoming-card-content">
              <span className="upcoming-card-label">
                <span className="upcoming-live-dot" />
                {t('hub.upcomingService')}
              </span>
              <h2>{upcomingSetlist.name}</h2>
              <p>{formatSetlistServiceDate(upcomingSetlist.service_date)}</p>
            </div>
            <button
              type="button"
              className="upcoming-card-action"
              aria-label={t('hub.startRehearsal')}
              onClick={() =>
                guardPath(`/setlists/${upcomingSetlist.id}`, () => {
                  navigate(`/setlists/${upcomingSetlist.id}`);
                })
              }
            >
              <span>{t('hub.startRehearsal')}</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Guest Account Prompt Card */}
        {!user && (
          <div className="hub-account-prompt-card">
            <div className="hub-account-prompt-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div className="hub-account-prompt-body">
              <h3 className="hub-account-prompt-title">
                {language === 'ru' ? 'Создайте свой аккаунт' : language === 'en' ? 'Create your account' : 'Ստեղծի՛ր քո հաշիվը'}
              </h3>
              <p className="hub-account-prompt-desc">
                {language === 'ru'
                  ? 'Сохраняйте любимые песни, создавайте сет-листы и открывайте все возможности.'
                  : language === 'en'
                  ? 'Save favorite songs, build setlists, and unlock all features.'
                  : 'Պահպանիր սիրելի երգերը, կազմիր երգացանկեր և օգտվիր բոլոր հնարավորություններից։'}
              </p>
              <div className="hub-account-prompt-actions">
                <Link to="/register" className="hub-account-prompt-btn-primary">
                  <span>{language === 'ru' ? 'Создать аккаунт' : language === 'en' ? 'Create Account' : 'Ստեղծել հաշիվ'}</span>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/login" className="hub-account-prompt-btn-secondary">
                  {language === 'ru' ? 'Войти' : language === 'en' ? 'Log in' : 'Մուտք'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Verse of the Day Editorial Hero Card */}
        <section className="hub-votd-card" style={{ background: dailyVerse.gradient }}>
          <div className="hub-votd-top">
            <span className="hub-votd-label">
              {language === 'ru' ? 'СТИХ ДНЯ' : language === 'en' ? 'VERSE OF THE DAY' : 'ՕՐՎԱ ԽՈՍՔ'}
              {' · '}
              {todayFormatted.toUpperCase()}
            </span>
          </div>
          <blockquote className="hub-votd-text">
            «{dailyVerse.text[language] || dailyVerse.text.am}»
          </blockquote>
          <div className="hub-votd-ref">{dailyVerse.ref[language] || dailyVerse.ref.am}</div>
          <div className="hub-votd-actions">
            <button
              type="button"
              className="hub-votd-btn-primary"
              onClick={() =>
                guardPath('/bible', () =>
                  navigate(`/bible?book=${dailyVerse.book}&chapter=${dailyVerse.chapter}&verse=${dailyVerse.verse}`),
                )
              }
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>{language === 'ru' ? 'Читать главу' : language === 'en' ? 'Read chapter' : 'Կարդալ գլուխը'}</span>
            </button>
            <button
              type="button"
              className="hub-votd-btn-ghost"
              onClick={() =>
                nativeShare({
                  title: dailyVerse.ref[language] || dailyVerse.ref.am,
                  text: `«${dailyVerse.text[language] || dailyVerse.text.am}» — ${dailyVerse.ref[language] || dailyVerse.ref.am}`,
                })
              }
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>{language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Կիսվել'}</span>
            </button>
            <button
              type="button"
              className="hub-votd-icon-btn"
              onClick={handleCopyVotd}
              aria-label={language === 'ru' ? 'Копировать' : language === 'en' ? 'Copy' : 'Պատճենել'}
              title={language === 'ru' ? 'Копировать' : language === 'en' ? 'Copy' : 'Պատճենել'}
            >
              {votdCopied ? (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </section>

        {/* Active Bible Reading Plan Progress Card */}
        <section className={`hub-plan-card ${bibleSummary.percent === 100 ? 'is-complete' : ''}`}>
          <div className="hub-plan-card-head">
            <div className="hub-plan-card-title">
              <span className="hub-plan-kicker">
                {language === 'ru' ? 'ПЛАН ЧТЕНИЯ' : language === 'en' ? 'READING PLAN' : 'ԸՆԹԵՐՑՄԱՆ ՊԼԱՆ'}
              </span>
              <strong>{bibleSummary.plan.title[language] || bibleSummary.plan.title.am}</strong>
            </div>
            <span className={`hub-plan-badge ${bibleSummary.percent === 100 ? 'is-complete' : ''}`}>
              {bibleSummary.completedCount}/{bibleSummary.totalDays} · {bibleSummary.percent}%
            </span>
          </div>

          <div className="hub-plan-progress-track">
            <div
              className={`hub-plan-progress-fill ${bibleSummary.percent === 100 ? 'is-complete' : ''}`}
              style={{ width: `${bibleSummary.percent}%` }}
            />
          </div>

          {bibleSummary.nextDay ? (
            <button
              type="button"
              className="hub-plan-continue-row"
              onClick={() => {
                triggerHaptic('light');
                guardPath('/bible', () =>
                  navigate(
                    `/bible?book=${bibleSummary.nextDay.book}&chapter=${bibleSummary.nextDay.chapter}&plan=${bibleSummary.plan.id}&day=${bibleSummary.nextDay.day}`,
                  ),
                );
              }}
            >
              <div className="hub-plan-next-meta">
                <span>
                  {language === 'ru'
                    ? `День ${bibleSummary.nextDay.day}`
                    : language === 'en'
                    ? `Day ${bibleSummary.nextDay.day}`
                    : `Օր ${bibleSummary.nextDay.day}`}
                </span>
                <strong>{bibleSummary.nextDay.label[language] || bibleSummary.nextDay.label.am}</strong>
              </div>
              <span className="hub-plan-go-pill">
                {language === 'ru' ? 'Читать' : language === 'en' ? 'Read' : 'Կարդալ'}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="hub-plan-continue-row"
              onClick={() => guardPath('/bible', () => navigate('/bible?tab=my'))}
            >
              <div className="hub-plan-next-meta">
                <span className="is-emerald">
                  {language === 'ru' ? 'Завершено' : language === 'en' ? 'Completed' : 'Ավարտված է'}
                </span>
                <strong>
                  {language === 'ru'
                    ? 'Выбрать новый план чтения'
                    : language === 'en'
                    ? 'Choose a new reading plan'
                    : 'Ընտրել նոր ընթերցման պլան'}
                </strong>
              </div>
              <span className="hub-plan-go-pill is-emerald">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          )}
        </section>

        {/* Weekly Calendar Strip */}
        <section className="hub-week-card">
          <div className="hub-week-header">
            <strong className="hub-week-date-title">
              {new Date(`${selectedDayStr}T12:00:00`).toLocaleDateString(
                language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'hy-AM',
                { weekday: 'long', day: 'numeric', month: 'long' },
              )}
            </strong>
            <button
              type="button"
              className="hub-week-cal-pill"
              onClick={() => guardPath('/church?tab=calendar', () => navigate('/church?tab=calendar'))}
            >
              <span>{language === 'ru' ? 'Месяц' : language === 'en' ? 'Month' : 'Ամիս'}</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="hub-week-strip">
            {weekDays.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                className={`hub-week-day ${day.isToday ? 'is-today' : ''} ${selectedDayStr === day.dateStr ? 'is-selected' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedDayStr(day.dateStr);
                }}
              >
                <span className="hub-week-name">{day.label}</span>
                <strong className="hub-week-num">{day.dayNum}</strong>
                {day.hasService && <span className="hub-week-dot" />}
              </button>
            ))}
          </div>

          {selectedDayInfo?.setlists?.length > 0 ? (
            <div className="hub-week-detail">
              <div className="hub-week-event-info">
                <strong className="hub-week-event-title-row">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#f7b500" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span>{selectedDayInfo.setlists[0].name}</span>
                </strong>
                <small>
                  {language === 'ru' ? 'Список песен на служение' : language === 'en' ? 'Worship Setlist' : 'Ծառայության երգացանկ'}
                </small>
              </div>
              <button
                type="button"
                className="hub-week-rsvp-btn"
                onClick={() =>
                  guardPath(`/setlists/${selectedDayInfo.setlists[0].id}`, () =>
                    navigate(`/setlists/${selectedDayInfo.setlists[0].id}`),
                  )
                }
              >
                {language === 'ru' ? 'Открыть' : language === 'en' ? 'Open' : 'Բացել'}
              </button>
            </div>
          ) : selectedDayInfo?.events?.length > 0 ? (
            <div className="hub-week-events-stack">
              {selectedDayInfo.events.slice(0, 2).map((ev) => {
                const rKey = `${ev.kind || 'event'}_${ev.id}`;
                const isGoing = rsvpState[rKey] ? rsvpState[rKey] === 'going' : ev.my_rsvp === 'going';
                return (
                  <div key={rKey} className="hub-week-detail">
                    <div className="hub-week-event-info">
                      <strong>{ev.title}</strong>
                      <small>
                        {ev.location ? `${ev.location} · ` : ''}
                        <span className="hub-week-live-time">{ev.time || '19:00'}</span>
                      </small>
                    </div>
                    <button
                      type="button"
                      className={`hub-week-rsvp-btn ${isGoing ? 'is-going' : ''}`}
                      onClick={() => handleQuickEventRsvp(ev)}
                    >
                      {isGoing
                        ? (language === 'ru' ? 'Иду ✓' : language === 'en' ? 'Going ✓' : 'Կգամ ✓')
                        : (language === 'ru' ? 'Приду' : language === 'en' ? 'RSVP' : 'Կգամ')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hub-week-detail is-empty">
              <span>
                {language === 'ru'
                  ? 'На этот день нет запланированных служений'
                  : language === 'en'
                  ? 'No services or rehearsals on this day'
                  : 'Այս օրվա համար գրանցված ծառայություն կամ փորձ չկա'}
              </span>
              <button
                type="button"
                className="hub-week-cal-link"
                onClick={() =>
                  guardPath('/church?tab=calendar', () => navigate('/church?tab=calendar'))
                }
              >
                <span>{language === 'ru' ? 'Календарь' : language === 'en' ? 'Calendar' : 'Օրացույց'}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* My Favorites (Horizontal Carousel) */}
        {user && favorites.length > 0 && (
          <section className="section-block">
            <div className="section-title section-title-action">
              <div>
                <h3>{t('hub.myFavorites')}</h3>
                <p className="section-subtitle">{favorites.length} {t('favorites.savedSongs')}</p>
              </div>
              <button className="section-link-btn" type="button" onClick={openFavorites}>
                <span>{t('favorites.viewAll')}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="hub-horizontal" ref={favScrollRef}>
              {visibleFavorites.map((song, i) => {
                const songId = song.song_id || song.id;
                const savedKey = song.target_key || song.song_key || '♪';
                const songTitle = getLocalizedTitle(song, language);
                return (
                  <button
                    key={song.id || songId}
                    type="button"
                    className="hub-fav-card"
                    aria-label={songTitle}
                    onClick={() => {
                      const favUrl = `/song/${songId}?list=favorites&sort=saved_newest${song.target_key ? `&tkey=${encodeURIComponent(song.target_key)}` : ''}`;
                      guardPath(favUrl, () => navigate(favUrl));
                    }}
                  >
                    <div
                      className="hub-fav-cover"
                      style={getSongCoverStyle(songId || i, song.title || songTitle || savedKey)}
                    >
                      <div className="hub-fav-cover-badge" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </div>
                      <span className="hub-fav-cover-key">{savedKey}</span>
                    </div>
                    <div className="fav-info">
                      <h4>{songTitle}</h4>
                      <p className="hub-fav-meta">
                        <span>{t('favorites.keyTag')} {savedKey}</span>
                        {Number.parseInt(song.bpm, 10) > 0 && <span>{song.bpm} BPM</span>}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Recently Added Songs (Horizontal Carousel) */}
        <section className="section-block">
          <div className="section-title section-title-action">
            <div>
              <h3>{t('hub.recentChords')}</h3>
              {allSongs.length > 0 && (
                <p className="section-subtitle">
                  {language === 'ru'
                    ? `${allSongs.length} песен в каталоге`
                    : language === 'en'
                    ? `${allSongs.length} songs in catalog`
                    : `${allSongs.length} երգ կատալոգում`}
                </p>
              )}
            </div>
            <button
              className="section-link-btn"
              type="button"
              onClick={() => guardPath('/songs', () => navigate('/songs'))}
            >
              <span>{language === 'ru' ? 'Все' : language === 'en' ? 'All' : 'Բոլորը'}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="recent-songs-scroll" ref={recentScrollRef}>
            {recentSongs.map((song, i) => (
              <button
                key={song.id}
                type="button"
                className="recent-song-card"
                onClick={() => guardPath(`/song/${song.id}`, () => navigate(`/song/${song.id}`))}
              >
                <div
                  className="recent-song-cover"
                  style={getSongCoverStyle(song.id || i, song.title || song.song_key || '')}
                >
                  <span className="recent-song-watermark" aria-hidden="true">
                    {song.song_key || '♪'}
                  </span>
                  <span className="recent-song-key-pill">{song.song_key || '♪'}</span>
                  {Number.parseInt(song.bpm, 10) > 0 && (
                    <span className="recent-song-bpm-pill">{song.bpm}</span>
                  )}
                </div>
                <div className="recent-song-info">
                  <h4>{getLocalizedTitle(song, language)}</h4>
                  <p>{song.artist || t('songs.unknownArtist', 'Անհայտ հեղինակ')}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Word of Encouragement & Quote of the Day */}
        <section className="section-block">
          <div className="section-title">
            <h3>{language === 'ru' ? 'Слово ободрения' : language === 'en' ? 'Word of Encouragement' : 'Քաջալերանքի խոսք'}</h3>
          </div>

          <div className="hub-encourage-card" style={{ '--topic-accent': activeTopic?.accent || '#f7b500' }}>
            <div className="hub-encourage-bars" aria-hidden="true">
              {TOPIC_COLLECTIONS.map((tp, idx) => (
                <button
                  key={tp.id}
                  type="button"
                  className={`hub-encourage-bar ${idx === activeTopicIdx ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTopicIdx(idx);
                  }}
                  aria-label={tp.title[language] || tp.title.am}
                />
              ))}
            </div>

            <div className="hub-encourage-pills" ref={topicsScrollRef}>
              {TOPIC_COLLECTIONS.map((topic, idx) => (
                <button
                  key={topic.id}
                  type="button"
                  className={`hub-encourage-pill ${idx === activeTopicIdx ? 'active' : ''}`}
                  style={{ '--pill-color': topic.accent }}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTopicIdx(idx);
                  }}
                >
                  <span className="hub-encourage-dot" />
                  <span>{topic.title[language] || topic.title.am}</span>
                </button>
              ))}
            </div>

            {activeTopic && (
              <div className="hub-encourage-body">
                <p className="hub-encourage-quote">«{activeTopic.snippet[language] || activeTopic.snippet.am}»</p>
                <div className="hub-encourage-foot">
                  <strong>{activeTopic.verse}</strong>
                  <div className="hub-encourage-nav">
                    <button
                      type="button"
                      className="hub-encourage-step"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTopicIdx((i) => (i - 1 + TOPIC_COLLECTIONS.length) % TOPIC_COLLECTIONS.length);
                      }}
                      aria-label="Prev"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="hub-encourage-step"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTopicIdx((i) => (i + 1) % TOPIC_COLLECTIONS.length);
                      }}
                      aria-label="Next"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="hub-encourage-read-btn"
                      onClick={() =>
                        guardPath('/bible', () =>
                          navigate(`/bible?book=${activeTopic.book}&chapter=${activeTopic.chapter}`),
                        )
                      }
                    >
                      <span>{language === 'ru' ? 'Открыть' : language === 'en' ? 'Read' : 'Կարդալ'}</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hub-quote-card">
            <span className="hub-quote-label">
              {language === 'ru' ? 'ЦИТАТА ДНЯ' : language === 'en' ? 'QUOTE OF THE DAY' : 'ՕՐՎԱ ՄԵՋԲԵՐՈՒՄ'}
            </span>
            <p className="hub-quote-text">«{dailyQuote.text[language] || dailyQuote.text.am}»</p>
            <div className="hub-quote-foot">
              <span>
                {dailyQuote.author[language] || dailyQuote.author.am} · {dailyQuote.years}
              </span>
              <button
                type="button"
                className="hub-quote-share-btn"
                onClick={() =>
                  nativeShare({
                    title: dailyQuote.author[language] || dailyQuote.author.am,
                    text: `«${dailyQuote.text[language] || dailyQuote.text.am}» — ${dailyQuote.author[language] || dailyQuote.author.am}`,
                  })
                }
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Կիսվել'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Latest News (Compact Editorial Cards) */}
        {newsItems.length > 0 && (
          <section className="section-block">
            <div className="section-title section-title-action">
              <h3>{t('hub.latestNews')}</h3>
              <button
                className="section-link-btn"
                type="button"
                onClick={() => guardPath('/news', () => navigate('/news'))}
              >
                <span>{language === 'ru' ? 'Все' : language === 'en' ? 'All' : 'Բոլորը'}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className="news-feed-list">
              {newsItems.slice(0, 3).map((item, i) => (
                <button
                  key={item.slug || i}
                  type="button"
                  className="hub-news-card"
                  onClick={() => guardPath(`/news/${item.slug}`, () => navigate(`/news/${item.slug}`))}
                >
                  <div
                    className={`news-img img-${(i % 2) + 1}`}
                    style={item.image_url ? { backgroundImage: `url("${getNewsImageUrl(item)}")` } : undefined}
                  />
                  <div className="news-content">
                    <div className="news-meta-row">
                      {item.release_version ? (
                        <span className="news-release-version">{formatNewsVersion(item.release_version)}</span>
                      ) : null}
                      <span className="news-date">{formatNewsDate(item.published_at || item.date, language)}</span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.excerpt || item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
