import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  BIBLE_BOOKS,
  BIBLE_READING_PLAN,
  BIBLICAL_MEASURES,
  DEFAULT_BIBLE_TRANSLATIONS,
  getAlignedParallelChapter,
  getBookName,
  matchMeasureToken,
} from '../utils/bibleData';
import { nativeShare } from '../utils/nativeFeatures';
import './Bible.css';

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

  const [activeTab, setActiveTab] = useState('read'); // 'read' | 'my'
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
  const [isTopbarCompact, setIsTopbarCompact] = useState(false);
  const [activeMeasure, setActiveMeasure] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [speakingVerse, setSpeakingVerse] = useState(null);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [offlineProgress, setOfflineProgress] = useState(null); // { done, total }
  const [offlineReadyTick, setOfflineReadyTick] = useState(0);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareItems, setCompareItems] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const lastScrollYRef = useRef(0);
  const swipeStartXRef = useRef(null);
  const audioStopRef = useRef(true);

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
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
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
      searchPlaceholder: 'Որոնել ընթերցված գլուխներում...',
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
    setSearchParams({ tr: translation, book: String(bookId), chapter: String(chapter) }, { replace: true });
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => () => stopAudioRead(), [stopAudioRead]);

  const startAudioRead = useCallback((startFromVerse = null) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || verses.length === 0) return;
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

    const speakIndex = (idx) => {
      if (audioStopRef.current || idx >= verses.length) {
        stopAudioRead();
        return;
      }
      const vObj = verses[idx];
      setSpeakingVerse(vObj.verse);
      const utter = new SpeechSynthesisUtterance(vObj.text);
      utter.lang = voiceLang;
      utter.rate = audioSpeed;
      utter.onend = () => {
        if (!audioStopRef.current) speakIndex(idx + 1);
      };
      utter.onerror = () => stopAudioRead();
      window.speechSynthesis.speak(utter);
    };

    speakIndex(startIdx);
  }, [verses, audioPlaying, stopAudioRead, translations, effectiveTranslation, translation, audioSpeed]);

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

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const goingDown = y > lastScrollYRef.current;
      if (y > 120 && goingDown) {
        setIsTopbarCompact(true);
      } else if (!goingDown || y < 60) {
        setIsTopbarCompact(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const selectBookChapter = (bId, chNum = 1) => {
    const b = BIBLE_BOOKS.find((item) => item.id === bId);
    const maxCh = b?.chapters || 1;
    stopAudioRead();
    setBookId(bId);
    setChapter(Math.max(1, Math.min(maxCh, chNum)));
    setSelectedVerse(null);
    setSelectedVerses([]);
    setReaderPage(0);
    setShowBookDrawer(false);
    setActiveTab('read');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (showBookDrawer || showSearchModal || showCompareModal) return;
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

  const togglePlanDay = (day) => {
    persistUserState((prev) => {
      const exists = prev.plan_days.includes(day);
      return {
        ...prev,
        plan_days: exists ? prev.plan_days.filter((d) => d !== day) : [...prev.plan_days, day],
      };
    });
  };

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

  const runBibleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearching(true);

    // Direct book/chapter/verse reference jump
    const refHits = [];
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
        });
      }
    }

    try {
      const res = await fetch(
        `/bible_api.php?action=search&tr=${encodeURIComponent(effectiveTranslation || translation)}&q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      const apiHits = data?.ok && Array.isArray(data.results) ? data.results : [];
      setSearchResults([...refHits, ...apiHits]);
    } catch {
      setSearchResults(refHits);
    }
    setSearching(false);
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
    <div className="bible-page animate-fade-in">
      {/* Top Bar Wrapper (keeps Aa popover floating cleanly without shifting layout) */}
      <div className={`bible-topbar-wrap ${isTopbarCompact ? 'is-compact' : ''}`}>
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
          {typeof window !== 'undefined' && 'speechSynthesis' in window && verses.length > 0 && (
            <button
              type="button"
              className={`bible-icon-pill ${audioPlaying ? 'active' : ''}`}
              onClick={() => startAudioRead()}
              title={language === 'ru' ? 'Слушать главу' : language === 'en' ? 'Listen to chapter' : 'Լսել գլուխը'}
            >
              {audioPlaying ? '❚❚' : '🔊'}
            </button>
          )}
          <button
            type="button"
            className={`bible-icon-pill ${multiSelectMode ? 'active' : ''}`}
            onClick={() => setMultiSelectMode((m) => !m)}
            title={language === 'ru' ? 'Выбрать несколько стихов' : language === 'en' ? 'Multi-select verses' : 'Ընտրել մի քանի համար'}
          >
            ☑
          </button>
          <button
            type="button"
            className={`bible-icon-pill ${isChapterBookmarked ? 'is-bookmarked' : ''}`}
            onClick={toggleChapterBookmark}
            title={isChapterBookmarked ? ui.bookmarked : ui.bookmarkChapter}
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill={isChapterBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            className="bible-icon-pill"
            onClick={() => setShowSearchModal(true)}
            title={ui.search}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
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

      {activeTab === 'my' ? (
        <div className="bible-my-wrap">
          <div className="bible-stats-row">
            <div className="bible-stat-chip">
              <strong>{userState.plan_days.length} / {BIBLE_READING_PLAN.length}</strong>
              <span>{language === 'ru' ? 'Дней плана' : language === 'en' ? 'Plan Days' : 'Պլանի օրեր'}</span>
            </div>
            <div className="bible-stat-chip">
              <strong>{userState.bookmarks.length}</strong>
              <span>{ui.bookmarks}</span>
            </div>
            <div className="bible-stat-chip">
              <strong>{userState.notes.length}</strong>
              <span>{ui.notes}</span>
            </div>
            <div className="bible-stat-chip">
              <strong>{userState.highlights.length}</strong>
              <span>{ui.highlights}</span>
            </div>
          </div>

        <div className="bible-my-grid">
          {/* Reading Plan */}
          <section className="bible-card">
            <div className="bible-card-head">
              <h3>{ui.readingPlan}</h3>
              <span className="bible-badge-pill">
                {userState.plan_days.length} / {BIBLE_READING_PLAN.length}
              </span>
            </div>
            <div className="bible-plan-progress">
              <div
                className="bible-plan-fill"
                style={{ width: `${Math.round((userState.plan_days.length / BIBLE_READING_PLAN.length) * 100)}%` }}
              />
            </div>
            <div className="bible-plan-list">
              {BIBLE_READING_PLAN.map((item) => {
                const done = userState.plan_days.includes(item.day);
                return (
                  <div key={item.day} className={`bible-plan-item ${done ? 'is-done' : ''}`}>
                    <button
                      type="button"
                      className="bible-plan-check"
                      onClick={() => togglePlanDay(item.day)}
                      aria-label={`Day ${item.day}`}
                    >
                      {done ? '✓' : item.day}
                    </button>
                    <button
                      type="button"
                      className="bible-plan-link"
                      onClick={() => selectBookChapter(item.book, item.chapter)}
                    >
                      {item.label[language] || item.label.am}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes & Highlights & Bookmarks */}
          <section className="bible-card">
            <div className="bible-card-head">
              <h3>
                {ui.notes} ({userState.notes.length}) & {ui.highlights} ({userState.highlights.length})
              </h3>
            </div>

            {userState.notes.length === 0 && userState.highlights.length === 0 && userState.bookmarks.length === 0 ? (
              <p className="bible-empty-copy">{ui.emptyMy}</p>
            ) : (
              <div className="bible-saved-stack">
                {userState.bookmarks.length > 0 && (
                  <div className="bible-saved-group">
                    <h4>{ui.bookmarks}</h4>
                    <div className="bible-chip-wrap">
                      {userState.bookmarks.map((bm) => (
                        <div key={`${bm.book}_${bm.chapter}`} className="bible-bm-chip">
                          <button
                            type="button"
                            className="bible-pill-btn"
                            onClick={() => selectBookChapter(bm.book, bm.chapter)}
                          >
                            {getBookName(bm.book, language)} {bm.chapter}
                          </button>
                          <button
                            type="button"
                            className="bible-bm-del"
                            onClick={(e) => removeSavedBookmark(bm.book, bm.chapter, e)}
                            aria-label="Remove bookmark"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userState.notes.map((n) => (
                  <div
                    key={`${n.book}_${n.chapter}_${n.verse}`}
                    className="bible-saved-item"
                    onClick={() => {
                      selectBookChapter(n.book, n.chapter);
                      setSelectedVerse(n.verse);
                    }}
                  >
                    <div className="bible-saved-head">
                      <span className="bible-saved-ref">
                        {getBookName(n.book, language)} {n.chapter}:{n.verse}
                      </span>
                      <button
                        type="button"
                        className="bible-saved-del"
                        onClick={(e) => removeSavedNote(n.book, n.chapter, n.verse, e)}
                        aria-label="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="bible-saved-note">{n.text}</p>
                    {n.verseText ? <small className="bible-saved-quote">«{n.verseText}»</small> : null}
                  </div>
                ))}

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
                          {getBookName(h.book, language)} {h.chapter}:{h.verse}
                        </span>
                        <button
                          type="button"
                          className="bible-saved-del"
                          onClick={(e) => removeSavedHighlight(h.book, h.chapter, h.verse, e)}
                          aria-label="Delete highlight"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="bible-saved-quote">{h.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
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
                {filteredBooks.map((b) => {
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
            </div>

            <div className="bible-card bible-chapter-card">
              <div className="bible-chapter-card-head">
                <strong>{getBookName(bookId, language)}</strong>
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
                    className={`bible-pill-btn ${isCurrentBookOffline ? 'is-offline-ready' : ''}`}
                    onClick={downloadBookOffline}
                    disabled={Boolean(offlineProgress)}
                    title={language === 'ru' ? 'Скачать книгу для офлайн-чтения' : language === 'en' ? 'Download book offline' : 'Պահել գիրքը օֆլայն'}
                  >
                    {offlineProgress
                      ? `⏳ ${offlineProgress.done}/${offlineProgress.total}`
                      : isCurrentBookOffline
                      ? `✓ ${language === 'ru' ? 'Офлайн' : language === 'en' ? 'Offline' : 'Օֆլայն'}`
                      : `📥 ${language === 'ru' ? 'Офлайн' : language === 'en' ? 'Offline' : 'Օֆլայն'}`}
                  </button>
                  {audioPlaying && (
                    <button
                      type="button"
                      className="bible-pill-btn"
                      onClick={() => setAudioSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 0.85 : 1))}
                      title="Audio speed"
                    >
                      {audioSpeed}x
                    </button>
                  )}
                  <button
                    type="button"
                    className="bible-pill-btn"
                    onClick={() => stepChapter(-1)}
                    disabled={bookId === 1 && chapter === 1}
                    aria-label={ui.prevChapter}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="bible-pill-btn"
                    onClick={() => stepChapter(1)}
                    disabled={bookId === 66 && chapter === currentBook.chapters}
                    aria-label={ui.nextChapter}
                  >
                    ›
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
                      if (e.touches.length === 1) swipeStartXRef.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (!prefs.pagedMode || swipeStartXRef.current === null) return;
                      const dx = e.changedTouches[0].clientX - swipeStartXRef.current;
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
                    <button type="button" className="bible-pill-btn" onClick={() => openCompareVerse(selectedVerse)}>
                      🔄 {language === 'ru' ? 'Сравнить' : language === 'en' ? 'Compare' : 'Համեմատել'}
                    </button>
                    <button type="button" className="bible-pill-btn" onClick={findMatchingSongs}>
                      🎵 {language === 'ru' ? 'Песни' : language === 'en' ? 'Songs' : 'Երգեր'}
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
        <div className="bible-mobile-sheet">
          <div className="bible-mobile-sheet-head">
            <strong>
              {getBookName(bookId, language)} {chapter}:{selectedRangeLabel || selectedVerse}
            </strong>
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
            >
              ✕
            </button>
          </div>
          <div className="bible-mobile-sheet-actions">
            <button type="button" className="bible-pill-btn" onClick={handleCopyVerse}>
              {copyFeedback || ui.copy}
            </button>
            <button type="button" className="bible-pill-btn" onClick={handleShareVerse}>
              {ui.share}
            </button>
            <button type="button" className="bible-pill-btn" onClick={() => openCompareVerse(selectedVerse)}>
              🔄 {language === 'ru' ? 'Переводы' : language === 'en' ? 'Compare' : 'Համեմատել'}
            </button>
            <button type="button" className="bible-pill-btn" onClick={() => startAudioRead(selectedVerse)}>
              🔊 {language === 'ru' ? 'Слушать' : language === 'en' ? 'Listen' : 'Լսել'}
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
              {ui.saveNote}
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
                {filteredBooks.map((b) => (
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
            <strong>📏 {activeMeasure.label[language] || activeMeasure.label.am}</strong>
            <span>{activeMeasure.info[language] || activeMeasure.info.am}</span>
          </div>
          <button type="button" className="bible-sheet-close" onClick={() => setActiveMeasure(null)}>
            ✕
          </button>
        </div>,
        document.body
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

      {/* Search Modal (Portaled) */}
      {showSearchModal && createPortal(
        <div className="bible-modal-backdrop" onClick={() => setShowSearchModal(false)}>
          <div className="bible-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bible-modal-head">
              <h3>{ui.search}</h3>
              <button type="button" className="bible-sheet-close" onClick={() => setShowSearchModal(false)}>
                ✕
              </button>
            </div>
            <form className="bible-search-form" onSubmit={runBibleSearch}>
              <input
                type="search"
                placeholder={ui.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="bible-cta-amber">
                {ui.search}
              </button>
            </form>
            <div className="bible-search-results">
              {searching ? (
                <p className="bible-empty-copy">...</p>
              ) : searchResults.length === 0 ? (
                <p className="bible-empty-copy">{ui.searchPlaceholder}</p>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    key={`${r.book}_${r.chapter}_${r.verse}_${i}`}
                    type="button"
                    className="bible-search-hit"
                    onClick={() => {
                      selectBookChapter(r.book, r.chapter);
                      setSelectedVerse(r.verse);
                      setShowSearchModal(false);
                    }}
                  >
                    <strong>
                      {getBookName(r.book, language)} {r.chapter}:{r.verse}
                    </strong>
                    <span>{r.text}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
