import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  BIBLE_BOOKS,
  BIBLE_BOOK_GENRES,
  BIBLE_READING_PLANS,
  BIBLICAL_MEASURES,
  DEFAULT_BIBLE_TRANSLATIONS,
  getAlignedParallelChapter,
  getBookGenre,
  getBookName,
  matchMeasureToken,
} from '../utils/bibleData';
import { nativeShare, triggerHaptic } from '../utils/nativeFeatures';
import './Bible.css';

const VerseShareCardModal = lazyWithRetry(
  () => import('../components/VerseShareCardModal'),
  'VerseShareCardModal',
);

const BIBLE_STREAK_KEY = 'wp_bible_streak_v1';
const BIBLE_PLANS_PROGRESS_KEY = 'wp_bible_plans_progress_v1';
const BIBLE_ACTIVE_PLAN_KEY = 'wp_bible_active_plan_v1';

function getTodayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function recordReadingStreak() {
  const today = getTodayIsoDate();
  try {
    const raw = JSON.parse(localStorage.getItem(BIBLE_STREAK_KEY) || 'null');
    if (raw && raw.lastDate === today) return raw;
    let nextCount = 1;
    if (raw && raw.lastDate) {
      const prevD = new Date(`${raw.lastDate}T00:00:00`);
      const curD = new Date(`${today}T00:00:00`);
      const diffDays = Math.round((curD - prevD) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) nextCount = (Number(raw.count) || 0) + 1;
    }
    const updated = { count: nextCount, lastDate: today };
    localStorage.setItem(BIBLE_STREAK_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return { count: 1, lastDate: today };
  }
}

const MEASURES_SPLIT_REGEX = new RegExp(
  `(${BIBLICAL_MEASURES.map((m) => m.pattern.source).join('|')})`,
  'gi',
);

function formatVerseSelectionRange(verseNums) {
  if (!verseNums || verseNums.length === 0) return '';
  const sorted = [...new Set(verseNums)].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  const parts = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      parts.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  parts.push(start === end ? `${start}` : `${start}-${end}`);
  return parts.join(', ');
}

const LAST_READ_KEY = 'wp_bible_last_read_v1';
const USER_STATE_KEY = 'wp_bible_user_state_v1';
const PREFS_KEY = 'wp_bible_prefs_v1';

const HIGHLIGHT_COLORS = [
  { id: 'amber', hex: '#f7b500', bg: 'rgba(247, 181, 0, 0.22)' },
  { id: 'cyan', hex: '#38bdf8', bg: 'rgba(56, 189, 248, 0.20)' },
  { id: 'emerald', hex: '#34d399', bg: 'rgba(52, 211, 153, 0.20)' },
  { id: 'rose', hex: '#fb7185', bg: 'rgba(251, 113, 133, 0.20)' },
];

function defaultTranslationForLang(lang) {
  if (lang === 'am') return 'nor_ararat';
  if (lang === 'ru') return 'synodal';
  return 'akjv';
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function Bible() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialStored = useMemo(() => readJsonStorage(LAST_READ_KEY, null), []);
  const initialPrefs = useMemo(
    () =>
      readJsonStorage(PREFS_KEY, {
        fontSize: 18,
        fontFamily: 'serif',
        parallelEnabled: false,
        parallelTr: language === 'am' ? 'synodal' : 'akjv',
      }),
    [language],
  );

  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'my' ? 'my' : 'read',
  ); // 'read' | 'my'
  const [translations, setTranslations] = useState(DEFAULT_BIBLE_TRANSLATIONS);
  const [translation, setTranslation] = useState(() => {
    const paramTr = searchParams.get('tr');
    if (paramTr) return paramTr;
    if (initialStored?.translation && initialStored.translation !== 'easternarmenian') {
      return initialStored.translation;
    }
    return defaultTranslationForLang(language);
  });
  const [bookId, setBookId] = useState(() => Number(searchParams.get('book')) || initialStored?.book || 43);
  const [chapter, setChapter] = useState(() => Number(searchParams.get('chapter')) || initialStored?.chapter || 1);

  const [prefs, setPrefs] = useState(initialPrefs);
  const [showAaModal, setShowAaModal] = useState(false);
  const [showBookDrawer, setShowBookDrawer] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState(() => (bookId >= 40 ? 'new' : 'old'));
  const [bookSearch, setBookSearch] = useState('');

  const [verses, setVerses] = useState([]);
  const [parallelVerses, setParallelVerses] = useState([]);
  const [effectiveTranslation, setEffectiveTranslation] = useState(translation);
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [chapterError, setChapterError] = useState('');
  const [unavailableNotice, setUnavailableNotice] = useState(false);

  const isMobileViewport = useMediaQuery('(max-width: 900px)');
  const [selectedVerse, setSelectedVerse] = useState(() => {
    const v = Number(searchParams.get('verse'));
    return v > 0 ? v : null;
  });
  const [selectedVerses, setSelectedVerses] = useState(() => {
    const v = Number(searchParams.get('verse'));
    return v > 0 ? [v] : [];
  });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [readerPage, setReaderPage] = useState(0);
  const [activeMeasure, setActiveMeasure] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [speakingVerse, setSpeakingVerse] = useState(null);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [offlineProgress, setOfflineProgress] = useState(null); // { done, total }
  const [offlineReadyTick, setOfflineReadyTick] = useState(0);
  const [showShareCardModal, setShowShareCardModal] = useState(false);
  const [activePlanId, setActivePlanId] = useState(() => {
    const paramPlan = searchParams.get('plan');
    if (paramPlan && BIBLE_READING_PLANS.some((p) => p.id === paramPlan)) {
      return paramPlan;
    }
    try {
      const saved = localStorage.getItem(BIBLE_ACTIVE_PLAN_KEY);
      if (saved && BIBLE_READING_PLANS.some((p) => p.id === saved)) return saved;
    } catch { /* ignore storage error */ }
    return 'essentials_14';
  });
  const [activePlanSession, setActivePlanSession] = useState(() => {
    const paramPlan = searchParams.get('plan');
    const paramDay = Number(searchParams.get('day'));
    if (paramPlan && paramDay > 0) {
      const plan = BIBLE_READING_PLANS.find((p) => p.id === paramPlan);
      const item = plan?.days.find((d) => d.day === paramDay);
      if (plan && item) {
        return { planId: plan.id, day: item.day, book: item.book, chapter: item.chapter };
      }
    }
    return null;
  }); // { planId, day, book, chapter } | null
  const [mySubTab, setMySubTab] = useState('plans'); // 'plans' | 'saved'
  const [savedFilter, setSavedFilter] = useState('all'); // 'all' | 'bookmarks' | 'notes' | 'highlights'
  const [showAllPlanDays, setShowAllPlanDays] = useState(false);
  const [extraPlanProgress, setExtraPlanProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIBLE_PLANS_PROGRESS_KEY) || '{}') || {};
    } catch {
      return {};
    }
  });
  const [readingStreak, setReadingStreak] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIBLE_STREAK_KEY) || 'null') || { count: 0, lastDate: '' };
    } catch {
      return { count: 0, lastDate: '' };
    }
  });
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareItems, setCompareItems] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const swipeStartXRef = useRef(null);
  const audioStopRef = useRef(true);
  const ttsAudioRef = useRef(null);
  const audioSpeedRef = useRef(audioSpeed);

  useEffect(() => {
    audioSpeedRef.current = audioSpeed;
    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.playbackRate = audioSpeed;
      } catch { /* ignore */ }
    }
  }, [audioSpeed]);

  const [userState, setUserState] = useState(() =>
    readJsonStorage(USER_STATE_KEY, {
      highlights: [],
      notes: [],
      bookmarks: [],
      plan_days: [],
      last_read: null,
    }),
  );

  const [noteDraft, setNoteDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTestament, setSearchTestament] = useState('all'); // 'all' | 'old' | 'new'
  const [searchBookFilter, setSearchBookFilter] = useState(0); // 0 = all books
  const [searchBookCounts, setSearchBookCounts] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const ui = useMemo(() => {
    if (language === 'ru') {
      return {
        readTab: 'Текст',
        myTab: 'Моё',
        oldTest: 'Ветхий Завет',
        newTest: 'Новый Завет',
        books: 'Книги',
        search: 'Поиск',
        searchPlaceholder: 'Поиск по загруженным главам...',
        parallel: 'Параллельный перевод',
        fontSize: 'Размер текста',
        fontType: 'Шрифт',
        serif: 'Literata',
        sans: 'Inter',
        verseActions: 'Выбранный стих',
        selectHint: 'Нажмите на любой стих, чтобы выделить его, скопировать, поделиться или добавить заметку.',
        notePlaceholder: 'Личная заметка к стиху...',
        saveNote: 'Сохранить заметку',
        bookmarkChapter: 'В закладки',
        bookmarked: 'В закладках',
        copy: 'Копировать',
        share: 'Поделиться',
        prevChapter: 'Пред. глава',
        nextChapter: 'След. глава',
        unavailableTitle: 'Книга недоступна в этом переводе',
        unavailableDesc: 'В выбранном переводе нет этой книги. Вы можете переключиться на Синодальный или KJV в один клик.',
        switchSynodal: 'Открыть в Синодальном',
        switchKjv: 'Открыть в KJV',
        readingPlan: 'План чтения (14 дней)',
        highlights: 'Выделения',
        notes: 'Заметки',
        bookmarks: 'Закладки',
        emptyMy: 'Пока пусто — выделяйте стихи и добавляйте заметки во время чтения.',
      };
    }
    if (language === 'en') {
      return {
        readTab: 'Read',
        myTab: 'My Study',
        oldTest: 'Old Testament',
        newTest: 'New Testament',
        books: 'Books',
        search: 'Search',
        searchPlaceholder: 'Search across cached chapters...',
        parallel: 'Parallel Translation',
        fontSize: 'Text Size',
        fontType: 'Font',
        serif: 'Literata',
        sans: 'Inter',
        verseActions: 'Selected Verse',
        selectHint: 'Tap any verse to highlight, bookmark, copy, share, or write a personal study note.',
        notePlaceholder: 'Write a personal note for this verse...',
        saveNote: 'Save Note',
        bookmarkChapter: 'Bookmark Chapter',
        bookmarked: 'Bookmarked',
        copy: 'Copy',
        share: 'Share',
        prevChapter: 'Prev Chapter',
        nextChapter: 'Next Chapter',
        unavailableTitle: 'Book unavailable in this translation',
        unavailableDesc: 'This partial translation does not include this book. Switch to AKJV or Synodal with one tap.',
        switchSynodal: 'Open in Synodal (RU)',
        switchKjv: 'Open in AKJV (EN)',
        readingPlan: 'Reading Plan (14 Days)',
        highlights: 'Highlights',
        notes: 'Notes',
        bookmarks: 'Bookmarks',
        emptyMy: 'Nothing saved yet — tap any verse while reading to highlight or add a note.',
      };
    }
    return {
      readTab: 'Տեքստ',
      myTab: 'Իմը',
      oldTest: 'Հին Կտակարան',
      newTest: 'Նոր Կտակարան',
      books: 'Գրքեր',
      search: 'Որոնում',
      searchPlaceholder: 'Որոնել բառ, բառակապակցություն կամ նախադասություն (օր.՝ Սաղմոս 23, սեր, Տերն է իմ հովիվը)...',
      parallel: 'Զուգահեռ թարգմանություն',
      fontSize: 'Տառաչափ',
      fontType: 'Տառատեսակ',
      serif: 'Literata',
      sans: 'Inter',
      verseActions: 'Ընտրված խոսք',
      selectHint: 'Սեղմեք ցանկացած համար՝ ընդգծելու, պահպանելու, կիսվելու կամ անձնական նշում գրելու համար։',
      notePlaceholder: 'Անձնական նշում այս խոսքի համար...',
      saveNote: 'Պահպանել նշումը',
      bookmarkChapter: 'Էջանշել գլուխը',
      bookmarked: 'Էջանշված է',
      copy: 'Պատճենել',
      share: 'Կիսվել',
      prevChapter: 'Նախորդ գլուխ',
      nextChapter: 'Հաջորդ գլուխ',
      unavailableTitle: 'Այս գիրքը բացակայում է ընտրված թարգմանության մեջ',
      unavailableDesc: 'Ընտրված հայերեն թարգմանությունը պարունակում է միայն Ծննդոց, Ելից և Ավետարանները (կամ ՆԿ)։ Կարող եք մեկ սեղմումով բացել Synodal կամ KJV տարբերակով։',
      switchSynodal: 'Բացել Synodal (RU)',
      switchKjv: 'Բացել AKJV (EN)',
      readingPlan: 'Ընթերցանության պլան (14 օր)',
      highlights: 'Ընդգծումներ',
      notes: 'Նշումներ',
      bookmarks: 'Էջանիշեր',
      emptyMy: 'Դեռ դատարկ է — ընթերցելիս սեղմեք խոսքերի վրա՝ ընդգծելու կամ նշում թողնելու համար։',
    };
  }, [language]);

  const currentBook = useMemo(
    () => BIBLE_BOOKS.find((b) => b.id === bookId) || BIBLE_BOOKS[42],
    [bookId],
  );

  // Sync URL params when navigating inside Bible
  useEffect(() => {
    setSearchParams((prev) => {
      const next = { tr: translation, book: String(bookId), chapter: String(chapter) };
      const existingVerse = prev.get('verse');
      if (existingVerse && String(prev.get('book') || bookId) === String(bookId) && String(prev.get('chapter') || chapter) === String(chapter)) {
        next.verse = existingVerse;
      }
      return next;
    }, { replace: true });
    try {
      const payload = {
        translation,
        book: bookId,
        chapter,
        bookName: getBookName(bookId, language),
        updatedAt: Date.now(),
      };
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(payload));
    } catch { /* ignore storage error */ }
  }, [translation, bookId, chapter, language, setSearchParams]);

  // Smoothly scroll selected verse into view after chapter verses load
  useEffect(() => {
    if (!loading && selectedVerse && verses.length > 0 && activeTab === 'read') {
      const timer = setTimeout(() => {
        const el = document.querySelector('.bible-verse-row.is-selected');
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedVerse, verses.length, activeTab]);

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* ignore storage error */ }
  }, [prefs]);

  // Load translations list once
  useEffect(() => {
    fetch('/bible_api.php?action=translations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.translations)) {
          setTranslations(d.translations);
        }
      })
      .catch(() => {});
  }, []);

  // Load user study state from server when logged in
  useEffect(() => {
    if (!user) return;
    fetch('/bible_api.php?action=user_state', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && !d.guest && d.state) {
          setUserState((prev) => {
            const merged = {
              highlights: d.state.highlights?.length ? d.state.highlights : prev.highlights,
              notes: d.state.notes?.length ? d.state.notes : prev.notes,
              bookmarks: d.state.bookmarks?.length ? d.state.bookmarks : prev.bookmarks,
              plan_days: d.state.plan_days?.length ? d.state.plan_days : prev.plan_days,
              last_read: d.state.last_read || prev.last_read,
            };
            try {
              localStorage.setItem(USER_STATE_KEY, JSON.stringify(merged));
            } catch { /* ignore storage error */ }
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const persistUserState = useCallback(
    (updater) => {
      setUserState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          localStorage.setItem(USER_STATE_KEY, JSON.stringify(next));
        } catch { /* ignore storage error */ }
        if (user) {
          fetch('/bible_api.php?action=save_user_state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ state: next }),
          }).catch(() => {});
        }
        return next;
      });
    },
    [user],
  );

  const loadChapterData = useCallback(async (tr, bId, chNum) => {
    const cacheKey = `wp_bible_ch_${tr}_${bId}_${chNum}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Array.isArray(cached.verses) && cached.verses.length > 0) {
        return { ok: true, verses: cached.verses };
      }
    } catch { /* ignore storage error */ }

    const res = await fetch(`/bible_api.php?action=chapter&tr=${encodeURIComponent(tr)}&book=${bId}&chapter=${chNum}`);
    const data = await res.json().catch(() => null);
    if (data?.ok && Array.isArray(data.verses)) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ verses: data.verses, savedAt: Date.now() }));
      } catch { /* ignore storage error */ }
      return { ok: true, verses: data.verses };
    }
    return data || { ok: false, error: 'Failed to load chapter' };
  }, []);

  // Load main and optional parallel chapter
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setChapterError('');
      setUnavailableNotice(false);
      setFallbackNotice('');

      let activeTr = translation;
      let mainRes = await loadChapterData(activeTr, bookId, chapter);
      if (cancelled) return;

      // Smart automatic fallback for partial translations -> prefer full New Ararat first
      if (!mainRes.ok && mainRes.unavailable_in_translation) {
        const fallbackOrder = bookId >= 40
          ? ['nor_ararat', 'westernarmenian', 'synodal', 'akjv']
          : ['nor_ararat', 'synodal', 'akjv'];
        for (const fbTr of fallbackOrder) {
          if (fbTr === activeTr) continue;
          const fbRes = await loadChapterData(fbTr, bookId, chapter);
          if (cancelled) return;
          if (fbRes.ok) {
            mainRes = fbRes;
            activeTr = fbTr;
            const fbMeta = translations.find((t) => t.id === fbTr);
            setFallbackNotice(
              language === 'ru'
                ? `Книга недоступна в выбранном переводе — показан ${fbMeta?.name || fbTr}`
                : language === 'en'
                ? `Unavailable in selected translation — showing ${fbMeta?.name || fbTr}`
                : `Ընտրված թարգմանությունում այս գիրքը բացակայում է — ցուցադրվում է ${fbMeta?.name || fbTr}`,
            );
            break;
          }
        }
      }

      setEffectiveTranslation(activeTr);
      if (mainRes.ok) {
        setVerses(mainRes.verses);
      } else if (mainRes.unavailable_in_translation) {
        setVerses([]);
        setUnavailableNotice(true);
      } else {
        setVerses([]);
        setChapterError(mainRes.error || 'Չհաջողվեց բեռնել գլուխը');
      }

      const targetParallelTr =
        prefs.parallelTr && prefs.parallelTr !== activeTr
          ? prefs.parallelTr
          : (activeTr === 'synodal' ? 'akjv' : 'synodal');

      if (prefs.parallelEnabled && targetParallelTr !== activeTr) {
        const alignedCh = getAlignedParallelChapter(activeTr, targetParallelTr, bookId, chapter);
        const parRes = await loadChapterData(targetParallelTr, bookId, alignedCh);
        if (!cancelled) {
          setParallelVerses(parRes.ok ? parRes.verses : []);
        }
      } else {
        setParallelVerses([]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [translation, bookId, chapter, prefs.parallelEnabled, prefs.parallelTr, loadChapterData, translations, language]);

  const stopAudioRead = useCallback(() => {
    audioStopRef.current = true;
    setAudioPlaying(false);
    setSpeakingVerse(null);
    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.onended = null;
        ttsAudioRef.current.onerror = null;
        ttsAudioRef.current.pause();
        ttsAudioRef.current.removeAttribute('src');
      } catch { /* ignore */ }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => () => stopAudioRead(), [stopAudioRead]);

  const splitTtsChunks = (rawText, maxLen = 180) => {
    const clean = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    if (clean.length <= maxLen) return [clean];
    const parts = clean.split(/(?<=[։.,!?;:])\s+/);
    const chunks = [];
    let current = '';
    for (const p of parts) {
      if ((current + ' ' + p).trim().length <= maxLen) {
        current = (current + ' ' + p).trim();
      } else {
        if (current) chunks.push(current);
        if (p.length <= maxLen) {
          current = p;
        } else {
          for (let i = 0; i < p.length; i += maxLen) {
            chunks.push(p.slice(i, i + maxLen));
          }
          current = '';
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  const startAudioRead = useCallback((startFromVerse = null) => {
    if (typeof window === 'undefined' || verses.length === 0) return;
    if (audioPlaying && !startFromVerse) {
      stopAudioRead();
      return;
    }

    stopAudioRead();
    audioStopRef.current = false;
    setAudioPlaying(true);

    const activeLang = translations.find((tr) => tr.id === (effectiveTranslation || translation))?.lang || 'en';
    const voiceLang = activeLang === 'am' ? 'hy-AM' : activeLang === 'ru' ? 'ru-RU' : 'en-US';
    const startIdx = startFromVerse
      ? Math.max(0, verses.findIndex((v) => v.verse === startFromVerse))
      : 0;

    // Check if the browser/device actually has a native SpeechSynthesis voice for this language
    const hasNativeSpeech = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
    const availableVoices = hasNativeSpeech ? (window.speechSynthesis.getVoices() || []) : [];
    const targetPrefix = activeLang === 'am' ? 'hy' : activeLang;
    const matchingVoice = availableVoices.find((v) => String(v.lang || '').toLowerCase().startsWith(targetPrefix));

    // Armenian (hy-AM) rarely has a native OS voice on iOS/macOS/Android; use server TTS audio stream reliably
    const useServerTts = activeLang === 'am' ? !matchingVoice : !hasNativeSpeech;

    if (useServerTts) {
      if (!ttsAudioRef.current) {
        ttsAudioRef.current = new Audio();
      }
      const audioEl = ttsAudioRef.current;

      const playVerseViaServer = (idx) => {
        if (audioStopRef.current || idx >= verses.length) {
          stopAudioRead();
          return;
        }
        const vObj = verses[idx];
        setSpeakingVerse(vObj.verse);
        const chunks = splitTtsChunks(vObj.text, 180);
        if (chunks.length === 0) {
          playVerseViaServer(idx + 1);
          return;
        }

        let cIdx = 0;
        const playNextChunk = () => {
          if (audioStopRef.current) return;
          if (cIdx >= chunks.length) {
            playVerseViaServer(idx + 1);
            return;
          }
          const chunk = chunks[cIdx];
          cIdx += 1;
          audioEl.src = `/bible_api.php?action=tts&lang=${encodeURIComponent(activeLang)}&text=${encodeURIComponent(chunk)}`;
          audioEl.playbackRate = audioSpeedRef.current;
          audioEl.onended = () => {
            if (!audioStopRef.current) playNextChunk();
          };
          audioEl.onerror = () => {
            if (!audioStopRef.current) playNextChunk();
          };
          audioEl.play().catch(() => {
            stopAudioRead();
          });
        };

        playNextChunk();
      };

      playVerseViaServer(startIdx);
      return;
    }

    const speakIndex = (idx) => {
      if (audioStopRef.current || idx >= verses.length) {
        stopAudioRead();
        return;
      }
      const vObj = verses[idx];
      setSpeakingVerse(vObj.verse);
      const utter = new SpeechSynthesisUtterance(vObj.text);
      utter.lang = voiceLang;
      if (matchingVoice) utter.voice = matchingVoice;
      utter.rate = audioSpeedRef.current;
      utter.onend = () => {
        if (!audioStopRef.current) speakIndex(idx + 1);
      };
      utter.onerror = () => stopAudioRead();
      window.speechSynthesis.speak(utter);
    };

    speakIndex(startIdx);
  }, [verses, audioPlaying, stopAudioRead, translations, effectiveTranslation, translation]);

  const isCurrentBookOffline = useMemo(() => {
    void offlineReadyTick;
    const activeTr = effectiveTranslation || translation;
    try {
      for (let ch = 1; ch <= currentBook.chapters; ch += 1) {
        if (!localStorage.getItem(`wp_bible_ch_${activeTr}_${bookId}_${ch}`)) return false;
      }
      return currentBook.chapters > 0;
    } catch {
      return false;
    }
  }, [effectiveTranslation, translation, bookId, currentBook.chapters, offlineReadyTick]);

  const downloadBookOffline = async () => {
    const activeTr = effectiveTranslation || translation;
    const total = currentBook.chapters;
    setOfflineProgress({ done: 0, total });
    for (let ch = 1; ch <= total; ch += 1) {
      await loadChapterData(activeTr, bookId, ch);
      setOfflineProgress({ done: ch, total });
    }
    setOfflineProgress(null);
    setOfflineReadyTick((t) => t + 1);
  };

  const openCompareVerse = async (vNum) => {
    const targetV = vNum || selectedVerse;
    if (!targetV) return;
    setShowCompareModal(true);
    setLoadingCompare(true);
    try {
      const activeMain = effectiveTranslation || translation;
      const res = await fetch(`/bible_api.php?action=compare&main_tr=${encodeURIComponent(activeMain)}&book=${bookId}&chapter=${chapter}&verse=${targetV}`);
      const data = await res.json();
      setCompareItems(data?.ok && Array.isArray(data.comparisons) ? data.comparisons : []);
    } catch {
      setCompareItems([]);
    }
    setLoadingCompare(false);
  };

  const findMatchingSongs = () => {
    const text = selectedVerseObj?.text || '';
    const words = text
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    const q = words[0] || getBookName(bookId, language);
    navigate(`/songs?q=${encodeURIComponent(q)}`);
  };

  const removeSavedBookmark = (bmBook, bmChapter, e) => {
    e?.stopPropagation();
    persistUserState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.filter((b) => !(b.book === bmBook && b.chapter === bmChapter)),
    }));
  };

  const removeSavedHighlight = (hlBook, hlCh, hlVerse, e) => {
    e?.stopPropagation();
    persistUserState((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((h) => !(h.book === hlBook && h.chapter === hlCh && h.verse === hlVerse)),
    }));
  };

  const removeSavedNote = (nBook, nCh, nVerse, e) => {
    e?.stopPropagation();
    persistUserState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => !(n.book === nBook && n.chapter === nCh && n.verse === nVerse)),
    }));
  };

  const handleSelectVerse = useCallback((verseNum, event) => {
    const isMulti = multiSelectMode || event?.shiftKey || event?.ctrlKey || event?.metaKey;
    if (isMulti) {
      setSelectedVerses((prev) => {
        const exists = prev.includes(verseNum);
        const next = exists ? prev.filter((x) => x !== verseNum) : [...prev, verseNum].sort((a, b) => a - b);
        const primary = next[0] || null;
        setSelectedVerse(primary);
        if (!primary) setNoteDraft('');
        return next;
      });
      return;
    }

    setSelectedVerse((prev) => {
      const next = prev === verseNum ? null : verseNum;
      setSelectedVerses(next ? [next] : []);
      if (!next) {
        setNoteDraft('');
      } else {
        const existing = userState.notes.find(
          (n) => n.book === bookId && n.chapter === chapter && n.verse === next,
        );
        setNoteDraft(existing?.text || '');
      }
      return next;
    });
  }, [bookId, chapter, userState.notes, multiSelectMode]);

  const selectBookChapter = (bId, chNum = 1, options = {}) => {
    const b = BIBLE_BOOKS.find((item) => item.id === bId);
    const maxCh = b?.chapters || 1;
    stopAudioRead();
    if (!options.keepPlanSession) {
      setActivePlanSession(null);
    }
    setBookId(bId);
    setChapter(Math.max(1, Math.min(maxCh, chNum)));
    setSelectedVerse(null);
    setSelectedVerses([]);
    setReaderPage(0);
    setShowBookDrawer(false);
    setActiveTab('read');
    setReadingStreak(recordReadingStreak());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (showBookDrawer || activeTab === 'search' || showCompareModal) return;
      if (e.key === 'ArrowRight') {
        if (chapter < currentBook.chapters) selectBookChapter(bookId, chapter + 1);
      } else if (e.key === 'ArrowLeft') {
        if (chapter > 1) selectBookChapter(bookId, chapter - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stepChapter = (dir) => {
    if (dir > 0) {
      if (chapter < currentBook.chapters) {
        selectBookChapter(bookId, chapter + 1);
      } else if (bookId < 66) {
        selectBookChapter(bookId + 1, 1);
      }
    } else if (dir < 0) {
      if (chapter > 1) {
        selectBookChapter(bookId, chapter - 1);
      } else if (bookId > 1) {
        const prevBook = BIBLE_BOOKS.find((b) => b.id === bookId - 1);
        selectBookChapter(bookId - 1, prevBook?.chapters || 1);
      }
    }
  };

  const toggleHighlight = (colorId) => {
    const targets = selectedVerses.length > 0 ? selectedVerses : (selectedVerse ? [selectedVerse] : []);
    if (targets.length === 0) return;
    persistUserState((prev) => {
      const allSameColor = targets.every((vNum) => {
        const ex = prev.highlights.find((h) => h.book === bookId && h.chapter === chapter && h.verse === vNum);
        return ex && ex.color === colorId;
      });
      const remaining = prev.highlights.filter(
        (h) => !(h.book === bookId && h.chapter === chapter && targets.includes(h.verse)),
      );
      const nextHighlights = allSameColor
        ? remaining
        : [
            ...remaining,
            ...targets.map((vNum) => ({
              book: bookId,
              chapter,
              verse: vNum,
              color: colorId,
              text: verses.find((v) => v.verse === vNum)?.text || '',
              updatedAt: Date.now(),
            })),
          ];
      return { ...prev, highlights: nextHighlights };
    });
  };

  const handleSaveNote = () => {
    if (!selectedVerse) return;
    const trimmed = noteDraft.trim();
    persistUserState((prev) => {
      const filtered = prev.notes.filter(
        (n) => !(n.book === bookId && n.chapter === chapter && n.verse === selectedVerse),
      );
      if (!trimmed) return { ...prev, notes: filtered };
      return {
        ...prev,
        notes: [
          {
            book: bookId,
            chapter,
            verse: selectedVerse,
            text: trimmed,
            verseText: verses.find((v) => v.verse === selectedVerse)?.text || '',
            updatedAt: Date.now(),
          },
          ...filtered,
        ],
      };
    });
    setCopyFeedback('✓');
    setTimeout(() => setCopyFeedback(''), 1400);
  };

  const isChapterBookmarked = useMemo(
    () => userState.bookmarks.some((bm) => bm.book === bookId && bm.chapter === chapter),
    [userState.bookmarks, bookId, chapter],
  );

  const toggleChapterBookmark = () => {
    persistUserState((prev) => {
      const exists = prev.bookmarks.some((bm) => bm.book === bookId && bm.chapter === chapter);
      const next = exists
        ? prev.bookmarks.filter((bm) => !(bm.book === bookId && bm.chapter === chapter))
        : [{ book: bookId, chapter, addedAt: Date.now() }, ...prev.bookmarks];
      return { ...prev, bookmarks: next };
    });
  };

  const handleSelectPlan = useCallback((planId) => {
    setActivePlanId(planId);
    setShowAllPlanDays(false);
    try {
      localStorage.setItem(BIBLE_ACTIVE_PLAN_KEY, planId);
    } catch { /* ignore storage error */ }
  }, []);

  const activePlan = useMemo(
    () => BIBLE_READING_PLANS.find((p) => p.id === activePlanId) || BIBLE_READING_PLANS[0],
    [activePlanId],
  );

  const getPlanCompletedDays = useCallback(
    (planId) => {
      if (planId === 'essentials_14') return Array.isArray(userState.plan_days) ? userState.plan_days : [];
      const arr = extraPlanProgress[planId];
      return Array.isArray(arr) ? arr : [];
    },
    [userState.plan_days, extraPlanProgress],
  );

  const activePlanCompletedDays = useMemo(
    () => getPlanCompletedDays(activePlan.id),
    [activePlan.id, getPlanCompletedDays],
  );

  const activePlanPercent = useMemo(
    () => Math.round((activePlanCompletedDays.length / Math.max(1, activePlan.days.length)) * 100),
    [activePlanCompletedDays.length, activePlan.days.length],
  );

  const activePlanNextDay = useMemo(
    () => activePlan.days.find((d) => !activePlanCompletedDays.includes(d.day)) || null,
    [activePlan.days, activePlanCompletedDays],
  );

  const visiblePlanDays = useMemo(() => {
    if (showAllPlanDays || activePlan.days.length <= 7) return activePlan.days;
    const nextIdx = activePlanNextDay
      ? activePlan.days.findIndex((d) => d.day === activePlanNextDay.day)
      : 0;
    const start = Math.max(0, Math.min(nextIdx - 2, activePlan.days.length - 7));
    return activePlan.days.slice(start, start + 7);
  }, [activePlan.days, activePlanNextDay, showAllPlanDays]);

  const setPlanDayStatus = (planId, day, forceCompleted = null) => {
    const currentList = getPlanCompletedDays(planId);
    const exists = currentList.includes(day);
    const shouldComplete = forceCompleted === null ? !exists : Boolean(forceCompleted);
    if (shouldComplete) {
      setReadingStreak(recordReadingStreak());
      triggerHaptic('success');
    } else {
      triggerHaptic('light');
    }

    if (planId === 'essentials_14') {
      persistUserState((prev) => {
        const prevDays = Array.isArray(prev.plan_days) ? prev.plan_days : [];
        const has = prevDays.includes(day);
        const nextDays = shouldComplete
          ? (has ? prevDays : [...prevDays, day])
          : prevDays.filter((d) => d !== day);
        return { ...prev, plan_days: nextDays };
      });
      return;
    }

    setExtraPlanProgress((prev) => {
      const list = Array.isArray(prev[planId]) ? prev[planId] : [];
      const has = list.includes(day);
      const nextDays = shouldComplete
        ? (has ? list : [...list, day])
        : list.filter((d) => d !== day);
      const next = { ...prev, [planId]: nextDays };
      try {
        localStorage.setItem(BIBLE_PLANS_PROGRESS_KEY, JSON.stringify(next));
      } catch { /* ignore storage error */ }
      return next;
    });
  };

  const togglePlanDay = (day) => {
    setPlanDayStatus(activePlan.id, day, null);
  };

  const openPlanDay = (plan, item) => {
    if (!plan || !item) return;
    handleSelectPlan(plan.id);
    setActivePlanSession({
      planId: plan.id,
      day: item.day,
      book: item.book,
      chapter: item.chapter,
    });
    selectBookChapter(item.book, item.chapter, { keepPlanSession: true });
  };

  const matchedPlanContext = useMemo(() => {
    const buildContext = (plan, item) => {
      const completedDays = getPlanCompletedDays(plan.id);
      const isDone = completedDays.includes(item.day);
      const nextUnread =
        plan.days.find((d) => d.day > item.day && !completedDays.includes(d.day)) ||
        plan.days.find((d) => d.day !== item.day && !completedDays.includes(d.day)) ||
        null;
      const doneCount = completedDays.length;
      const totalDays = plan.days.length;
      const percent = Math.round((doneCount / Math.max(1, totalDays)) * 100);
      return { plan, item, completedDays, isDone, nextUnread, doneCount, totalDays, percent };
    };

    if (
      activePlanSession &&
      activePlanSession.book === bookId &&
      activePlanSession.chapter === chapter
    ) {
      const plan = BIBLE_READING_PLANS.find((p) => p.id === activePlanSession.planId);
      const item = plan?.days.find((d) => d.day === activePlanSession.day);
      if (plan && item) return buildContext(plan, item);
    }

    const fallbackItem = activePlan?.days.find((d) => d.book === bookId && d.chapter === chapter);
    if (activePlan && fallbackItem) {
      return buildContext(activePlan, fallbackItem);
    }

    return null;
  }, [activePlanSession, activePlan, bookId, chapter, getPlanCompletedDays]);

  const getSelectedFormattedPassage = () => {
    const nums = selectedVerses.length > 0 ? [...selectedVerses].sort((a, b) => a - b) : (selectedVerse ? [selectedVerse] : []);
    if (nums.length === 0) return null;
    const picked = nums
      .map((num) => verses.find((v) => v.verse === num))
      .filter(Boolean);
    if (picked.length === 0) return null;
    const body = picked.map((v) => (picked.length > 1 ? `${v.verse}. ${v.text}` : v.text)).join(' ');
    const ref = `${getBookName(bookId, language)} ${chapter}:${formatVerseSelectionRange(nums)}`;
    return {
      title: ref,
      text: `«${body}»\n— ${ref}`,
    };
  };

  const handleCopyVerse = async () => {
    const passage = getSelectedFormattedPassage();
    if (!passage) return;
    try {
      await navigator.clipboard.writeText(passage.text);
      setCopyFeedback('Պատճենված է');
      setTimeout(() => setCopyFeedback(''), 1500);
    } catch { /* ignore storage error */ }
  };

  const handleShareVerse = async () => {
    const passage = getSelectedFormattedPassage();
    if (!passage) return;
    await nativeShare({ title: passage.title, text: passage.text, url: window.location.href });
  };

  const runBibleSearch = async (
    e,
    overrideQuery = null,
    overrideTestament = null,
    overrideBook = null,
    nextPage = 1,
    append = false,
  ) => {
    e?.preventDefault();
    const q = String(overrideQuery !== null ? overrideQuery : searchQuery).trim();
    const scope = overrideTestament !== null ? overrideTestament : searchTestament;
    const bFilter = overrideBook !== null ? overrideBook : searchBookFilter;
    if (q.length < 2) return;
    if (append) {
      setLoadingMoreSearch(true);
    } else {
      setSearching(true);
      setSearchSubmitted(true);
      setSearchPage(1);
    }

    // Direct book/chapter/verse reference jump (only on first page)
    const refHits = [];
    if (!append) {
      const refMatch = q.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
      if (refMatch) {
        const bookPart = refMatch[1].trim().toLowerCase();
        const chNum = Number(refMatch[2]);
        const vNum = Number(refMatch[3] || 1);
        const matchedBook = BIBLE_BOOKS.find(
          (b) =>
            b.am.toLowerCase().includes(bookPart) ||
            b.ru.toLowerCase().includes(bookPart) ||
            b.en.toLowerCase().includes(bookPart),
        );
        if (matchedBook && chNum >= 1 && chNum <= matchedBook.chapters) {
          refHits.push({
            book: matchedBook.id,
            chapter: chNum,
            verse: vNum,
            text: `${getBookName(matchedBook.id, language)} ${chNum}${refMatch[3] ? `:${vNum}` : ''}`,
            isRefJump: true,
          });
        }
      }
    }

    try {
      const res = await fetch(
        `/bible_api.php?action=search&tr=${encodeURIComponent(effectiveTranslation || translation)}&testament=${encodeURIComponent(scope)}&book=${bFilter}&page=${nextPage}&limit=50&q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      const apiHits = data?.ok && Array.isArray(data.results) ? data.results : [];
      if (append) {
        setSearchResults((prev) => [...prev, ...apiHits]);
      } else {
        setSearchResults([...refHits, ...apiHits]);
      }
      setSearchTotal(typeof data?.total === 'number' ? data.total + (append ? 0 : refHits.length) : refHits.length + apiHits.length);
      setSearchHasMore(Boolean(data?.has_more));
      setSearchPage(nextPage);
      if (Array.isArray(data?.book_counts)) {
        setSearchBookCounts(data.book_counts);
      }
    } catch {
      if (!append) {
        setSearchResults(refHits);
        setSearchTotal(refHits.length);
        setSearchHasMore(false);
      }
    }
    setSearching(false);
    setLoadingMoreSearch(false);
  };

  const renderHighlightedSearchText = (text, query) => {
    const cleanQ = String(query || '').trim();
    if (!cleanQ || !text) return text;
    const words = cleanQ
      .split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter((w) => w.length >= 2);
    if (words.length === 0) return text;
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? (
        <mark key={idx} className="bible-search-mark">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const activeTranslationMeta = translations.find((tr) => tr.id === (effectiveTranslation || translation));
  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return BIBLE_BOOKS.filter((b) => {
      if (testamentFilter && b.test !== testamentFilter && !q) return false;
      if (!q) return true;
      return (
        b.am.toLowerCase().includes(q) ||
        b.ru.toLowerCase().includes(q) ||
        b.en.toLowerCase().includes(q)
      );
    });
  }, [testamentFilter, bookSearch]);

  const selectedVerseObj = verses.find((v) => v.verse === selectedVerse);
  const selectedHighlight = userState.highlights.find(
    (h) => h.book === bookId && h.chapter === chapter && h.verse === selectedVerse,
  );
  const selectedRangeLabel = formatVerseSelectionRange(
    selectedVerses.length > 0 ? selectedVerses : (selectedVerse ? [selectedVerse] : []),
  );
  const pageSize = prefs.parallelEnabled && parallelVerses.length > 0 ? 6 : 9;
  const totalPages = prefs.pagedMode && verses.length > 0 ? Math.max(1, Math.ceil(verses.length / pageSize)) : 1;
  const clampedPage = Math.min(readerPage, Math.max(0, totalPages - 1));
  const displayedVerses = prefs.pagedMode
    ? verses.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)
    : verses;

  const renderVerseWithMeasures = (text) => {
    const parts = String(text || '').split(MEASURES_SPLIT_REGEX);
    if (parts.length <= 1) return text;
    return parts.map((part, idx) => {
      const m = part ? matchMeasureToken(part) : null;
      if (!m) return part;
      return (
        <span
          key={idx}
          className="bible-measure-token"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setActiveMeasure(m);
          }}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div className={`bible-page ${isMobileViewport && selectedVerseObj && activeTab === 'read' ? 'has-verse-sheet' : ''}`}>
      {/* Top Bar Wrapper (keeps Aa popover floating cleanly without shifting layout) */}
      <div className="bible-topbar-wrap">
      <header className="bible-topbar">
        <div className="bible-topbar-left">
          <button
            type="button"
            className="bible-pill-btn bible-book-trigger"
            onClick={() => setShowBookDrawer(true)}
          >
            <span className="bible-dot" />
            <strong>
              {getBookName(bookId, language)} {chapter}
            </strong>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <select
            className="bible-tr-select"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            aria-label="Bible translation"
          >
            {translations.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.short} · {tr.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bible-topbar-center">
          <div className="bible-segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'read'}
              className={activeTab === 'read' ? 'active' : ''}
              onClick={() => setActiveTab('read')}
            >
              {ui.readTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'my'}
              className={activeTab === 'my' ? 'active' : ''}
              onClick={() => setActiveTab('my')}
            >
              {ui.myTab}
            </button>
          </div>
        </div>

        <div className="bible-topbar-right">
          {verses.length > 0 && (
            <button
              type="button"
              className={`bible-icon-pill ${audioPlaying ? 'active' : ''}`}
              onClick={() => startAudioRead()}
              title={language === 'ru' ? 'Слушать главу' : language === 'en' ? 'Listen to chapter' : 'Լսել գլուխը'}
              aria-label={language === 'ru' ? 'Слушать главу' : language === 'en' ? 'Listen to chapter' : 'Լսել գլուխը'}
            >
              {audioPlaying ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            className={`bible-icon-pill ${multiSelectMode ? 'active' : ''}`}
            onClick={() => setMultiSelectMode((m) => !m)}
            title={language === 'ru' ? 'Выбрать несколько стихов' : language === 'en' ? 'Multi-select verses' : 'Ընտրել մի քանի համար'}
            aria-label={language === 'ru' ? 'Выбрать несколько стихов' : language === 'en' ? 'Multi-select verses' : 'Ընտրել մի քանի համար'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>
          <button
            type="button"
            className={`bible-icon-pill ${isChapterBookmarked ? 'is-bookmarked' : ''}`}
            onClick={toggleChapterBookmark}
            title={isChapterBookmarked ? ui.bookmarked : ui.bookmarkChapter}
            aria-label={isChapterBookmarked ? ui.bookmarked : ui.bookmarkChapter}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill={isChapterBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            className={`bible-icon-pill ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab((prev) => (prev === 'search' ? 'read' : 'search'))}
            title={ui.search}
            aria-label={ui.search}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            type="button"
            className={`bible-icon-pill bible-aa-btn ${showAaModal ? 'active' : ''}`}
            onClick={() => setShowAaModal((s) => !s)}
            title="Aa"
          >
            Aa
          </button>
        </div>
      </header>

      {/* Typography & Parallel Settings Popover */}
      {showAaModal && (
        <div className="bible-aa-popover">
          <div className="bible-aa-row">
            <span>{ui.fontSize}</span>
            <div className="bible-aa-stepper">
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.max(14, p.fontSize - 1) }))}
              >
                A-
              </button>
              <strong>{prefs.fontSize}px</strong>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.min(26, p.fontSize + 1) }))}
              >
                A+
              </button>
            </div>
          </div>

          <div className="bible-aa-row">
            <span>{ui.fontType}</span>
            <div className="bible-aa-pills">
              <button
                type="button"
                className={prefs.fontFamily === 'serif' ? 'active' : ''}
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'serif' }))}
              >
                {ui.serif}
              </button>
              <button
                type="button"
                className={prefs.fontFamily === 'sans' ? 'active' : ''}
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'sans' }))}
              >
                {ui.sans}
              </button>
            </div>
          </div>

          <div className="bible-aa-row">
            <span>{language === 'ru' ? 'Вид текста' : language === 'en' ? 'Reading Style' : 'Ընթերցման ձև'}</span>
            <div className="bible-aa-pills">
              <button
                type="button"
                className={!prefs.flowMode ? 'active' : ''}
                onClick={() => setPrefs((p) => ({ ...p, flowMode: false }))}
              >
                {language === 'ru' ? 'Стихи' : language === 'en' ? 'Verses' : 'Համարներ'}
              </button>
              <button
                type="button"
                className={prefs.flowMode ? 'active' : ''}
                onClick={() => setPrefs((p) => ({ ...p, flowMode: true }))}
              >
                {language === 'ru' ? 'Абзац' : language === 'en' ? 'Paragraph' : 'Հոդված'}
              </button>
            </div>
          </div>

          <div className="bible-aa-row">
            <span>{language === 'ru' ? 'Фон чтения' : language === 'en' ? 'Reader Tint' : 'Թղթի երանգ'}</span>
            <div className="bible-aa-pills">
              {[
                { id: 'default', label: language === 'ru' ? 'Авто' : language === 'en' ? 'Auto' : 'Ավտո' },
                { id: 'sepia', label: 'Sepia' },
                { id: 'amoled', label: 'AMOLED' },
              ].map((tOpt) => (
                <button
                  key={tOpt.id}
                  type="button"
                  className={(prefs.paperTint || 'default') === tOpt.id ? 'active' : ''}
                  onClick={() => setPrefs((p) => ({ ...p, paperTint: tOpt.id }))}
                >
                  {tOpt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bible-aa-row bible-aa-parallel">
            <label className="bible-aa-toggle">
              <input
                type="checkbox"
                checked={Boolean(prefs.relaxedLine)}
                onChange={(e) => setPrefs((p) => ({ ...p, relaxedLine: e.target.checked }))}
              />
              <span>
                {language === 'ru' ? 'Свободный интервал' : language === 'en' ? 'Relaxed spacing' : 'Ազատ տողամիջոց'}
              </span>
            </label>
          </div>

          <div className="bible-aa-row bible-aa-parallel">
            <label className="bible-aa-toggle">
              <input
                type="checkbox"
                checked={Boolean(prefs.pagedMode)}
                onChange={(e) => {
                  setReaderPage(0);
                  setPrefs((p) => ({ ...p, pagedMode: e.target.checked }));
                }}
              />
              <span>
                {language === 'ru' ? 'Страницами (читалка)' : language === 'en' ? 'Book pages mode' : 'Գրքի էջերով (читалка)'}
              </span>
            </label>
          </div>

          <div className="bible-aa-row bible-aa-parallel">
            <label className="bible-aa-toggle">
              <input
                type="checkbox"
                checked={prefs.parallelEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const activeMain = effectiveTranslation || translation;
                  const nextParTr =
                    prefs.parallelTr && prefs.parallelTr !== activeMain
                      ? prefs.parallelTr
                      : (activeMain === 'synodal' ? 'akjv' : 'synodal');
                  setPrefs((p) => ({ ...p, parallelEnabled: checked, parallelTr: nextParTr }));
                }}
              />
              <span>{ui.parallel}</span>
            </label>
            {prefs.parallelEnabled && (
              <select
                value={prefs.parallelTr === (effectiveTranslation || translation) ? (effectiveTranslation === 'synodal' ? 'akjv' : 'synodal') : prefs.parallelTr}
                onChange={(e) => setPrefs((p) => ({ ...p, parallelTr: e.target.value }))}
                className="bible-tr-select compact"
              >
                {translations
                  .filter((tr) => tr.id !== (effectiveTranslation || translation))
                  .map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.short} · {tr.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>
      )}
      </div>

      {activeTab === 'search' ? (
        <section className="bible-search-page">
          <div className="bible-card bible-search-hero">
            <div className="bible-search-page-head">
              <div>
                <span className="bible-reader-kicker">
                  {activeTranslationMeta?.name || effectiveTranslation || translation}
                </span>
                <h2>
                  {language === 'ru'
                    ? 'Поиск по Библии'
                    : language === 'en'
                    ? 'Search Scripture'
                    : 'Աստվածաշնչյան որոնում'}
                </h2>
              </div>
              <button
                type="button"
                className="bible-pill-btn"
                onClick={() => setActiveTab('read')}
              >
                ← {ui.readTab}
              </button>
            </div>

            <form className="bible-search-form bible-search-page-form" onSubmit={(e) => { setSearchBookFilter(0); runBibleSearch(e, searchQuery, searchTestament, 0, 1, false); }}>
              <input
                type="search"
                placeholder={ui.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="bible-icon-pill"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchBookCounts([]);
                    setSearchBookFilter(0);
                    setSearchTotal(0);
                    setSearchHasMore(false);
                    setSearchSubmitted(false);
                  }}
                  aria-label="Մաքրել"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="bible-cta-amber" disabled={searching || searchQuery.trim().length < 2}>
                {searching ? '...' : ui.search}
              </button>
            </form>

            <div className="bible-search-filters">
              {[
                { id: 'all', label: language === 'ru' ? 'Вся Библия' : language === 'en' ? 'All Books' : 'Ամբողջ Աստվածաշունչ' },
                { id: 'old', label: ui.oldTest },
                { id: 'new', label: ui.newTest },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`bible-pill-btn ${searchTestament === opt.id ? 'is-active-filter' : ''}`}
                  onClick={() => {
                    setSearchTestament(opt.id);
                    setSearchBookFilter(0);
                    if (searchQuery.trim().length >= 2) {
                      runBibleSearch(null, searchQuery, opt.id, 0, 1, false);
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {searchBookCounts.length > 1 && (
              <div className="bible-search-book-chips">
                <button
                  type="button"
                  className={`bible-pill-btn ${searchBookFilter === 0 ? 'is-active-filter' : ''}`}
                  onClick={() => {
                    setSearchBookFilter(0);
                    runBibleSearch(null, searchQuery, searchTestament, 0, 1, false);
                  }}
                >
                  {language === 'ru' ? 'Все книги' : language === 'en' ? 'All Books' : 'Բոլոր գրքերը'} ({searchBookCounts.length})
                </button>
                {searchBookCounts.map((bc) => (
                  <button
                    key={bc.book}
                    type="button"
                    className={`bible-pill-btn ${searchBookFilter === bc.book ? 'is-active-filter' : ''}`}
                    onClick={() => {
                      setSearchBookFilter(bc.book);
                      runBibleSearch(null, searchQuery, searchTestament, bc.book, 1, false);
                    }}
                  >
                    {getBookName(bc.book, language)} <small>({bc.count})</small>
                  </button>
                ))}
              </div>
            )}

            {!searchSubmitted && (
              <div className="bible-search-suggestions">
                <span>{language === 'ru' ? 'Популярные запросы:' : language === 'en' ? 'Quick searches:' : 'Արագ որոնումներ՝'}</span>
                <div className="bible-chip-wrap">
                  {(language === 'ru'
                    ? ['любовь', 'Господь Пастырь мой', 'не бойся', 'мир вам', 'Псалом 22']
                    : language === 'en'
                    ? ['love', 'The Lord is my shepherd', 'fear not', 'grace', 'John 3:16']
                    : ['սեր', 'Տերն է իմ հովիվը', 'մի վախեցիր', 'խաղաղություն', 'Սաղմոս 23']
                  ).map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="bible-pill-btn"
                      onClick={() => {
                        setSearchQuery(chip);
                        runBibleSearch(null, chip, searchTestament);
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bible-search-page-results">
            {searching ? (
              <div className="bible-card bible-loading">
                <div className="bible-skeleton-line" />
                <div className="bible-skeleton-line short" />
                <div className="bible-skeleton-line" />
                <div className="bible-skeleton-line short" />
              </div>
            ) : searchSubmitted && searchResults.length === 0 ? (
              <div className="bible-card bible-unavailable-box">
                <h3>
                  {language === 'ru'
                    ? 'Ничего не найдено'
                    : language === 'en'
                    ? 'No matching verses found'
                    : 'Համընկնող խոսքեր չգտնվեցին'}
                </h3>
                <p className="bible-empty-copy">
                  {language === 'ru'
                    ? 'Попробуйте другое слово, более короткую фразу или проверьте выбранный Завет.'
                    : language === 'en'
                    ? 'Try another word, shorter phrase, or switch the Testament filter.'
                    : 'Փորձեք այլ բառ, ավելի կարճ բառակապակցություն կամ ընտրեք «Ամբողջ Աստվածաշունչ» զտիչը։'}
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="bible-search-meta-bar">
                  <span>
                    {language === 'ru'
                      ? `Найдено совпадений: ${searchTotal}`
                      : language === 'en'
                      ? `Found ${searchTotal} matching verses`
                      : `Գտնվել է ${searchTotal} արդյունք`}
                  </span>
                  {searchTotal > searchResults.length && (
                    <small>
                      {language === 'ru'
                        ? `Показаны первые ${searchResults.length}`
                        : language === 'en'
                        ? `Showing first ${searchResults.length}`
                        : `Ցուցադրվում է առաջին ${searchResults.length}-ը`}
                    </small>
                  )}
                </div>

                <div className="bible-search-results-grid">
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.book}_${r.chapter}_${r.verse}_${i}`}
                      type="button"
                      className="bible-search-hit bible-search-result-card"
                      onClick={() => {
                        selectBookChapter(r.book, r.chapter);
                        setSelectedVerse(r.verse);
                        setSelectedVerses(r.verse ? [r.verse] : []);
                        setActiveTab('read');
                      }}
                    >
                      <div className="bible-search-hit-head">
                        <strong>
                          {getBookName(r.book, language)} {r.chapter}:{r.verse}
                        </strong>
                        <span className="bible-search-open-tag">
                          {language === 'ru' ? 'Открыть →' : language === 'en' ? 'Read →' : 'Կարդալ →'}
                        </span>
                      </div>
                      <p className="bible-search-hit-text">
                        {r.isRefJump ? r.text : renderHighlightedSearchText(r.text, searchQuery)}
                      </p>
                    </button>
                  ))}
                </div>

                {searchHasMore && (
                  <div className="bible-search-load-more">
                    <button
                      type="button"
                      className="bible-cta-amber"
                      disabled={loadingMoreSearch}
                      onClick={() =>
                        runBibleSearch(null, searchQuery, searchTestament, searchBookFilter, searchPage + 1, true)
                      }
                    >
                      {loadingMoreSearch
                        ? '...'
                        : language === 'ru'
                        ? `Загрузить ещё (${searchResults.length} / ${searchTotal})`
                        : language === 'en'
                        ? `Load more (${searchResults.length} / ${searchTotal})`
                        : `Բեռնել ավելին (${searchResults.length} / ${searchTotal})`}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>
      ) : activeTab === 'my' ? (
        <div className="bible-my-wrap">
          {(() => {
            const totalSavedCount =
              userState.bookmarks.length + userState.notes.length + userState.highlights.length;
            const nextUnfinishedPlan = BIBLE_READING_PLANS.find(
              (p) => p.id !== activePlan.id && getPlanCompletedDays(p.id).length < p.days.length,
            );
            const showBookmarks = savedFilter === 'all' || savedFilter === 'bookmarks';
            const showNotes = savedFilter === 'all' || savedFilter === 'notes';
            const showHighlights = savedFilter === 'all' || savedFilter === 'highlights';
            const hasFilteredSaved =
              (showBookmarks && userState.bookmarks.length > 0) ||
              (showNotes && userState.notes.length > 0) ||
              (showHighlights && userState.highlights.length > 0);

            return (
              <>
                <div className="bible-stats-row">
                  <div className="bible-stat-chip bible-stat-streak">
                    <div className="bible-stat-top">
                      <span className="bible-stat-ico is-amber">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                      </span>
                      <strong>{readingStreak.count || 0}</strong>
                    </div>
                    <span>{language === 'ru' ? 'Дней подряд' : language === 'en' ? 'Day Streak' : 'Օր անընդմեջ'}</span>
                  </div>

                  <button
                    type="button"
                    className={`bible-stat-chip bible-stat-btn ${activePlanPercent === 100 ? 'is-complete' : ''}`}
                    onClick={() => setMySubTab('plans')}
                  >
                    <div className="bible-stat-top">
                      <span className={`bible-stat-ico ${activePlanPercent === 100 ? 'is-emerald' : ''}`}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </span>
                      <strong>{activePlanPercent}%</strong>
                    </div>
                    <span>
                      {language === 'ru'
                        ? `План (${activePlanCompletedDays.length}/${activePlan.days.length})`
                        : language === 'en'
                        ? `Plan (${activePlanCompletedDays.length}/${activePlan.days.length})`
                        : `Պլան (${activePlanCompletedDays.length}/${activePlan.days.length})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="bible-stat-chip bible-stat-btn"
                    onClick={() => {
                      setMySubTab('saved');
                      setSavedFilter('bookmarks');
                    }}
                  >
                    <div className="bible-stat-top">
                      <span className="bible-stat-ico">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </span>
                      <strong>{userState.bookmarks.length}</strong>
                    </div>
                    <span>{ui.bookmarks}</span>
                  </button>

                  <button
                    type="button"
                    className="bible-stat-chip bible-stat-btn"
                    onClick={() => {
                      setMySubTab('saved');
                      setSavedFilter('all');
                    }}
                  >
                    <div className="bible-stat-top">
                      <span className="bible-stat-ico">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </span>
                      <strong>{userState.notes.length + userState.highlights.length}</strong>
                    </div>
                    <span>{language === 'ru' ? 'Заметки' : language === 'en' ? 'Notes & HL' : 'Նշումներ'}</span>
                  </button>
                </div>

                {/* Mobile Sub-Tab Switcher so Bookmarks/Notes are 1 tap away */}
                <div className="bible-my-subtabs" role="tablist" aria-label={ui.myStudy}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mySubTab === 'plans'}
                    className={`bible-my-subtab ${mySubTab === 'plans' ? 'active' : ''}`}
                    onClick={() => setMySubTab('plans')}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>{language === 'ru' ? 'Планы чтения' : language === 'en' ? 'Reading Plans' : 'Պլաններ'}</span>
                    <em className="bible-subtab-count">
                      {activePlanCompletedDays.length}/{activePlan.days.length}
                    </em>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mySubTab === 'saved'}
                    className={`bible-my-subtab ${mySubTab === 'saved' ? 'active' : ''}`}
                    onClick={() => setMySubTab('saved')}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{language === 'ru' ? 'Сохранённое' : language === 'en' ? 'Saved' : 'Պահպանված'}</span>
                    <em className="bible-subtab-count">{totalSavedCount}</em>
                  </button>
                </div>

                <div className={`bible-my-grid is-subtab-${mySubTab}`}>
                  {/* Multi Reading Plans */}
                  <section className="bible-card bible-my-plans-card">
                    <div className="bible-plan-tabs" role="tablist" aria-label="Ընթերցման պլաններ">
                      {BIBLE_READING_PLANS.map((plan) => {
                        const pDone = getPlanCompletedDays(plan.id).length;
                        const pTotal = plan.days.length;
                        const pFinished = pDone >= pTotal && pTotal > 0;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            role="tab"
                            aria-selected={activePlan.id === plan.id}
                            className={`bible-plan-tab-pill ${activePlan.id === plan.id ? 'active' : ''} ${pFinished ? 'is-finished' : ''}`}
                            onClick={() => handleSelectPlan(plan.id)}
                          >
                            <span>{plan.title[language] || plan.title.am}</span>
                            <em className="bible-plan-tab-meta">
                              {pFinished ? '✓' : `${pDone}/${pTotal}`}
                            </em>
                          </button>
                        );
                      })}
                    </div>

                    <div className="bible-card-head bible-plan-header">
                      <div>
                        <h3>{activePlan.title[language] || activePlan.title.am}</h3>
                        <small className="bible-plan-subtitle">{activePlan.subtitle[language] || activePlan.subtitle.am}</small>
                      </div>
                      <span className={`bible-badge-pill ${activePlanPercent === 100 ? 'is-emerald' : ''}`}>
                        {activePlanCompletedDays.length} / {activePlan.days.length} · {activePlanPercent}%
                      </span>
                    </div>

                    <div className="bible-plan-progress">
                      <div
                        className={`bible-plan-fill ${activePlanPercent === 100 ? 'is-emerald' : ''}`}
                        style={{ width: `${activePlanPercent}%` }}
                      />
                    </div>

                    {activePlanNextDay ? (
                      <button
                        type="button"
                        className="bible-plan-hero-cta"
                        onClick={() => openPlanDay(activePlan, activePlanNextDay)}
                      >
                        <div className="bible-plan-hero-copy">
                          <span className="bible-plan-hero-kicker">
                            {language === 'ru'
                              ? `СЛЕДУЮЩЕЕ ЧТЕНИЕ · ДЕНЬ ${activePlanNextDay.day}`
                              : language === 'en'
                              ? `NEXT READING · DAY ${activePlanNextDay.day}`
                              : `ՀԱՋՈՐԴ ԸՆԹԵՐՑՈՒՄԸ · ՕՐ ${activePlanNextDay.day}`}
                          </span>
                          <strong>{activePlanNextDay.label[language] || activePlanNextDay.label.am}</strong>
                        </div>
                        <span className="bible-plan-hero-pill">
                          {language === 'ru' ? 'Читать' : language === 'en' ? 'Read' : 'Կարդալ'}
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      <div className="bible-plan-done-banner">
                        <div className="bible-plan-done-head">
                          <span className="bible-plan-done-ico">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <div>
                            <strong>
                              {language === 'ru'
                                ? 'План завершён!'
                                : language === 'en'
                                ? 'Plan Completed!'
                                : 'Պլանն ամբողջությամբ ավարտված է'}
                            </strong>
                            <small>
                              {language === 'ru'
                                ? `Прочитаны все ${activePlan.days.length} дней`
                                : language === 'en'
                                ? `All ${activePlan.days.length} days read`
                                : `Կարդացված են բոլոր ${activePlan.days.length} օրերը`}
                            </small>
                          </div>
                        </div>
                        {nextUnfinishedPlan && (
                          <button
                            type="button"
                            className="bible-pill-btn bible-plan-next-plan-btn"
                            onClick={() => handleSelectPlan(nextUnfinishedPlan.id)}
                          >
                            {language === 'ru'
                              ? `Начать: ${nextUnfinishedPlan.title.ru}`
                              : language === 'en'
                              ? `Start: ${nextUnfinishedPlan.title.en}`
                              : `Սկսել՝ ${nextUnfinishedPlan.title.am}`}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="bible-plan-list">
                      {visiblePlanDays.map((item) => {
                        const done = activePlanCompletedDays.includes(item.day);
                        const isNext = activePlanNextDay?.day === item.day;
                        return (
                          <div
                            key={`${activePlan.id}_${item.day}`}
                            className={`bible-plan-item ${done ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`}
                          >
                            <button
                              type="button"
                              className="bible-plan-check"
                              onClick={() => togglePlanDay(item.day)}
                              aria-label={
                                done
                                  ? `Mark day ${item.day} unread`
                                  : `Mark day ${item.day} read`
                              }
                              title={
                                done
                                  ? language === 'ru'
                                    ? 'Прочитано (нажмите, чтобы снять)'
                                    : language === 'en'
                                    ? 'Completed (click to undo)'
                                    : 'Կարդացված է (սեղմեք՝ չեղարկելու համար)'
                                  : language === 'ru'
                                  ? 'Отметить как прочитано'
                                  : language === 'en'
                                  ? 'Mark as read'
                                  : 'Նշել որպես կարդացված'
                              }
                            >
                              {done ? (
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                item.day
                              )}
                            </button>
                            <button
                              type="button"
                              className="bible-plan-link"
                              onClick={() => openPlanDay(activePlan, item)}
                            >
                              <span className="bible-plan-link-title">
                                {item.label[language] || item.label.am}
                              </span>
                              <span className="bible-plan-link-meta">
                                <span>
                                  {language === 'ru'
                                    ? `День ${item.day}`
                                    : language === 'en'
                                    ? `Day ${item.day}`
                                    : `Օր ${item.day}`}
                                </span>
                                {done ? (
                                  <em className="bible-plan-status is-done">
                                    {language === 'ru'
                                      ? 'Прочитано'
                                      : language === 'en'
                                      ? 'Read'
                                      : 'Կարդացված է'}
                                  </em>
                                ) : isNext ? (
                                  <em className="bible-plan-status is-next">
                                    {language === 'ru'
                                      ? 'Далее'
                                      : language === 'en'
                                      ? 'Up next'
                                      : 'Հաջորդը'}
                                  </em>
                                ) : null}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="bible-plan-open-arrow"
                              onClick={() => openPlanDay(activePlan, item)}
                              aria-label={`Open day ${item.day}`}
                            >
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {activePlan.days.length > 7 && (
                      <button
                        type="button"
                        className="bible-plan-expand-btn"
                        onClick={() => setShowAllPlanDays((v) => !v)}
                      >
                        <span>
                          {showAllPlanDays
                            ? language === 'ru'
                              ? 'Свернуть список'
                              : language === 'en'
                              ? 'Show fewer days'
                              : 'Ցույց տալ ավելի քիչ'
                            : language === 'ru'
                            ? `Показать все ${activePlan.days.length} дней`
                            : language === 'en'
                            ? `Show all ${activePlan.days.length} days`
                            : `Ցույց տալ բոլոր ${activePlan.days.length} օրերը`}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transform: showAllPlanDays ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </section>

                  {/* Notes & Highlights & Bookmarks */}
                  <section className="bible-card bible-my-saved-card">
                    <div className="bible-card-head">
                      <div>
                        <h3>{language === 'ru' ? 'Сохранённое' : language === 'en' ? 'Saved Study' : 'Պահպանված'}</h3>
                        <small className="bible-plan-subtitle">
                          {language === 'ru'
                            ? 'Закладки, заметки и выделения'
                            : language === 'en'
                            ? 'Bookmarks, notes & highlights'
                            : 'Էջանիշներ, նշումներ և ընդգծումներ'}
                        </small>
                      </div>
                      <span className="bible-badge-pill">{totalSavedCount}</span>
                    </div>

                    <div className="bible-saved-filters" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={savedFilter === 'all'}
                        className={`bible-plan-tab-pill ${savedFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setSavedFilter('all')}
                      >
                        <span>{language === 'ru' ? 'Все' : language === 'en' ? 'All' : 'Բոլորը'}</span>
                        <em className="bible-plan-tab-meta">{totalSavedCount}</em>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={savedFilter === 'bookmarks'}
                        className={`bible-plan-tab-pill ${savedFilter === 'bookmarks' ? 'active' : ''}`}
                        onClick={() => setSavedFilter('bookmarks')}
                      >
                        <span>{ui.bookmarks}</span>
                        <em className="bible-plan-tab-meta">{userState.bookmarks.length}</em>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={savedFilter === 'notes'}
                        className={`bible-plan-tab-pill ${savedFilter === 'notes' ? 'active' : ''}`}
                        onClick={() => setSavedFilter('notes')}
                      >
                        <span>{ui.notes}</span>
                        <em className="bible-plan-tab-meta">{userState.notes.length}</em>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={savedFilter === 'highlights'}
                        className={`bible-plan-tab-pill ${savedFilter === 'highlights' ? 'active' : ''}`}
                        onClick={() => setSavedFilter('highlights')}
                      >
                        <span>{ui.highlights}</span>
                        <em className="bible-plan-tab-meta">{userState.highlights.length}</em>
                      </button>
                    </div>

                    {!hasFilteredSaved ? (
                      <div className="bible-saved-empty">
                        <span className="bible-saved-empty-ico">
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                        <p className="bible-empty-copy">
                          {totalSavedCount === 0
                            ? ui.emptyMy
                            : language === 'ru'
                            ? 'В этой категории пока ничего нет.'
                            : language === 'en'
                            ? 'Nothing saved in this category yet.'
                            : 'Այս բաժնում դեռ պահպանված ոչինչ չկա։'}
                        </p>
                        <button
                          type="button"
                          className="bible-pill-btn"
                          onClick={() => setActiveTab('read')}
                        >
                          {language === 'ru' ? 'Перейти к чтению' : language === 'en' ? 'Open Reader' : 'Անցնել ընթերցման'}
                        </button>
                      </div>
                    ) : (
                      <div className="bible-saved-stack">
                        {showBookmarks && userState.bookmarks.length > 0 && (
                          <div className="bible-saved-group">
                            <h4 className="bible-saved-group-title">{ui.bookmarks}</h4>
                            <div className="bible-chip-wrap">
                              {userState.bookmarks.map((bm) => (
                                <div key={`${bm.book}_${bm.chapter}`} className="bible-bm-chip">
                                  <button
                                    type="button"
                                    className="bible-pill-btn bible-bm-open"
                                    onClick={() => selectBookChapter(bm.book, bm.chapter)}
                                  >
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <span>{getBookName(bm.book, language)} {bm.chapter}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="bible-bm-del"
                                    onClick={(e) => removeSavedBookmark(bm.book, bm.chapter, e)}
                                    aria-label="Remove bookmark"
                                  >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {showNotes && userState.notes.length > 0 && (
                          <div className="bible-saved-group">
                            {savedFilter === 'all' && <h4 className="bible-saved-group-title">{ui.notes}</h4>}
                            {userState.notes.map((n) => (
                              <div
                                key={`${n.book}_${n.chapter}_${n.verse}`}
                                className="bible-saved-item bible-saved-note-card"
                                onClick={() => {
                                  selectBookChapter(n.book, n.chapter);
                                  setSelectedVerse(n.verse);
                                }}
                              >
                                <div className="bible-saved-head">
                                  <span className="bible-saved-ref">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                    </svg>
                                    {getBookName(n.book, language)} {n.chapter}:{n.verse}
                                  </span>
                                  <button
                                    type="button"
                                    className="bible-saved-del"
                                    onClick={(e) => removeSavedNote(n.book, n.chapter, n.verse, e)}
                                    aria-label="Delete note"
                                  >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="bible-saved-note">{n.text}</p>
                                {n.verseText ? <small className="bible-saved-quote">«{n.verseText}»</small> : null}
                              </div>
                            ))}
                          </div>
                        )}

                        {showHighlights && userState.highlights.length > 0 && (
                          <div className="bible-saved-group">
                            {savedFilter === 'all' && <h4 className="bible-saved-group-title">{ui.highlights}</h4>}
                            {userState.highlights.map((h) => {
                              const col = HIGHLIGHT_COLORS.find((c) => c.id === h.color) || HIGHLIGHT_COLORS[0];
                              return (
                                <div
                                  key={`hl_${h.book}_${h.chapter}_${h.verse}`}
                                  className="bible-saved-item"
                                  style={{ borderLeft: `3px solid ${col.hex}` }}
                                  onClick={() => {
                                    selectBookChapter(h.book, h.chapter);
                                    setSelectedVerse(h.verse);
                                  }}
                                >
                                  <div className="bible-saved-head">
                                    <span className="bible-saved-ref">
                                      <span className="bible-saved-hl-dot" style={{ backgroundColor: col.hex }} />
                                      {getBookName(h.book, language)} {h.chapter}:{h.verse}
                                    </span>
                                    <button
                                      type="button"
                                      className="bible-saved-del"
                                      onClick={(e) => removeSavedHighlight(h.book, h.chapter, h.verse, e)}
                                      aria-label="Delete highlight"
                                    >
                                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  </div>
                                  <p className="bible-saved-quote">{h.text}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="bible-workspace">
          {/* Left Desktop Column: Books & Chapters */}
          <aside className="bible-left-rail">
            <div className="bible-card">
              <div className="bible-testament-tabs">
                <button
                  type="button"
                  className={testamentFilter === 'old' ? 'active' : ''}
                  onClick={() => setTestamentFilter('old')}
                >
                  {ui.oldTest}
                </button>
                <button
                  type="button"
                  className={testamentFilter === 'new' ? 'active' : ''}
                  onClick={() => setTestamentFilter('new')}
                >
                  {ui.newTest}
                </button>
              </div>
              <input
                type="search"
                className="bible-book-search"
                placeholder={ui.books + '...'}
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
              />
              <div className="bible-book-list">
                {BIBLE_BOOK_GENRES.filter((g) => bookSearch.trim() || g.test === testamentFilter).map((genre) => {
                  const groupBooks = filteredBooks.filter((b) => b.id >= genre.range[0] && b.id <= genre.range[1]);
                  if (groupBooks.length === 0) return null;
                  return (
                    <div key={genre.id} className="bible-genre-group" style={{ '--genre-color': genre.color }}>
                      <div className="bible-genre-label">
                        <span className="bible-genre-dot" />
                        <span>{genre[language] || genre.am}</span>
                      </div>
                      {groupBooks.map((b) => {
                        const available =
                          !activeTranslationMeta?.available_books ||
                          activeTranslationMeta.available_books.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={`bible-book-item ${b.id === bookId ? 'active' : ''} ${!available ? 'dimmed' : ''}`}
                            onClick={() => selectBookChapter(b.id, 1)}
                          >
                            <span>{b[language] || b.am}</span>
                            <small>{b.chapters}</small>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bible-card bible-chapter-card">
              <div className="bible-chapter-card-head">
                <div>
                  <span className="bible-chapter-genre" style={{ color: getBookGenre(bookId).color }}>
                    ● {getBookGenre(bookId)[language] || getBookGenre(bookId).am}
                  </span>
                  <strong>{getBookName(bookId, language)}</strong>
                </div>
                <small>{currentBook.chapters}</small>
              </div>
              <div className="bible-chapters-grid">
                {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className={`bible-ch-cell ${ch === chapter ? 'active' : ''}`}
                    onClick={() => selectBookChapter(bookId, ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Reading Surface */}
          <main className="bible-reader-col">
            <div className={`bible-reader-card tint-${prefs.paperTint || 'default'}`}>
              {matchedPlanContext && (
                <div className={`bible-plan-context-bar ${matchedPlanContext.isDone ? 'is-done' : ''}`}>
                  <div className="bible-plan-context-info">
                    <span className="bible-plan-context-dot" />
                    <span className="bible-plan-context-text">
                      <strong>{matchedPlanContext.plan.title[language] || matchedPlanContext.plan.title.am}</strong>
                      {' · '}
                      {language === 'ru'
                        ? `День ${matchedPlanContext.item.day} из ${matchedPlanContext.totalDays}`
                        : language === 'en'
                        ? `Day ${matchedPlanContext.item.day} of ${matchedPlanContext.totalDays}`
                        : `Օր ${matchedPlanContext.item.day} / ${matchedPlanContext.totalDays}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="bible-plan-context-back"
                    onClick={() => {
                      handleSelectPlan(matchedPlanContext.plan.id);
                      setMySubTab('plans');
                      setActiveTab('my');
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>{language === 'ru' ? 'План' : language === 'en' ? 'Plan' : 'Պլան'}</span>
                  </button>
                </div>
              )}

              <div className="bible-reader-head">
                <div>
                  <span className="bible-reader-kicker">{activeTranslationMeta?.name || effectiveTranslation || translation}</span>
                  <h1>
                    {getBookName(bookId, activeTranslationMeta?.lang || language)} {chapter}
                  </h1>
                </div>
                <div className="bible-chapter-nav">
                  <button
                    type="button"
                    className={`bible-pill-btn bible-offline-btn ${isCurrentBookOffline ? 'is-offline-ready' : ''}`}
                    onClick={downloadBookOffline}
                    disabled={Boolean(offlineProgress)}
                    title={language === 'ru' ? 'Скачать книгу для офлайн-чтения' : language === 'en' ? 'Download book offline' : 'Պահել գիրքը օֆլայն'}
                  >
                    {offlineProgress ? (
                      <span>{offlineProgress.done}/{offlineProgress.total}</span>
                    ) : isCurrentBookOffline ? (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{language === 'ru' ? 'Офлайн' : language === 'en' ? 'Offline' : 'Օֆլայն'}</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>{language === 'ru' ? 'Офлайн' : language === 'en' ? 'Offline' : 'Օֆլայն'}</span>
                      </>
                    )}
                  </button>
                  {audioPlaying && (
                    <button
                      type="button"
                      className="bible-pill-btn bible-speed-btn"
                      onClick={() => setAudioSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 0.85 : 1))}
                      title="Audio speed"
                    >
                      {audioSpeed}x
                    </button>
                  )}
                  <button
                    type="button"
                    className="bible-icon-pill bible-ch-step-btn"
                    onClick={() => stepChapter(-1)}
                    disabled={bookId === 1 && chapter === 1}
                    aria-label={ui.prevChapter}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="bible-icon-pill bible-ch-step-btn"
                    onClick={() => stepChapter(1)}
                    disabled={bookId === 66 && chapter === currentBook.chapters}
                    aria-label={ui.nextChapter}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {fallbackNotice && (
                <div className="bible-fallback-banner">
                  <span>{fallbackNotice}</span>
                  <div className="bible-fallback-btns">
                    {effectiveTranslation !== 'synodal' && (
                      <button type="button" onClick={() => setTranslation('synodal')}>RST</button>
                    )}
                    {effectiveTranslation !== 'akjv' && (
                      <button type="button" onClick={() => setTranslation('akjv')}>AKJV</button>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="bible-loading">
                  <div className="bible-skeleton-line" />
                  <div className="bible-skeleton-line short" />
                  <div className="bible-skeleton-line" />
                  <div className="bible-skeleton-line" />
                </div>
              ) : unavailableNotice ? (
                <div className="bible-unavailable-box">
                  <h3>{ui.unavailableTitle}</h3>
                  <p>{ui.unavailableDesc}</p>
                  <div className="bible-unavailable-actions">
                    <button type="button" className="bible-cta-amber" onClick={() => setTranslation('synodal')}>
                      {ui.switchSynodal}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={() => setTranslation('akjv')}>
                      {ui.switchKjv}
                    </button>
                  </div>
                </div>
              ) : chapterError ? (
                <div className="bible-unavailable-box">
                  <p>{chapterError}</p>
                </div>
              ) : (
                <>
                  <div
                    className={`bible-verses-body ${prefs.fontFamily === 'serif' ? 'is-serif' : 'is-sans'} ${
                      prefs.parallelEnabled && parallelVerses.length > 0 ? 'is-parallel' : ''
                    } ${prefs.flowMode && !(prefs.parallelEnabled && parallelVerses.length > 0) ? 'is-flow' : ''} ${
                      prefs.relaxedLine ? 'is-relaxed' : ''
                    }`}
                    style={{ fontSize: `${prefs.fontSize}px` }}
                    onTouchStart={(e) => {
                      if (e.touches && e.touches[0] && e.touches.length === 1) swipeStartXRef.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (!prefs.pagedMode || swipeStartXRef.current === null) return;
                      const touch = e.changedTouches?.[0] || e.touches?.[0];
                      if (!touch) {
                        swipeStartXRef.current = null;
                        return;
                      }
                      const dx = touch.clientX - swipeStartXRef.current;
                      swipeStartXRef.current = null;
                      if (dx < -48 && clampedPage < totalPages - 1) setReaderPage(clampedPage + 1);
                      else if (dx > 48 && clampedPage > 0) setReaderPage(clampedPage - 1);
                    }}
                  >
                    {displayedVerses.map((v) => {
                      const hl = userState.highlights.find(
                        (h) => h.book === bookId && h.chapter === chapter && h.verse === v.verse,
                      );
                      const hasNote = userState.notes.some(
                        (n) => n.book === bookId && n.chapter === chapter && n.verse === v.verse,
                      );
                      const hlObj = hl ? HIGHLIGHT_COLORS.find((c) => c.id === hl.color) : null;
                      const parVerse = prefs.parallelEnabled
                        ? parallelVerses.find((pv) => pv.verse === v.verse)
                        : null;
                      const isRowSelected = selectedVerses.includes(v.verse) || selectedVerse === v.verse;

                      return (
                        <div
                          key={v.verse}
                          className={`bible-verse-row ${isRowSelected ? 'is-selected' : ''} ${speakingVerse === v.verse ? 'is-speaking' : ''}`}
                          style={hlObj ? { backgroundColor: hlObj.bg } : undefined}
                          onClick={(e) => handleSelectVerse(v.verse, e)}
                        >
                          <p className="bible-verse-main">
                            <sup className="bible-verse-num">{v.verse}</sup>
                            <span>{renderVerseWithMeasures(v.text)}</span>
                            {hasNote && <span className="bible-note-dot" title="Note" />}
                          </p>
                          {parVerse && (
                            <p className="bible-verse-parallel">
                              <sup className="bible-verse-num">{parVerse.verse}</sup>
                              <span>{parVerse.text}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {prefs.pagedMode && totalPages > 1 && (
                    <div className="bible-paged-bar">
                      <button
                        type="button"
                        className="bible-pill-btn"
                        disabled={clampedPage === 0}
                        onClick={() => setReaderPage(Math.max(0, clampedPage - 1))}
                      >
                        ‹ {language === 'ru' ? 'Назад' : language === 'en' ? 'Prev' : 'Նախորդ'}
                      </button>
                      <span>
                        {language === 'ru' ? 'Стр.' : language === 'en' ? 'Page' : 'Էջ'} {clampedPage + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="bible-pill-btn"
                        disabled={clampedPage >= totalPages - 1}
                        onClick={() => setReaderPage(Math.min(totalPages - 1, clampedPage + 1))}
                      >
                        {language === 'ru' ? 'Дальше' : language === 'en' ? 'Next' : 'Հաջորդ'} ›
                      </button>
                    </div>
                  )}

                  {matchedPlanContext && (
                    <div className={`bible-plan-complete-card ${matchedPlanContext.isDone ? 'is-done' : ''}`}>
                      <div className="bible-plan-complete-top">
                        <div className="bible-plan-complete-meta">
                          <span className="bible-plan-complete-kicker">
                            {matchedPlanContext.plan.title[language] || matchedPlanContext.plan.title.am}
                            {' · '}
                            {language === 'ru'
                              ? `День ${matchedPlanContext.item.day}/${matchedPlanContext.totalDays}`
                              : language === 'en'
                              ? `Day ${matchedPlanContext.item.day}/${matchedPlanContext.totalDays}`
                              : `Օր ${matchedPlanContext.item.day}/${matchedPlanContext.totalDays}`}
                          </span>
                          <strong>
                            {matchedPlanContext.isDone
                              ? language === 'ru'
                                ? 'Отлично! Этот день прочитан'
                                : language === 'en'
                                ? 'Great! This day is completed'
                                : 'Գերազանց է։ Այս օրը կարդացված է'
                              : matchedPlanContext.item.label[language] || matchedPlanContext.item.label.am}
                          </strong>
                        </div>
                        {matchedPlanContext.isDone ? (
                          <button
                            type="button"
                            className="bible-plan-undo-btn"
                            onClick={() => setPlanDayStatus(matchedPlanContext.plan.id, matchedPlanContext.item.day, false)}
                          >
                            {language === 'ru' ? 'Отменить' : language === 'en' ? 'Undo' : 'Չեղարկել'}
                          </button>
                        ) : (
                          <span className="bible-badge-pill">{matchedPlanContext.percent}%</span>
                        )}
                      </div>

                      <div className="bible-plan-progress bible-plan-complete-progress">
                        <div
                          className={`bible-plan-fill ${matchedPlanContext.isDone || matchedPlanContext.percent === 100 ? 'is-emerald' : ''}`}
                          style={{ width: `${matchedPlanContext.percent}%` }}
                        />
                      </div>

                      {!matchedPlanContext.isDone ? (
                        <button
                          type="button"
                          className="bible-plan-mark-btn"
                          onClick={() => setPlanDayStatus(matchedPlanContext.plan.id, matchedPlanContext.item.day, true)}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <span>
                            {language === 'ru'
                              ? 'Отметить как прочитано'
                              : language === 'en'
                              ? 'Mark as Read'
                              : 'Կարդացված է'}
                          </span>
                        </button>
                      ) : (
                        <div className="bible-plan-complete-actions">
                          <span className="bible-plan-done-chip">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>
                              {language === 'ru'
                                ? `Прочитано · ${matchedPlanContext.doneCount}/${matchedPlanContext.totalDays}`
                                : language === 'en'
                                ? `Completed · ${matchedPlanContext.doneCount}/${matchedPlanContext.totalDays}`
                                : `Կարդացված է · ${matchedPlanContext.doneCount}/${matchedPlanContext.totalDays}`}
                            </span>
                          </span>
                          <div className="bible-plan-complete-btns">
                            <button
                              type="button"
                              className="bible-pill-btn"
                              onClick={() => {
                                handleSelectPlan(matchedPlanContext.plan.id);
                                setMySubTab('plans');
                                setActiveTab('my');
                              }}
                            >
                              {language === 'ru' ? 'К плану' : language === 'en' ? 'View Plan' : 'Դեպի պլան'}
                            </button>
                            {matchedPlanContext.nextUnread && (
                              <button
                                type="button"
                                className="bible-cta-amber"
                                onClick={() => openPlanDay(matchedPlanContext.plan, matchedPlanContext.nextUnread)}
                              >
                                <span>
                                  {language === 'ru'
                                    ? `День ${matchedPlanContext.nextUnread.day}`
                                    : language === 'en'
                                    ? `Day ${matchedPlanContext.nextUnread.day}`
                                    : `Հաջորդը՝ Օր ${matchedPlanContext.nextUnread.day}`}
                                </span>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="bible-reader-footer">
                <button
                  type="button"
                  className="bible-pill-btn"
                  onClick={() => stepChapter(-1)}
                  disabled={bookId === 1 && chapter === 1}
                >
                  ← {ui.prevChapter}
                </button>
                <button
                  type="button"
                  className="bible-cta-amber"
                  onClick={() => stepChapter(1)}
                  disabled={bookId === 66 && chapter === currentBook.chapters}
                >
                  {ui.nextChapter} →
                </button>
              </div>
            </div>
          </main>

          {/* Right Desktop Inspector */}
          <aside className="bible-right-rail">
            <div className="bible-card">
              <span className="bible-rail-label">{ui.verseActions}</span>
              {selectedVerseObj ? (
                <div className="bible-inspector-body">
                  <h4>
                    {getBookName(bookId, language)} {chapter}:{selectedRangeLabel || selectedVerse}
                  </h4>
                  <p className="bible-inspector-quote">
                    «{selectedVerses.length > 1
                      ? selectedVerses.map((num) => verses.find((v) => v.verse === num)?.text).filter(Boolean).join(' ')
                      : selectedVerseObj.text}»
                  </p>

                  <div className="bible-hl-swatches">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`bible-hl-dot ${selectedHighlight?.color === c.id ? 'active' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => toggleHighlight(c.id)}
                        aria-label={`Highlight ${c.id}`}
                      />
                    ))}
                  </div>

                  <div className="bible-inspector-actions">
                    <button type="button" className="bible-pill-btn" onClick={handleCopyVerse}>
                      {copyFeedback || ui.copy}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={handleShareVerse}>
                      {ui.share}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={() => setShowShareCardModal(true)}>
                      {language === 'ru' ? 'Карточка' : language === 'en' ? 'Image Card' : 'Նկար-քարտ'}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={() => openCompareVerse(selectedVerse)}>
                      {language === 'ru' ? 'Сравнить' : language === 'en' ? 'Compare' : 'Համեմատել'}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={findMatchingSongs}>
                      {language === 'ru' ? 'Песни' : language === 'en' ? 'Songs' : 'Երգեր'}
                    </button>
                  </div>

                  <textarea
                    className="bible-note-input"
                    rows={3}
                    placeholder={ui.notePlaceholder}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />
                  <button type="button" className="bible-cta-amber w-full" onClick={handleSaveNote}>
                    {ui.saveNote}
                  </button>
                </div>
              ) : (
                <p className="bible-empty-copy">{ui.selectHint}</p>
              )}
            </div>

            {!user && (
              <div className="bible-card bible-login-hint">
                <p>Մուտք գործեք՝ նշումներն ու ընդգծումները սարքերի միջև սինքրոնացնելու համար։</p>
                <button type="button" className="bible-cta-amber w-full" onClick={() => navigate('/login?next=/bible')}>
                  Մուտք
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Mobile Selected Verse Bottom Action Sheet (Portaled, strict mobile <= 900px) */}
      {isMobileViewport && selectedVerseObj && activeTab === 'read' && createPortal(
        <div className="bible-mobile-sheet" role="dialog" aria-label={ui.verseActions}>
          <div className="bible-mobile-sheet-handle" />
          <div className="bible-mobile-sheet-head">
            <div className="bible-sheet-ref-wrap">
              <span className="bible-sheet-ref-dot" />
              <strong>
                {getBookName(bookId, language)} {chapter}:{selectedRangeLabel || selectedVerse}
              </strong>
            </div>
            <div className="bible-hl-swatches">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`bible-hl-dot ${selectedHighlight?.color === c.id ? 'active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => toggleHighlight(c.id)}
                  aria-label={c.id}
                />
              ))}
            </div>
            <button
              type="button"
              className="bible-sheet-close"
              onClick={() => {
                setSelectedVerse(null);
                setSelectedVerses([]);
              }}
              aria-label="Փակել"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="bible-mobile-sheet-actions">
            <button type="button" className="bible-sheet-action-btn" onClick={handleCopyVerse}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copyFeedback || ui.copy}</span>
            </button>
            <button type="button" className="bible-sheet-action-btn" onClick={handleShareVerse}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>{ui.share}</span>
            </button>
            <button type="button" className="bible-sheet-action-btn" onClick={() => setShowShareCardModal(true)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{language === 'ru' ? 'Карточка' : language === 'en' ? 'Card' : 'Նկար'}</span>
            </button>
            <button type="button" className="bible-sheet-action-btn" onClick={() => openCompareVerse(selectedVerse)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <span>{language === 'ru' ? 'Переводы' : language === 'en' ? 'Compare' : 'Համեմատել'}</span>
            </button>
            <button type="button" className="bible-sheet-action-btn" onClick={() => startAudioRead(selectedVerse)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>{language === 'ru' ? 'Слушать' : language === 'en' ? 'Listen' : 'Լսել'}</span>
            </button>
          </div>
          <div className="bible-mobile-note-row">
            <input
              type="text"
              placeholder={ui.notePlaceholder}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <button type="button" className="bible-cta-amber" onClick={handleSaveNote}>
              {language === 'ru' ? 'Сохранить' : language === 'en' ? 'Save' : 'Պահպանել'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Book & Chapter Picker Modal (Portaled) */}
      {showBookDrawer && createPortal(
        <div className="bible-modal-backdrop" onClick={() => setShowBookDrawer(false)}>
          <div className="bible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bible-modal-head">
              <h3>{ui.books}</h3>
              <button type="button" className="bible-sheet-close" onClick={() => setShowBookDrawer(false)}>
                ✕
              </button>
            </div>
            <div className="bible-testament-tabs">
              <button
                type="button"
                className={testamentFilter === 'old' ? 'active' : ''}
                onClick={() => setTestamentFilter('old')}
              >
                {ui.oldTest}
              </button>
              <button
                type="button"
                className={testamentFilter === 'new' ? 'active' : ''}
                onClick={() => setTestamentFilter('new')}
              >
                {ui.newTest}
              </button>
            </div>
            <input
              type="search"
              className="bible-book-search"
              placeholder={ui.books + '...'}
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
            />
            <div className="bible-modal-columns">
              <div className="bible-book-list">
                {BIBLE_BOOK_GENRES.filter((g) => bookSearch.trim() || g.test === testamentFilter).map((genre) => {
                  const groupBooks = filteredBooks.filter((b) => b.id >= genre.range[0] && b.id <= genre.range[1]);
                  if (groupBooks.length === 0) return null;
                  return (
                    <div key={genre.id} className="bible-genre-group" style={{ '--genre-color': genre.color }}>
                      <div className="bible-genre-label">
                        <span className="bible-genre-dot" />
                        <span>{genre[language] || genre.am}</span>
                      </div>
                      {groupBooks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={`bible-book-item ${b.id === bookId ? 'active' : ''}`}
                          onClick={() => {
                            setBookId(b.id);
                            setChapter(1);
                          }}
                        >
                          <span>{b[language] || b.am}</span>
                          <small>{b.chapters}</small>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="bible-chapters-grid">
                {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className={`bible-ch-cell ${ch === chapter ? 'active' : ''}`}
                    onClick={() => selectBookChapter(bookId, ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Clickable Biblical Measure Tooltip Popover */}
      {activeMeasure && createPortal(
        <div className="bible-measure-popover" onClick={() => setActiveMeasure(null)}>
          <div>
            <strong>{activeMeasure.label[language] || activeMeasure.label.am}</strong>
            <span>{activeMeasure.info[language] || activeMeasure.info.am}</span>
          </div>
          <button type="button" className="bible-sheet-close" onClick={() => setActiveMeasure(null)}>
            ✕
          </button>
        </div>,
        document.body
      )}

      {/* Verse Share Card Image Generator Modal */}
      {showShareCardModal && selectedVerseObj && (
        <Suspense fallback={null}>
          <VerseShareCardModal
            isOpen={showShareCardModal}
            onClose={() => setShowShareCardModal(false)}
            verseText={
              selectedVerses.length > 1
                ? selectedVerses
                    .map((num) => verses.find((v) => v.verse === num)?.text)
                    .filter(Boolean)
                    .join(' ')
                : selectedVerseObj.text
            }
            reference={`${getBookName(bookId, language)} ${chapter}:${selectedRangeLabel || selectedVerse}`}
            translationName={activeTranslationMeta?.name || ''}
            language={language}
          />
        </Suspense>
      )}

      {/* Compare Translations Modal (Portaled) */}
      {showCompareModal && createPortal(
        <div className="bible-modal-backdrop" onClick={() => setShowCompareModal(false)}>
          <div className="bible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bible-modal-head">
              <h3>
                {getBookName(bookId, language)} {chapter}:{selectedVerse || 1} —{' '}
                {language === 'ru' ? 'Сравнение переводов' : language === 'en' ? 'Compare Translations' : 'Թարգմանությունների համեմատություն'}
              </h3>
              <button type="button" className="bible-sheet-close" onClick={() => setShowCompareModal(false)}>
                ✕
              </button>
            </div>
            {loadingCompare ? (
              <div className="bible-loading">
                <div className="bible-skeleton-line" />
                <div className="bible-skeleton-line short" />
                <div className="bible-skeleton-line" />
              </div>
            ) : compareItems.length === 0 ? (
              <p className="bible-empty-copy">Չհաջողվեց բեռնել համեմատությունը</p>
            ) : (
              <div className="bible-compare-list">
                {compareItems.map((item) => (
                  <div key={item.id} className="bible-compare-card">
                    <div className="bible-compare-head">
                      <span className="bible-badge-pill">{item.short}</span>
                      <strong>{item.name}</strong>
                    </div>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* End of Modals */}
    </div>
  );
}
