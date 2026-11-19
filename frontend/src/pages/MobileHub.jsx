import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { saveRecentSongSearch } from '../utils/recentSearches';
import { sortSavedSongs } from '../utils/savedSongs';
import { fallbackNews, getCachedNewsList, fetchNewsList, formatNewsDate, formatNewsVersion, getNewsImageUrl } from '../utils/news';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { usePwaOfflineGuard } from '../hooks/usePwaOfflineGuard';
import { useHorizontalDragScroll } from '../hooks/useHorizontalDragScroll';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge, ComingSoonBadge } from '../components/BetaBadge';
import { PlatformAnnouncementBanner } from '../components/PlatformAnnouncementGuard';
import { getTodayDevotional, TOPIC_COLLECTIONS } from '../utils/devotionalData';
import { nativeShare } from '../utils/nativeFeatures';
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
  const target = new Date(cleanDate + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
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

export default function MobileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { isVisible, isSoon, isBeta } = useFeatureFlags();
  
  const [allSongs, setAllSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [upcomingSetlist, setUpcomingSetlist] = useState(null);
  const [userSetlists, setUserSetlists] = useState([]);
  const [churchCalendarItems, setChurchCalendarItems] = useState([]);
  const [selectedDayStr, setSelectedDayStr] = useState(getTodayStr);
  const [favorites, setFavorites] = useState([]);
  const [newsItems, setNewsItems] = useState(() => getCachedNewsList(language));
  const [logoSrc, setLogoSrc] = useState('/icon-192-v7.png');
  const { guardPath } = usePwaOfflineGuard();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [lastBibleRead] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wp_bible_last_read_v1') || 'null');
    } catch {
      return null;
    }
  });
  const todayDevotional = useMemo(() => getTodayDevotional(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const favScrollRef = useHorizontalDragScroll();
  const recentScrollRef = useHorizontalDragScroll();

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
          setAllSongs(parsed);
          setRecentSongs(parsed.slice(0, 10));
        }
      }
      if (user) {
        const cachedFavs = localStorage.getItem('wp_user_favorites_cache');
        if (cachedFavs) {
          const parsed = JSON.parse(cachedFavs);
          if (Array.isArray(parsed)) setFavorites(parsed);
        }
      }
    } catch {}

    let cancelled = false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = controller ? controller.signal : undefined;

    // Fetch recent songs from API
    fetch('/api.php', { signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setAllSongs(data);
          setRecentSongs(data.slice(0, 10));
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(data));
          } catch {}
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.warn('Songs sync skipped:', err?.message || err);
        }
      });

    // Fetch church calendar items (services, rehearsals, events) for the 7-day strip
    fetch('/church_api.php?action=get_calendar', { credentials: 'include', signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        if (Array.isArray(data.items)) {
          setChurchCalendarItems(data.items);
        }
      })
      .catch(() => {});

    // Fetch user specific data
    if (user) {
      // Fetch setlists (find nearest upcoming service whose date has not passed)
      fetch('/setlists_api.php?action=get_setlists', { credentials: 'include', cache: 'no-store', signal })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled || !data) return;
          if (Array.isArray(data) && data.length > 0) {
            setUserSetlists(data);
            const todayStr = getTodayStr();
            const upcoming = data
              .filter(s => s.service_date && String(s.service_date).slice(0, 10) >= todayStr && s.status !== 'archived')
              .sort((a, b) => String(a.service_date).localeCompare(String(b.service_date)))[0];
            setUpcomingSetlist(upcoming || null);
          } else if (Array.isArray(data)) {
            setUserSetlists([]);
            setUpcomingSetlist(null);
          }
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            console.warn('Setlists sync skipped:', err?.message || err);
          }
        });

      // Fetch favorites
      fetch('/user_favorites_api.php?action=get_favorites', { credentials: 'include', cache: 'no-store', signal })
        .then(res => {
          if (res.status === 401 || res.status === 403 || res.status === 503) {
            return null;
          }
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (cancelled || !Array.isArray(data)) return;
          setFavorites(data);
          try {
            localStorage.setItem('wp_user_favorites_cache', JSON.stringify(data));
          } catch {}
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            console.warn('Saved songs sync skipped:', err?.message || err);
          }
        });
    } else {
      setFavorites([]);
      setUpcomingSetlist(null);
    }

    return () => {
      cancelled = true;
      controller?.abort();
    };
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

  const formatSetlistServiceDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const cleanDate = String(dateStr).slice(0, 10);
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) {
          const loc = language === 'am' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US';
          const formatted = d.toLocaleDateString(loc, { month: 'long', day: 'numeric', year: 'numeric' });
          const relLabel = getRelativeDateLabel(cleanDate, language);
          return relLabel ? `${formatted} • ${relLabel}` : formatted;
        }
      }
      return cleanDate;
    } catch {
      return dateStr;
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    searchInputRef.current?.blur();
    document.activeElement?.blur();
    const q = searchQuery.trim();
    if (q) {
      saveRecentSongSearch(q);
      navigate(`/songs?q=${encodeURIComponent(q)}`);
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
  ).slice(0, 10), [favorites, language]);

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
      const daySetlists = userSetlists.filter((s) => String(s.service_date || '').slice(0, 10) === dateStr);
      const dayEvents = churchCalendarItems.filter((ev) => String(ev.date || '').slice(0, 10) === dateStr);
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
  }, [language, userSetlists, churchCalendarItems]);

  const selectedDayInfo = weekDays.find((d) => d.dateStr === selectedDayStr) || weekDays.find((d) => d.isToday);
  const dailyVerse = todayDevotional.verse;
  const dailyQuote = todayDevotional.quote;

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
        <PlatformAnnouncementBanner embedded navigate={navigate} language={language} />
        <div className="hub-today-greeting">
          <div>
            <span className="hub-today-eyebrow">
              {language === 'ru' ? 'СЕГОДНЯ' : language === 'en' ? 'TODAY' : 'ԱՅՍՕՐ'}
            </span>
            <h1 className="hub-today-title">{greetingText}</h1>
          </div>
          {lastBibleRead?.book && (
            <button
              type="button"
              className="hub-resume-pill"
              onClick={() =>
                guardPath('/bible', () =>
                  navigate(`/bible?book=${lastBibleRead.book}&chapter=${lastBibleRead.chapter}&tr=${lastBibleRead.translation || ''}`),
                )
              }
            >
              📖 {lastBibleRead.bookName} {lastBibleRead.chapter}
            </button>
          )}
        </div>

        {/* Verse of the Day Hero Card (MyEkklesia Editorial Style) */}
        <section className="hub-votd-card" style={{ background: dailyVerse.gradient }}>
          <div className="hub-votd-top">
            <span className="hub-votd-label">
              {language === 'ru' ? 'СТИХ ДНЯ' : language === 'en' ? 'VERSE OF THE DAY' : 'ՕՐՎԱ ԽՈՍՔ'}
              {' · '}
              {new Date().toLocaleDateString(
                language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'hy-AM',
                { day: 'numeric', month: 'long' }
              ).toUpperCase()}
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
              {language === 'ru' ? 'Читать главу' : language === 'en' ? 'Read chapter' : 'Կարդալ գլուխը'}
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
              {language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Կիսվել'}
            </button>
          </div>
        </section>

        {/* Weekly Calendar Strip */}
        <section className="hub-week-card">
          <div className="hub-week-header">
            <strong className="hub-week-date-title">
              {new Date(`${selectedDayStr}T12:00:00`).toLocaleDateString(
                language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'hy-AM',
                { weekday: 'long', day: 'numeric', month: 'long' }
              )}
            </strong>
            <button
              type="button"
              className="hub-week-cal-pill"
              onClick={() => guardPath('/church?tab=calendar', () => navigate('/church?tab=calendar'))}
            >
              {language === 'ru' ? 'Месяц ›' : language === 'en' ? 'Month ›' : 'Ամիս ›'}
            </button>
          </div>
          <div className="hub-week-strip">
            {weekDays.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                className={`hub-week-day ${day.isToday ? 'is-today' : ''} ${selectedDayStr === day.dateStr ? 'is-selected' : ''}`}
                onClick={() => setSelectedDayStr(day.dateStr)}
              >
                <span className="hub-week-name">{day.label}</span>
                <strong className="hub-week-num">{day.dayNum}</strong>
                {day.hasService && <span className="hub-week-dot" />}
              </button>
            ))}
          </div>
          {selectedDayInfo?.setlists?.length > 0 ? (
            <div className="hub-week-detail">
              <span>🎵 {selectedDayInfo.setlists[0].name}</span>
              <button
                type="button"
                onClick={() =>
                  guardPath(`/setlists/${selectedDayInfo.setlists[0].id}`, () =>
                    navigate(`/setlists/${selectedDayInfo.setlists[0].id}`),
                  )
                }
              >
                {language === 'ru' ? 'Открыть →' : language === 'en' ? 'Open →' : 'Բացել →'}
              </button>
            </div>
          ) : selectedDayInfo?.events?.length > 0 ? (
            <div className="hub-week-detail">
              <span>
                {selectedDayInfo.events[0].kind === 'rehearsal' ? '🎸 ' : '⛪ '}
                {selectedDayInfo.events[0].title}
                {selectedDayInfo.events[0].time ? ` · ${selectedDayInfo.events[0].time}` : ''}
              </span>
              <button
                type="button"
                onClick={() =>
                  guardPath('/church?tab=calendar', () => navigate('/church?tab=calendar'))
                }
              >
                {language === 'ru' ? 'Календарь →' : language === 'en' ? 'Calendar →' : 'Օրացույց →'}
              </button>
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
                onClick={() =>
                  guardPath('/church?tab=calendar', () => navigate('/church?tab=calendar'))
                }
              >
                {language === 'ru' ? 'Календарь →' : language === 'en' ? 'Calendar →' : 'Օրացույց →'}
              </button>
            </div>
          )}
        </section>

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
            <button type="submit" className="hub-search-icon-btn" aria-label="Որոնել">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" className="hub-search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <input 
              ref={searchInputRef}
              type="text" 
              className="hub-search-input"
              placeholder={t('hub.searchPlaceholder', 'Որոնել երգեր, հեղինակներ, խոսքեր...')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {searchQuery && (
              <button
                type="button"
                className="hub-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Մաքրել"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="hub-search-btn-badge"
            >
              {language === 'am' ? 'Որոնել' : 'Search'}
            </button>
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
            <button className="hub-cat-card" onClick={() => guardPath('/bible', () => navigate('/bible'))}>
              <div className="cat-icon bg-amber"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
              <span className="cat-text">{language === 'ru' ? 'Библия' : language === 'en' ? 'Bible' : 'Աստվածաշունչ'}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/church', () => navigate('/church'))}>
              <div className="cat-icon bg-indigo"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v5"/><path d="M9.5 4.5h5"/><path d="M4 22V11l8-5 8 5v11"/><path d="M9 22v-6h6v6"/></svg></div>
              <span className="cat-text">{language === 'ru' ? 'Церковь' : language === 'en' ? 'Church' : 'Եկեղեցի և Աղոթք'}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/media', () => navigate('/media'))}>
              <div className="cat-icon bg-cyan"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>
              <span className="cat-text">{language === 'ru' ? 'Медиа и Радио' : language === 'en' ? 'Media & Radio' : 'Մեդիա և Ռադիո'}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/church?tab=rehearsals', () => navigate('/church?tab=rehearsals'))}>
              <div className="cat-icon bg-gold"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
              <span className="cat-text">{language === 'ru' ? 'Календарь и репетиции' : language === 'en' ? 'Calendar & Rehearsals' : 'Օրացույց և Փորձեր'}</span>
            </button>
            <button className="hub-cat-card" onClick={() => guardPath('/song-request', () => navigate('/song-request'))}>
              <div className="cat-icon bg-orange"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
              <span className="cat-text">{t('songRequest.title', 'Խնդրել Երգ')}</span>
            </button>
            {isVisible('pro_studio') && (
              <button 
                className={`hub-cat-card ${isSoon('pro_studio') ? 'is-disabled-soon' : ''} ${isSoon('pro_studio') || isBeta('pro_studio') ? 'has-corner-badge' : ''}`} 
                onClick={() => {
                  if (isSoon('pro_studio')) return;
                  guardPath('/studio', () => navigate('/studio'));
                }}
                disabled={isSoon('pro_studio')}
                style={isSoon('pro_studio') ? { cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                title={isSoon('pro_studio') ? 'Pro Studio-ն շուտով հասանելի կլինի' : undefined}
              >
                <div className="cat-icon" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))', color: '#c084fc' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <span className="cat-text">Pro Studio</span>
                {isSoon('pro_studio') ? (
                  <span className="hub-cat-corner-badge soon">Շուտով</span>
                ) : (
                  isBeta('pro_studio') && <span className="hub-cat-corner-badge beta">BETA</span>
                )}
              </button>
            )}
            <button className={`hub-cat-card ${!isVisible('pro_studio') ? 'hub-cat-card-wide' : ''}`} onClick={() => guardPath('/transpose', () => navigate('/transpose'))}>
              <div className="cat-icon bg-transpose"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M7 4 4 7l3 3M20 17H4m13-3 3 3-3 3" /></svg></div>
              <span className="cat-text">{t('hub.categories.transposer')}</span>
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
              <p>{formatSetlistServiceDate(upcomingSetlist.service_date)}</p>
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

        {/* Guest Account Prompt Card */}
        {!user && (
          <div className="hub-account-prompt-card">
            <div className="hub-account-prompt-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            
            <div className="hub-horizontal" ref={favScrollRef}>
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
          
          <div className="recent-songs-scroll" ref={recentScrollRef}>
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

        {/* Thematic Topics & Quote of the Day (myekklesia-inspired) */}
        <div className="section-block">
          <div className="section-title">
            <h3>{language === 'ru' ? 'Темы дня' : language === 'en' ? 'Daily Topics' : 'Օրվա թեմաներ'}</h3>
          </div>
          <div className="hub-topics-scroll">
            {TOPIC_COLLECTIONS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="hub-topic-card"
                onClick={() => guardPath('/bible', () => navigate(`/bible?book=${topic.book}&chapter=${topic.chapter}`))}
              >
                <span className="hub-topic-dot" style={{ background: topic.accent }} />
                <strong>{topic.title[language] || topic.title.am}</strong>
                <p>{topic.snippet[language] || topic.snippet.am}</p>
                <small>{topic.verse}</small>
              </button>
            ))}
          </div>

          <div className="hub-quote-card">
            <span className="hub-quote-label">
              {language === 'ru' ? 'ЦИТАТА ДНЯ' : language === 'en' ? 'QUOTE OF THE DAY' : 'ՕՐՎԱ ՄԵՋԲԵՐՈՒՄ'}
            </span>
            <p className="hub-quote-text">«{dailyQuote.text[language] || dailyQuote.text.am}»</p>
            <div className="hub-quote-foot">
              <span>{dailyQuote.author[language] || dailyQuote.author.am} · {dailyQuote.years}</span>
              <button
                type="button"
                onClick={() =>
                  nativeShare({
                    title: dailyQuote.author[language] || dailyQuote.author.am,
                    text: `«${dailyQuote.text[language] || dailyQuote.text.am}» — ${dailyQuote.author[language] || dailyQuote.author.am}`,
                  })
                }
              >
                {language === 'ru' ? 'Поделиться' : language === 'en' ? 'Share' : 'Կիսվել'}
              </button>
            </div>
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
