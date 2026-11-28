import React, { Suspense, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  renderWithChords,
  renderLyricsWithStageNotes,
  stripStageNotes,
  transposeRoot,
} from '../utils/chordTransposer';
import SmartMetronome from '../components/SmartMetronome';
import { SegmentedControl } from 'glisse';
import { getLocalizedTitle } from '../utils/titleParser';
import { normalizeSavedSongSort, sortSavedSongs } from '../utils/savedSongs';
import { normalizeSongKey, semitoneOffset, songKeysEqual } from '../utils/songKey';
import {
  getCachedFavoriteById,
  getCachedSetlistItem,
  getCachedSetlistNav,
  getCachedSongById,
  prefetchSongById,
  saveCachedSongDetail,
} from '../utils/songCache';
import { usePageReady } from '../hooks/usePageReady';
import './SongView.css';
import './SongViewWebPro.css';
import SongViewWebTools from '../components/SongViewWebTools';
import ChordDiagramPopover from '../components/ChordDiagramPopover';

const PrintStudio = lazyWithRetry(() => import('../components/PrintStudio'), 'PrintStudio');
const SongStemsMixer = lazyWithRetry(() => import('../components/SongStemsMixer'), 'SongStemsMixer');
const WorshipAIStudioModal = lazyWithRetry(() => import('../components/WorshipAIStudioModal'), 'WorshipAIStudioModal');
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { SongViewSkeleton, ModalListSkeleton } from '../components/NativeSkeletons';
import { nativeShare } from '../utils/nativeFeatures';
import {
  getFullscreenElement,
  isFullscreenSupported,
  enterFullscreen,
  exitFullscreen,
  addFullscreenChangeListener,
} from '../utils/fullscreen';
import { API_BASE_URL } from '../utils/nativeConfig';
import { useSongAudio } from '../context/SongAudioContext';
import { triggerHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '../utils/nativeHaptics';
import {
  requestKeepAwake,
  releaseKeepAwake,
  broadcastTabMessage,
  subscribeToTabMessages
} from '../utils/webPwaEnhancements';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge, ComingSoonBadge } from '../components/BetaBadge';

function getSectionRibbonMeta(rawLabel) {
  const clean = String(rawLabel || '').replace(/[\[\]:]/g, '').trim();
  const lower = clean.toLowerCase();
  if (/intro|նախերգ|вступ/i.test(lower)) return { label: clean, short: 'Ն', color: '#14b8a6' };
  if (/pre|նախակրկն|предприп/i.test(lower)) return { label: clean, short: 'ՆԿ', color: '#f59e0b' };
  if (/chorus|կրկն|припев/i.test(lower)) return { label: clean, short: 'Կ', color: '#ef4444' };
  if (/bridge|կամուրջ|бридж|мост/i.test(lower)) return { label: clean, short: 'ԿՄ', color: '#a855f7' };
  if (/outro|ending|ավարտ|конец|кода/i.test(lower)) return { label: clean, short: 'Ա', color: '#10b981' };
  if (/interlude|solo|սոլո|պրոիգ|проигр|инструм/i.test(lower)) return { label: clean, short: 'Ս', color: '#ec4899' };
  if (/verse|տուն|куплет|^\d/i.test(lower)) {
    const num = clean.match(/\d+/)?.[0] || '';
    return { label: clean, short: `Տ${num}`, color: '#3b82f6' };
  }
  return { label: clean, short: clean.slice(0, 3).toUpperCase(), color: '#f7b500' };
}

function parseArrangementSections(rawText) {
  if (!rawText) return [];
  const lines = String(rawText).split(/\r?\n/);
  const sections = [];
  const sectionPattern = /^\s*(?:\[([^\]]+)\]|((?:Տուն|Կրկներգ|Կամուրջ|Նախերգ|Նախակրկներգ|Ավարտ|Սոլո|Verse|Chorus|Pre-?Chorus|Bridge|Intro|Outro|Interlude|Куплет|Припев|Предприпев|Бридж|Вступление|Конец|Проигрыш)(?:\s*\d+)?)\s*:?)\s*$/i;
  lines.forEach((line, lineIdx) => {
    const m = line.match(sectionPattern);
    if (m) {
      const lbl = (m[1] || m[2] || '').trim();
      if (lbl && !/^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G][#b]?)?$/i.test(lbl)) {
        sections.push({ ...getSectionRibbonMeta(lbl), lineIdx, ratio: lineIdx / Math.max(1, lines.length) });
      }
    }
  });
  return sections;
}

function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(https?:|\/\/|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function getGoogleDriveEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

function getAttachmentType(att) {
  if (!att) return 'link';
  const rawUrl = String(att.url || '').trim();
  const url = rawUrl.toLowerCase();
  const title = String(att.title || '').toLowerCase();
  const type = String(att.type || '').toLowerCase();

  // 1. YouTube check ALWAYS takes precedence over generic 'video' or 'link'
  if (url.includes('youtube.com') || url.includes('youtu.be') || title.includes('youtube') || type === 'youtube' || Boolean(getYouTubeEmbedUrl(rawUrl))) {
    return 'youtube';
  }

  // 2. Google Drive check
  if (url.includes('drive.google.com') || Boolean(getGoogleDriveEmbedUrl(rawUrl)) || title.includes('drive') || type === 'drive') {
    return 'drive';
  }

  // 3. Audio check (direct audio file extensions or audio type)
  const cleanPath = url.split('?')[0].split('#')[0];
  const hasAudioExt = cleanPath.endsWith('.mp3') || cleanPath.endsWith('.wav') || cleanPath.endsWith('.m4a') ||
    cleanPath.endsWith('.ogg') || cleanPath.endsWith('.aac') || cleanPath.endsWith('.flac') ||
    cleanPath.endsWith('.opus') || cleanPath.endsWith('.weba');

  if (type === 'audio' || hasAudioExt || (url.includes('/uploads/song_materials/') && hasAudioExt) ||
      title.includes('audio') || title.includes('mp3') || title.includes('ձայնագրություն') || title.includes('աուդիո')) {
    return 'audio';
  }

  // 4. Video check (direct video file or video type, but NOT YouTube/Drive)
  const hasVideoExt = cleanPath.endsWith('.mp4') || cleanPath.endsWith('.webm') || cleanPath.endsWith('.mov') || cleanPath.endsWith('.m4v');
  if (type === 'video' || hasVideoExt) {
    return 'video';
  }

  // 5. Image check
  const hasImageExt = cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg') || cleanPath.endsWith('.png') || cleanPath.endsWith('.webp') || cleanPath.endsWith('.gif');
  if (type === 'image' || hasImageExt) {
    return 'image';
  }

  // 6. Document check
  const hasDocExt = cleanPath.endsWith('.pdf') || cleanPath.endsWith('.doc') || cleanPath.endsWith('.docx') || cleanPath.endsWith('.txt');
  if (type === 'document' || hasDocExt || title.includes('pdf')) {
    return 'drive';
  }

  return 'link';
}

function getNextSundayDate() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const addDays = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + addDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function getRelativeDateLabel(dateStr, lang) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
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

  if (diffDays === 0) return { text: dict.today, tone: 'highlight' };
  if (diffDays === 1) return { text: dict.tomorrow, tone: 'soon' };
  if (diffDays === -1) return { text: dict.yesterday, tone: 'past' };
  if (diffDays > 1 && diffDays <= 7) return { text: dict.inDays(diffDays), tone: 'soon' };
  if (diffDays < -1 && diffDays >= -7) return { text: dict.daysAgo(Math.abs(diffDays)), tone: 'past' };
  return null;
}

function formatSetlistDate(dateStr, lang) {
  if (!dateStr) return null;
  const rel = getRelativeDateLabel(dateStr, lang);
  const d = new Date(dateStr + 'T00:00:00');
  const dateFormatted = !isNaN(d.getTime()) ? d.toLocaleDateString(lang === 'am' ? 'hy-AM' : lang === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short',
    day: 'numeric'
  }) : dateStr;
  return rel ? `${dateFormatted} (${rel.text})` : dateFormatted;
}

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const { isEnabled, isBeta, isSoon, isVisible } = useFeatureFlags();
  const isNativeApp = useIsNativeApp();
  
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  usePageReady(loading && !song);
  const [error, setError] = useState(null);
  const userManuallyAdjustedKeyRef = useRef(false);
  const latestSongRef = useRef(null);
  const songAudio = useSongAudio();
  const [chordScale, setChordScale] = useState(() => parseFloat(localStorage.getItem('wp_chord_scale_v1') || '1.0'));
  
  const increaseChordScale = () => {
    setChordScale((prev) => {
      const next = Math.min(1.6, Number((prev + 0.1).toFixed(2)));
      localStorage.setItem('wp_chord_scale_v1', String(next));
      triggerHaptic();
      return next;
    });
  };

  const decreaseChordScale = () => {
    setChordScale((prev) => {
      const next = Math.max(0.8, Number((prev - 0.1).toFixed(2)));
      localStorage.setItem('wp_chord_scale_v1', String(next));
      triggerHaptic();
      return next;
    });
  };
  
  // Controls state
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('song_font_size') || '18', 10));
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('song_view_mode') || 'chords';
    return ['chords', 'lyrics', 'both'].includes(saved) ? saved : 'chords';
  });
  const [semi, setSemi] = useState(0);
  const [capo, setCapo] = useState(() => parseInt(localStorage.getItem(`capo_${id}`) || '0', 10));
  const [useFlats, setUseFlats] = useState(false);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [targetKey, setTargetKey] = useState(null); 
  const [favMsg, setFavMsg] = useState('');
  
  const [setlistNavData, setSetlistNavData] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareChats, setShareChats] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);

  const [isSetlistModalOpen, setIsSetlistModalOpen] = useState(false);
  const [userSetlists, setUserSetlists] = useState([]);
  const [setlistsLoading, setSetlistsLoading] = useState(false);
  const [setlistSearch, setSetlistSearch] = useState('');
  const [addingSetlistId, setAddingSetlistId] = useState(null);
  const [addedSetlistIds, setAddedSetlistIds] = useState({});
  const [isCreatingSetlist, setIsCreatingSetlist] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState('');
  const [createSetlistLoading, setCreateSetlistLoading] = useState(false);
  const [activeEmbedId, setActiveEmbedId] = useState(null);
  const [savingKeyToSetlist, setSavingKeyToSetlist] = useState(false);
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);
  const [savingFavKey, setSavingFavKey] = useState(false);
  const [favKeySavedFeedback, setFavKeySavedFeedback] = useState(false);

  // Web-Pro state (website desktop only)
  const isPWA = useIsAppMode();
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [showToneCapo, setShowToneCapo] = useState(false);
  const [showInlineMetronome, setShowInlineMetronome] = useState(false);
  const [pedalMode, setPedalMode] = useState(() => localStorage.getItem('wp_pedal_mode_v1') === 'true');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [personalNote, setPersonalNote] = useState(() => {
    try { return localStorage.getItem(`wp_song_note_${id}`) || ''; } catch { return ''; }
  });
  const [noteDraft, setNoteDraft] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const sheetRef = useRef(null);
  const ribbonRef = useRef(null);
  const toolsBtnRef = useRef(null);
  const [toolsMenuPos, setToolsMenuPos] = useState({ top: 80, right: 16 });

  const toggleToolsMenu = (e) => {
    e?.stopPropagation?.();
    if (!isToolsMenuOpen && toolsBtnRef.current) {
      const rect = toolsBtnRef.current.getBoundingClientRect();
      setToolsMenuPos({
        top: Math.min(rect.bottom + 8, window.innerHeight - 380),
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    setIsToolsMenuOpen((prev) => !prev);
  };
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1);
  const [chordColor, setChordColor] = useState(() => {
    const saved = localStorage.getItem('chordColor_web');
    if (!saved || saved === '#39d8ff') return '#ffffff';
    return saved;
  });
  const [isTwoColumn, setIsTwoColumn] = useState(() => localStorage.getItem('web_song_two_column') === 'true');
  const [keepAwakeActive, setKeepAwakeActive] = useState(() => localStorage.getItem('keepAwake') === 'true');
  const [isStageFullscreen, setIsStageFullscreen] = useState(false);
  const [popoverChord, setPopoverChord] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const autoScrollRef = React.useRef(null);
  const popoverOpenTimeRef = React.useRef(0);

  const toggleKeepAwake = async () => {
    if (keepAwakeActive) {
      await releaseKeepAwake();
      setKeepAwakeActive(false);
      localStorage.setItem('keepAwake', 'false');
    } else {
      const ok = await requestKeepAwake();
      setKeepAwakeActive(ok);
      localStorage.setItem('keepAwake', ok ? 'true' : 'false');
    }
  };

  const toggleTwoColumn = () => {
    setIsTwoColumn(prev => {
      const next = !prev;
      localStorage.setItem('web_song_two_column', String(next));
      return next;
    });
  };

  const toggleStageFullscreen = async () => {
    if (!isStageFullscreen && !getFullscreenElement()) {
      if (isFullscreenSupported()) {
        await enterFullscreen();
      }
      setIsStageFullscreen(true);
    } else {
      await exitFullscreen();
      setIsStageFullscreen(false);
    }
  };

  useEffect(() => {
    return addFullscreenChangeListener(() => {
      if (isFullscreenSupported()) {
        setIsStageFullscreen(Boolean(getFullscreenElement()));
      }
    });
  }, []);

  // Multi-tab sync subscription
  useEffect(() => {
    const unsubscribe = subscribeToTabMessages((msg) => {
      if (msg.action === 'SETLIST_UPDATED') {
        const params = new URLSearchParams(window.location.search);
        const setlistId = params.get('setlist_id');
        if (setlistId) {
          fetch(`/setlists_api.php?action=get_setlist_song_nav&song_id=${id}&setlist_id=${setlistId}`)
            .then(r => r.json())
            .then(data => {
              if (data && !data.error && data.current) {
                setSetlistNavData(data);
              }
            }).catch(() => {});
        }
      } else if (msg.action === 'FAVORITES_UPDATED' && String(msg.payload?.songId) === String(id)) {
        setIsFavorite(Boolean(msg.payload?.isFavorite));
      }
    });
    return unsubscribe;
  }, [id]);

  // Auto-scroll effect (60Hz/120Hz rAF with delta-time sub-pixel smoothing)
  useEffect(() => {
    if (!autoScrollActive) {
      if (autoScrollRef.current) {
        window.cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return undefined;
    }

    let lastTime = performance.now();
    let carry = 0;
    const pixelsPerSecond = autoScrollSpeed * 24;

    const step = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      carry += pixelsPerSecond * dt;
      const wholePixels = Math.trunc(carry);
      if (wholePixels >= 1) {
        carry -= wholePixels;
        window.scrollBy({ top: wholePixels, behavior: 'auto' });
      }
      autoScrollRef.current = window.requestAnimationFrame(step);
    };

    autoScrollRef.current = window.requestAnimationFrame(step);
    return () => {
      if (autoScrollRef.current) {
        window.cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [autoScrollActive, autoScrollSpeed]);

  // Inject chord color CSS var
  useEffect(() => {
    document.documentElement.style.setProperty('--song-chord-color', chordColor);
    localStorage.setItem('chordColor_web', chordColor);
  }, [chordColor]);

  useEffect(() => {
    if (isPWA) return undefined;
    const openPrintStudio = () => setIsPrintOpen(true);
    window.addEventListener('worship:open-print-studio', openPrintStudio);
    return () => window.removeEventListener('worship:open-print-studio', openPrintStudio);
  }, [isPWA]);

  useEffect(() => {
    document.body.classList.add('song-view-active');
    
    // Wake Lock
    if (keepAwakeActive) {
      requestKeepAwake();
    }
    
    const handleVisibilityChange = () => {
      if (keepAwakeActive && document.visibilityState === 'visible') {
        requestKeepAwake();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.body.classList.remove('song-view-active');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseKeepAwake();
    };
  }, [keepAwakeActive]);

  const copyShareLink = async () => {
    try {
      const shareUrl = `https://worship.pmstudio.am/song/${id}`;
      const urlObj = new URL(shareUrl);
      if (targetKey) urlObj.searchParams.set('tkey', targetKey);
      if (capo > 0) urlObj.searchParams.set('capo', String(capo));
      if (viewMode && viewMode !== 'all') urlObj.searchParams.set('view', viewMode);

      const songTitle = song?.title ? getLocalizedTitle(song.title, language) : 'Song';
      const shareResult = await nativeShare({
        title: songTitle,
        text: `${songTitle} — Worship Platform`,
        url: urlObj.toString(),
        dialogTitle: t('songView.share', 'Կիսվել')
      });

      if (shareResult === 'copied') {
        setFavMsg(t('songView.linkCopied', 'Հղումը պատճենված է'));
        setTimeout(() => setFavMsg(''), 2000);
      } else if (shareResult) {
        setFavMsg(t('songView.shared', 'Կիսված է'));
        setTimeout(() => setFavMsg(''), 2000);
      }
    } catch (e) {
      setFavMsg(t('songView.linkCopyError', 'Սխալ պատճենման ժամանակ'));
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  const copySongContent = async () => {
    try {
      let text = `${getLocalizedTitle(song.title, language)}\n`;
      
      const keyToCopy = targetKey || playingKey;
      if (keyToCopy) {
        text += `${t('songView.key', 'Key')}: ${keyToCopy}\n`;
      }
      
      text += '\n';

      if (song.chords) {
        const rawChords = renderWithChords(stripStageNotes(song.chords), semi - capo, useFlats).replace(/<[^>]*>?/gm, '');
        text += `--- ${t('songView.chords', 'Chords')} ---\n`;
        text += rawChords + '\n\n';
      }

      if (song.lyrics) {
        text += `--- ${t('songView.lyrics', 'Lyrics')} ---\n`;
        text += stripStageNotes(song.lyrics) + '\n';
      }

      await navigator.clipboard.writeText(text.trim());
      setFavMsg(t('songView.copied', 'Պատճենվեց'));
      setTimeout(() => setFavMsg(''), 2000);
    } catch (err) {
      setFavMsg(t('songView.copyError', 'Սխալ պատճենման ժամանակ'));
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  // Lock body scroll and mark modal open so MobileNav / bottom dock is hidden
  useEffect(() => {
    const isAnyModalOpen = isSetlistModalOpen || isToolsMenuOpen || isShareModalOpen || isAIStudioOpen;
    if (!isAnyModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('sv-modal-open');
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('sv-modal-open');
    };
  }, [isSetlistModalOpen, isToolsMenuOpen, isShareModalOpen, isAIStudioOpen]);

  const filteredSetlists = React.useMemo(() => {
    if (!userSetlists || !Array.isArray(userSetlists)) return [];
    const q = setlistSearch.trim().toLowerCase();
    if (!q) return userSetlists;
    return userSetlists.filter(s => {
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const dateMatch = (s.service_date || '').toLowerCase().includes(q);
      const teamMatch = (s.team_name || '').toLowerCase().includes(q);
      return nameMatch || dateMatch || teamMatch;
    });
  }, [userSetlists, setlistSearch]);

  const openSetlistModal = async () => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + window.location.pathname);
      return;
    }
    setIsSetlistModalOpen(true);
    setSetlistSearch('');
    setIsCreatingSetlist(false);
    setNewSetName('');
    setNewSetDate(getNextSundayDate());
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
      } else {
        setFavMsg(data.error || 'Error loading setlists');
        setTimeout(() => setFavMsg(''), 3000);
      }
    } catch (err) {
      setFavMsg('Error loading setlists');
      setTimeout(() => setFavMsg(''), 3000);
    } finally {
      setSetlistsLoading(false);
    }
  };

  const addToSetlist = async (setId) => {
    if (addingSetlistId) return;
    setAddingSetlistId(setId);
    try {
      const res = await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: setId,
          song_id: Number(id),
          target_key: soundingKey || song?.song_key || null,
          capo: capo > 0 ? Number(capo) : null
        })
      });
      const data = await res.json();
      if (data.ok) {
        setAddedSetlistIds(prev => ({ ...prev, [setId]: true }));
        setUserSetlists(prev => prev.map(s => s.id === setId ? { ...s, items_count: (s.items_count || 0) + 1 } : s));
        setFavMsg(t('songView.addedToSetlist', 'Ավելացվել է երգացանկում'));
        setTimeout(() => setFavMsg(''), 2500);
      } else {
        setFavMsg(data.error || 'Error adding to setlist');
        setTimeout(() => setFavMsg(''), 3000);
      }
    } catch (err) {
      setFavMsg('Error adding to setlist');
      setTimeout(() => setFavMsg(''), 3000);
    } finally {
      setAddingSetlistId(null);
    }
  };

  const handleCreateAndAddSetlist = async (e) => {
    e.preventDefault();
    const nameTrimmed = newSetName.trim();
    if (!nameTrimmed || createSetlistLoading) return;
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
      const addRes = await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: newId,
          song_id: Number(id),
          target_key: soundingKey || song?.song_key || null,
          capo: capo > 0 ? Number(capo) : null
        })
      });
      const addData = await addRes.json();

      setAddedSetlistIds(prev => ({ ...prev, [newId]: true }));
      setFavMsg(t('songView.addedToSetlist', 'Ավելացվել է երգացանկում'));
      setTimeout(() => setFavMsg(''), 2500);

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

  const openShareModal = async () => {
    if (!user) {
      navigate('/login?next=' + window.location.pathname);
      return;
    }
    setIsShareModalOpen(true);
    setShareLoading(true);
    try {
      const res = await fetch('/chat_api.php?action=list_chats');
      const data = await res.json();
      if (data.ok) setShareChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
    setShareLoading(false);
  };

  const handleShareToChat = async (chatId) => {
    const title = song.title.replace(/[\[\]\|]/g, ''); // strip reserved chars
    const msg = `[SONG|id:${id}|key:${semi}|capo:${capo}|title:${title}]`;
    
    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: msg }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsShareModalOpen(false);
        setFavMsg(t('chat.sent', 'Ուղարկված է'));
        setTimeout(() => setFavMsg(''), 2000);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const addAttachment = async (title, url) => {
    try {
      const res = await fetch('/song_attachments_api.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, title, url })
      });
      const data = await res.json();
      if (data.ok) {
        setSong(prev => ({ ...prev, attachments: [...(prev.attachments || []), { id: data.id, title, url, type: 'link' }] }));
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeAttachment = async (attId) => {
    if (!window.confirm("Հեռացնե՞լ այս հղումը։")) return;
    try {
      const res = await fetch('/song_attachments_api.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: attId })
      });
      const data = await res.json();
      if (data.ok) {
        setSong(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attId) }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login?next=' + window.location.pathname);
      return;
    }
    const previousState = isFavorite;
    const newState = !previousState;
    setIsFavorite(newState);
    try {
      const response = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, target_key: newState ? playingKey : null }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.favorite !== 'boolean') {
        throw new Error(data.error || 'Favorite update failed');
      }

      setIsFavorite(data.favorite);
      setTargetKey(data.favorite ? (data.target_key || playingKey) : null);
      setFavMsg(data.favorite ? t('songView.added') : t('songView.removed'));
      broadcastTabMessage('FAVORITES_UPDATED', { songId: id, isFavorite: data.favorite });
    } catch {
      setIsFavorite(previousState);
      setFavMsg(t('songView.favoriteError', 'Չհաջողվեց պահպանել երգը'));
    }
    setTimeout(() => setFavMsg(''), 2000);
  };

  const resolvePreferredCapo = (songId, searchStr, cachedSetlistItem) => {
    const params = new URLSearchParams(searchStr || '');
    const urlCapo = params.get('capo');
    let preferredCapo = 0;
    if (urlCapo !== null) {
      preferredCapo = Number.parseInt(urlCapo, 10) || 0;
    } else if (cachedSetlistItem?.capo != null) {
      preferredCapo = Number.parseInt(cachedSetlistItem.capo, 10) || 0;
    } else {
      preferredCapo = Number.parseInt(localStorage.getItem(`capo_${songId}`) || '0', 10) || 0;
      if (!preferredCapo) {
        try {
          const legacyCapoPref = localStorage.getItem(`song_capo_pref:${songId}`);
          if (legacyCapoPref) preferredCapo = Number.parseInt(JSON.parse(legacyCapoPref).capo, 10) || 0;
        } catch {
          // ignore corrupt preference
        }
      }
    }
    return Math.max(0, Math.min(12, preferredCapo));
  };

  useLayoutEffect(() => {
    let cancelled = false;
    userManuallyAdjustedKeyRef.current = false;

    const params = new URLSearchParams(location.search);
    const urlTkey = params.get('tkey');
    const urlCapo = params.get('capo');
    const listQuery = params.get('list') || '';
    const setlistId = params.get('setlist_id') || (listQuery.startsWith('setlist_') ? listQuery.slice(8) : '');
    const setlistItemId = params.get('setlist_item_id');
    const setlistToken = params.get('setlist_token');
    const isSetlistContext = Boolean(setlistId || setlistItemId || setlistToken);

    const cachedSetlistItem = setlistId ? getCachedSetlistItem(setlistId, id, setlistItemId) : null;
    const cachedFav = user ? getCachedFavoriteById(id) : null;
    const cachedSong = getCachedSongById(id, { lang: language, setlistId, setlistItemId });
    const preferredCapo = resolvePreferredCapo(id, location.search, cachedSetlistItem);

    const computeTransposition = (songData, keyCandidate, capoValue) => {
      const normalized = normalizeSongKey(keyCandidate);
      if (!normalized || !songData?.song_key) {
        return { targetKey: null, semi: capoValue };
      }
      const difference = semitoneOffset(songData.song_key, normalized);
      if (difference === null) {
        return { targetKey: null, semi: capoValue };
      }
      return { targetKey: normalized, semi: difference + capoValue };
    };

    const initialKeyCandidate =
      urlTkey ||
      cachedSetlistItem?.target_key ||
      (!isSetlistContext ? cachedFav?.target_key : null) ||
      null;

    if (cachedSong && cachedSong.id) {
      const { targetKey: nextTargetKey, semi: nextSemi } = computeTransposition(
        cachedSong,
        initialKeyCandidate,
        preferredCapo
      );
      latestSongRef.current = cachedSong;
      setSong(cachedSong);
      setError(null);
      setCapo(preferredCapo);
      setTargetKey(nextTargetKey);
      setSemi(nextSemi);
      setIsFavorite(Boolean(cachedFav));
      setLoading(false);
    } else {
      latestSongRef.current = null;
      setLoading(true);
      setError(null);
      setSong(null);
      setCapo(preferredCapo);
      setSemi(preferredCapo);
      setTargetKey(null);
      setIsFavorite(Boolean(cachedFav));
    }

    const fetchFullSongDetails = (isInitial = false) => {
      fetch(`/api.php?id=${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data || !data.id) throw new Error('Song not found');
          saveCachedSongDetail(data, language);
          if (cancelled) return;

          latestSongRef.current = data;
          setSong(data);
          if (isInitial) setLoading(false);

          if (isInitial) {
            if (!userManuallyAdjustedKeyRef.current) {
              const latestSetlistItem = setlistId ? getCachedSetlistItem(setlistId, id, setlistItemId) : null;
              const resolvedKeyCandidate =
                urlTkey ||
                latestSetlistItem?.target_key ||
                (!isSetlistContext ? cachedFav?.target_key : null) ||
                null;
              const { targetKey: nextTargetKey, semi: nextSemi } = computeTransposition(
                data,
                resolvedKeyCandidate,
                preferredCapo
              );
              setCapo(preferredCapo);
              setTargetKey(nextTargetKey);
              setSemi(nextSemi);
            }

            if (user) {
              fetch(`/user_favorites_api.php?action=get_favorite&song_id=${id}`)
                .then(r => (r.ok ? r.json() : null))
                .then(favData => {
                  if (cancelled || !favData) return;
                  setIsFavorite(Boolean(favData.favorite));
                  if (
                    !userManuallyAdjustedKeyRef.current &&
                    !urlTkey &&
                    !isSetlistContext &&
                    favData.target_key
                  ) {
                    const { targetKey: favTargetKey, semi: favSemi } = computeTransposition(
                      data,
                      favData.target_key,
                      preferredCapo
                    );
                    if (favTargetKey) {
                      setTargetKey(favTargetKey);
                      setSemi(favSemi);
                    }
                  }
                })
                .catch(() => {});
            }

            if (user) {
              fetch('/account_api.php?action=add_recent_view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ song_id: id })
              }).catch(() => {});
            }
          }
        })
        .catch(() => {
          if (cancelled) return;
          if (isInitial && !cachedSong) {
            setError(t('songView.error'));
            setLoading(false);
          }
        });
    };

    fetchFullSongDetails(true);

    // Live update listener: if Service Worker background-syncs or receives fresh song details,
    // update song state immediately so user sees latest chords/lyrics without manual refresh.
    const handleSwMessage = (event) => {
      const data = event && event.data ? event.data : null;
      if (data && data.type === 'SONG_DETAIL_UPDATED' && String(data.song_id) === String(id)) {
        fetchFullSongDetails(false);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    const handleNativeRefresh = (event) => {
      const path = event?.detail?.pathname;
      if (!path || path.startsWith('/song/')) {
        fetchFullSongDetails(false);
      }
    };
    window.addEventListener('wp-native-refresh', handleNativeRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('wp-native-refresh', handleNativeRefresh);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [id, language, user, location.search]);

  useLayoutEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const listQuery = params.get('list') || '';
    const setlistId = params.get('setlist_id') || params.get('setlist') || (listQuery.startsWith('setlist_') ? listQuery.slice(8) : '');
    const setlistToken = params.get('setlist_token');
    const setlistItemId = params.get('setlist_item_id') || params.get('item_id');
    const urlTkey = params.get('tkey') || params.get('target_key') || params.get('key');
    const urlCapo = params.get('capo');

    const applyNavKeyIfNeeded = (currentItem) => {
      if (!currentItem || userManuallyAdjustedKeyRef.current) return;
      const songData = latestSongRef.current;
      if (!songData?.song_key) return;

      const resolvedCapo =
        urlCapo !== null
          ? (Number.parseInt(urlCapo, 10) || 0)
          : (currentItem.capo != null ? (Number.parseInt(currentItem.capo, 10) || 0) : capo);
      const cleanCapo = Math.max(0, Math.min(12, resolvedCapo));

      if (!urlTkey && currentItem.target_key) {
        const normalized = normalizeSongKey(currentItem.target_key);
        const diff = normalized ? semitoneOffset(songData.song_key, normalized) : null;
        if (normalized && diff !== null) {
          setCapo(cleanCapo);
          setTargetKey(normalized);
          setSemi(diff + cleanCapo);
          return;
        }
      }
      if (urlCapo === null && currentItem.capo != null) {
        setCapo((prevCapo) => {
          if (cleanCapo === prevCapo) return prevCapo;
          setSemi((prev) => prev - prevCapo + cleanCapo);
          return cleanCapo;
        });
      }
    };

    if (setlistId || setlistToken) {
      const cachedNav = setlistId ? getCachedSetlistNav(setlistId, id, setlistItemId) : null;
      if (cachedNav) {
        setSetlistNavData(cachedNav);
        if (cachedNav.prev?.id) prefetchSongById(cachedNav.prev.id, language);
        if (cachedNav.next?.id) prefetchSongById(cachedNav.next.id, language);
      } else {
        setSetlistNavData(null);
      }

      let url = `/setlists_api.php?action=get_setlist_song_nav&song_id=${id}`;
      if (setlistId) url += `&setlist_id=${setlistId}`;
      if (setlistToken) url += `&token=${setlistToken}`;
      if (setlistItemId) url += `&item_id=${setlistItemId}`;

      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (!data.error && data.current) {
            const normalizedNav = {
              ...data,
              current: {
                ...data.current,
                index: data.index,
                setlist_id: data.setlist?.id || setlistId,
              },
            };
            setSetlistNavData(normalizedNav);
            applyNavKeyIfNeeded(normalizedNav.current);
            if (normalizedNav.prev?.id) prefetchSongById(normalizedNav.prev.id, language);
            if (normalizedNav.next?.id) prefetchSongById(normalizedNav.next.id, language);
          }
        }).catch(() => {});
    } else if (listQuery === 'favorites' && user) {
      const applyOrderedFavNav = (data) => {
        if (!Array.isArray(data)) return;
        const savedSort = normalizeSavedSongSort(params.get('sort'));
        const keyFilter = params.get('key');
        const filteredData = keyFilter
          ? data.filter(item => (item.target_key || item.song_key) === keyFilter)
          : data;
        const orderedData = sortSavedSongs(
          filteredData,
          savedSort,
          item => getLocalizedTitle(item, language),
          language
        );
        const idx = orderedData.findIndex(s => String(s.id) === String(id));
        if (idx !== -1) {
          const prevItem = idx > 0 ? orderedData[idx - 1] : null;
          const nextItem = idx < orderedData.length - 1 ? orderedData[idx + 1] : null;
          setSetlistNavData({
            current: { id, index: idx + 1 },
            total: orderedData.length,
            prev: prevItem,
            next: nextItem,
          });
          if (prevItem?.id) prefetchSongById(prevItem.id, language);
          if (nextItem?.id) prefetchSongById(nextItem.id, language);
        }
      };

      try {
        const rawFavCache = localStorage.getItem('wp_user_favorites_cache');
        if (rawFavCache) {
          applyOrderedFavNav(JSON.parse(rawFavCache));
        } else {
          setSetlistNavData(null);
        }
      } catch {
        setSetlistNavData(null);
      }

      fetch('/user_favorites_api.php?action=get_favorites')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled || !data) return;
          applyOrderedFavNav(data);
        }).catch(() => {});
    } else {
      setSetlistNavData(null);
    }

    if (listQuery && listQuery.startsWith('setlist_')) {
      const setId = listQuery.split('_')[1];
      fetch(`/setlists_api.php?action=get_setlist_items&setlist_id=${setId}`)
        .then(r => r.json())
        .then(d => {
          if (!cancelled && d && d.setlist && d.setlist.team_role === 'vocalist' && !localStorage.getItem('view_mode_overridden')) {
            setViewMode('lyrics');
          }
        }).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [id, language, location.search, user]);

  const increaseFontSize = () => { 
    setFontSize(prev => {
      const v = Math.min(prev + 2, 40);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  const decreaseFontSize = () => { 
    setFontSize(prev => {
      const v = Math.max(prev - 2, 14);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  
  const handleViewModeChange = (mode) => {
    triggerSelectionHaptic();
    setViewMode(mode);
    localStorage.setItem('song_view_mode', mode);
    localStorage.setItem('view_mode_overridden', 'true');
  };

  const getTransposedFullKey = (originalKey, semitones) => {
    if (!originalKey) return '';
    const trimmed = originalKey.trim();
    const rootMatch = trimmed.match(/^([A-G](?:#|b)?)(.*)$/i);
    if (!rootMatch) return trimmed;
    const newRoot = transposeRoot(rootMatch[1], semitones, useFlats);
    return newRoot + (rootMatch[2] || '');
  };

  const soundingKey = getTransposedFullKey(song?.song_key, semi);
  const playingKey = getTransposedFullKey(song?.song_key, semi - capo);
  // Older favorites may not have target_key. In that case the song's original
  // key is the saved baseline and must not look like an unsaved key change.
  const savedKey = normalizeSongKey(targetKey || song?.song_key);
  const hasUnsavedKeyChange = isFavorite
    && Boolean(savedKey)
    && Boolean(playingKey)
    && !songKeysEqual(savedKey, playingKey);
  
  const KEYS_BASE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootMatchForKeys = song?.song_key?.match(/^([A-G](?:#|b)?)(.*)$/i);
  const keySuffix = rootMatchForKeys ? rootMatchForKeys[2] : '';
  const KEYS = KEYS_BASE.map(k => k + keySuffix);
  
  const applyManualCapo = (nextCapo) => {
    const clean = Math.max(0, Math.min(12, Number.parseInt(nextCapo, 10) || 0));
    userManuallyAdjustedKeyRef.current = true;
    setCapo(clean);
    localStorage.setItem(`capo_${id}`, clean);
    localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: clean, capo_mode: clean > 0 ? 1 : 0 }));
  };

  const handleKeyClick = (targetKeyStr) => {
    if (!song?.song_key) return;
    const difference = semitoneOffset(song.song_key, targetKeyStr);
    if (difference !== null) {
      userManuallyAdjustedKeyRef.current = true;
      setSemi(difference);
    }
  };

  const handleSaveFavoriteKey = async () => {
    if (savingFavKey || !isFavorite) return;
    const keyToSave = playingKey || soundingKey;
    if (!keyToSave) return;

    setSavingFavKey(true);
    setFavKeySavedFeedback(true);

    const normKey = normalizeSongKey(keyToSave);
    setTargetKey(normKey);

    // Update URL query parameters in-place so reloading preserves target key
    try {
      const q = new URLSearchParams(window.location.search);
      q.set('tkey', keyToSave);
      if (capo > 0) q.set('capo', String(capo));
      else q.delete('capo');
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    } catch {}

    // Update localStorage favorites cache for instant 0ms back navigation
    try {
      const raw = localStorage.getItem('wp_user_favorites_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const item = parsed.find(f => String(f.song_id || f.id) === String(id));
          if (item) {
            item.target_key = normKey;
            localStorage.setItem('wp_user_favorites_cache', JSON.stringify(parsed));
          }
        }
      }
    } catch {}

    broadcastTabMessage('FAVORITES_UPDATED', { songId: id, targetKey: keyToSave, isFavorite: true });
    window.dispatchEvent(new CustomEvent('worship:favorites-changed'));

    try {
      const res = await fetch('/user_favorites_api.php?action=update_favorite_key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, target_key: keyToSave }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Key save failed');
      }
    } catch (err) {
      console.error(err);
      setFavMsg(t('songView.favoriteError', 'Չհաջողվեց պահպանել երգը'));
      setTimeout(() => setFavMsg(''), 2000);
    } finally {
      setSavingFavKey(false);
      setTimeout(() => setFavKeySavedFeedback(false), 2500);
    }
  };

  const saveFavoriteKey = handleSaveFavoriteKey;

  const navigateToSetlistSong = (item) => {
    if (!item || !item.id) return;
    const params = new URLSearchParams(window.location.search);
    const activeSetlistId = params.get('setlist_id');
    const cachedItem = activeSetlistId ? getCachedSetlistItem(activeSetlistId, item.id, item.item_id) : null;
    const effectiveTargetKey = cachedItem?.target_key ?? item.target_key;
    const effectiveCapo = cachedItem?.capo ?? item.capo;

    const q = new URLSearchParams();
    if (effectiveTargetKey) q.set('tkey', effectiveTargetKey);
    if (effectiveCapo) {
      q.set('capo', String(effectiveCapo));
      q.set('capo_mode', '1');
    } else {
      const pref = JSON.parse(localStorage.getItem(`song_capo_pref:${item.id}`) || '{"capo":0,"capo_mode":0}');
      if (pref.capo_mode === 1 && pref.capo > 0) {
        q.set('capo', String(pref.capo));
        q.set('capo_mode', '1');
      }
    }

    if (params.get('list')) q.set('list', params.get('list'));
    if (params.get('sort')) q.set('sort', params.get('sort'));
    if (params.get('key')) q.set('key', params.get('key'));
    if (activeSetlistId) q.set('setlist_id', activeSetlistId);
    if (params.get('setlist_token')) q.set('setlist_token', params.get('setlist_token'));
    if (params.get('from_live')) q.set('from_live', params.get('from_live'));
    if (item.item_id) q.set('setlist_item_id', String(item.item_id));
    
    // Paging changes the current song, but should not create a back-history
    // entry for every song in the saved list or setlist.
    const qStr = q.toString();
    navigate(`/song/${item.id}${qStr ? '?' + qStr : ''}`, { replace: true });
  };

  const handleSongBack = () => {
    const params = new URLSearchParams(location.search);
    const list = params.get('list') || '';
    const fromLive = params.get('from_live') === '1';

    if (list === 'favorites') {
      navigate('/favorites', { replace: true });
      return;
    }

    const setlistId = params.get('setlist_id') || params.get('setlist') || setlistNavData?.setlist?.id || (list.startsWith('setlist_') ? list.slice(8) : '');
    if (setlistId) {
      if (fromLive) {
        navigate(`/setlists/${setlistId}/live`, { replace: true });
        return;
      }
      navigate(`/setlists/${setlistId}`, { replace: true });
      return;
    }

    const setlistToken = params.get('setlist_token');
    if (setlistToken) {
      if (fromLive) {
        navigate(`/setlists/live?token=${setlistToken}`, { replace: true });
        return;
      }
      navigate(`/setlists/public?token=${setlistToken}`, { replace: true });
      return;
    }

    navigate(-1);
  };

  // Save current transposed key / capo directly into the setlist item
  const handleSaveKeyToSetlist = async () => {
    const searchParams = new URLSearchParams(location.search);
    const setlistId = setlistNavData?.setlist?.id || setlistNavData?.current?.setlist_id || searchParams.get('setlist_id') || searchParams.get('setlist');
    let itemId = setlistNavData?.current?.item_id || searchParams.get('setlist_item_id') || searchParams.get('item_id');

    // If itemId wasn't in URL or setlistNavData yet, look up in cached setlist items
    if (!itemId && setlistId) {
      try {
        const cacheKey = `wp_setlist_cache_${setlistId}`;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const itm = (parsed.items || []).find(i => String(i.song_id) === String(id));
          if (itm?.id) itemId = itm.id;
        }
      } catch {}
    }

    if (!itemId || savingKeyToSetlist) return;

    setSavingKeyToSetlist(true);
    // Instant optimistic feedback
    setKeySavedFeedback(true);

    // Optimistically update setlistNavData state
    setSetlistNavData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        current: {
          ...prev.current,
          target_key: soundingKey,
          capo: capo > 0 ? capo : null,
        },
      };
    });

    // Update URL query parameters in-place so reloading preserves target key
    try {
      const q = new URLSearchParams(window.location.search);
      q.set('tkey', soundingKey);
      if (capo > 0) q.set('capo', String(capo));
      else q.delete('capo');
      window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
    } catch {}

    // Update localStorage cache of the setlist for instant 0ms back navigation
    if (setlistId) {
      try {
        const cacheKey = `wp_setlist_cache_${setlistId}`;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.items)) {
            const itm = parsed.items.find(i => String(i.id) === String(itemId) || String(i.song_id) === String(id));
            if (itm) {
              itm.target_key = soundingKey;
              itm.capo = capo > 0 ? capo : null;
              localStorage.setItem(cacheKey, JSON.stringify(parsed));
            }
          }
        }
      } catch {}
      broadcastTabMessage('SETLIST_UPDATED', { setlistId });
      window.dispatchEvent(new CustomEvent('worship:setlists-changed'));
    }

    try {
      const res = await fetch('/setlists_api.php?action=update_setlist_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          target_key: soundingKey,
          capo: capo > 0 ? capo : null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || 'Failed to save key in setlist');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKeyToSetlist(false);
      setTimeout(() => setKeySavedFeedback(false), 2500);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const isFromSetlist = Boolean(
    searchParams.get('setlist_id') ||
    searchParams.get('setlist') ||
    searchParams.get('setlist_item_id') ||
    searchParams.get('item_id') ||
    setlistNavData?.setlist?.id ||
    setlistNavData?.current?.setlist_id
  );

  const setlistCurrentKey = setlistNavData?.current?.target_key || searchParams.get('tkey') || song?.song_key;
  const setlistCurrentCapo = Number(setlistNavData?.current?.capo !== undefined ? setlistNavData.current.capo : (searchParams.get('capo') || 0));
  const isKeyOrCapoChangedInSetlist = Boolean(
    isFromSetlist &&
    (!songKeysEqual(soundingKey, setlistCurrentKey) || Number(capo || 0) !== setlistCurrentCapo)
  );

  const hasChords = Boolean(song?.chords && song.chords.trim());
  const hasLyrics = Boolean(song?.lyrics && song.lyrics.trim());

  const currentChords = useMemo(
    () => (hasChords ? renderWithChords(song.chords, semi - capo, useFlats) : ''),
    [hasChords, song?.chords, semi, capo, useFlats]
  );
  const arrangementSections = useMemo(
    () => parseArrangementSections(song?.chords || song?.lyrics || ''),
    [song?.chords, song?.lyrics]
  );
  const currentLyrics = hasLyrics ? song.lyrics : '';
  const displayTitle = song?.title ? getLocalizedTitle(song.title, language) : (song?.title_hy || song?.title || 'Worship Song');

  // Always show the exact same 3 consistent tabs across every song (normal, favorites, setlists)
  const viewModeTabs = useMemo(() => [
    { id: 'chords', label: t('songView.chordsOnly', 'Ակորդներ') },
    { id: 'lyrics', label: t('songView.lyricsOnly', 'Բառեր') },
    { id: 'both', label: t('songView.bothModes', 'Երկուսն էլ') },
  ], [t]);

  const effectiveViewMode = ['chords', 'lyrics', 'both'].includes(viewMode) ? viewMode : 'chords';
  const defaultChordsViewMode = 'chords';

  const promptAddAttachment = () => {
    const title = window.prompt('Մուտքագրեք հղման անվանումը (օր.՝ YouTube Track)');
    if (!title) return;
    const url = window.prompt('Մուտքագրեք հղումը (URL)');
    if (!url) return;
    addAttachment(title, url);
  };

  const openChordPopover = event => {
    const chordElement = event.target.closest?.('.chord');
    if (!chordElement) return;

    const chordText = (chordElement.textContent || '').trim();
    if (!chordText || !/^[A-G]/i.test(chordText)) return;

    const now = Date.now();

    // If tapping same chord while open, toggle off only if > 350ms passed since opening
    if (popoverChord === chordText) {
      if (now - popoverOpenTimeRef.current > 350) {
        setPopoverChord(null);
        setPopoverPos(null);
      }
      return;
    }

    const rect = chordElement.getBoundingClientRect();
    const popoverWidth = 304;
    const popoverHeight = 220;

    // Position generously below the chord text so the chord remains fully visible
    let top = rect.bottom + 24;
    if (top + popoverHeight > window.innerHeight - 70) {
      top = Math.max(12, window.innerHeight - popoverHeight - 80);
    }

    let left = rect.left - 80;
    left = Math.min(Math.max(left, 12), window.innerWidth - popoverWidth - 12);

    popoverOpenTimeRef.current = now;
    setPopoverChord(chordText);
    setPopoverPos({ top, left });
  };

  const closeChordPopover = event => {
    if (Date.now() - popoverOpenTimeRef.current < 350) return;
    if (event?.relatedTarget?.closest?.('.chord-diagram-popover')) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setPopoverChord(null);
    setPopoverPos(null);
  };

  // Close diagram popover automatically when tapping anywhere outside
  useEffect(() => {
    if (!popoverChord) return;

    const handleOutsidePointer = (event) => {
      if (Date.now() - popoverOpenTimeRef.current < 350) return;
      if (
        event.target.closest?.('.chord-diagram-popover') ||
        event.target.closest?.('.chord')
      ) {
        return;
      }
      setPopoverChord(null);
      setPopoverPos(null);
    };

    window.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => {
      window.removeEventListener('pointerdown', handleOutsidePointer, true);
    };
  }, [popoverChord]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const mainEl = document.querySelector('main') || document.documentElement;
    if (mainEl && mainEl.scrollTop > 0) mainEl.scrollTop = 0;
    setActiveSectionIdx(0);
    setShowNoteEditor(false);
    try {
      const saved = localStorage.getItem(`wp_song_note_${id}`) || '';
      setPersonalNote(saved);
      setNoteDraft(saved);
    } catch {
      setPersonalNote('');
      setNoteDraft('');
    }
  }, [id]);

  // Auto-highlight active arrangement section while scrolling
  useEffect(() => {
    if (arrangementSections.length < 2) return undefined;
    let rafId = 0;
    const updateActiveSection = () => {
      rafId = 0;
      const sheetEl = sheetRef.current;
      if (!sheetEl || sheetEl.scrollHeight <= 0) return;
      const rect = sheetEl.getBoundingClientRect();
      const absTop = rect.top + window.scrollY;
      const viewportProbe = window.scrollY + Math.min(220, window.innerHeight * 0.28);
      const progress = Math.max(0, Math.min(1, (viewportProbe - absTop) / Math.max(1, sheetEl.scrollHeight)));
      let foundIdx = 0;
      for (let i = 0; i < arrangementSections.length; i += 1) {
        if (arrangementSections[i].ratio <= progress + 0.04) {
          foundIdx = i;
        }
      }
      setActiveSectionIdx((prev) => (prev === foundIdx ? prev : foundIdx));
    };
    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateActiveSection);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [arrangementSections, effectiveViewMode]);

  // Keep active pill gently visible inside horizontal arrangement ribbon
  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;
    const activePill = ribbon.children[activeSectionIdx];
    if (activePill && typeof activePill.scrollIntoView === 'function') {
      try {
        activePill.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      } catch {}
    }
  }, [activeSectionIdx]);

  const handleSavePersonalNote = () => {
    const cleaned = noteDraft.trim();
    setPersonalNote(cleaned);
    try {
      if (cleaned) localStorage.setItem(`wp_song_note_${id}`, cleaned);
      else localStorage.removeItem(`wp_song_note_${id}`);
    } catch {}
    setShowNoteEditor(false);
    setFavMsg(cleaned
      ? (language === 'ru' ? 'Заметка сохранена' : language === 'en' ? 'Note saved' : 'Նշումը պահպանվեց')
      : (language === 'ru' ? 'Заметка удалена' : language === 'en' ? 'Note cleared' : 'Նշումը մաքրվեց'));
    setTimeout(() => setFavMsg(''), 1800);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (pedalMode && e.key === 'ArrowDown')) {
        if (pedalMode) {
          const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48;
          if (!nearBottom) {
            e.preventDefault();
            window.scrollBy({ top: Math.round(window.innerHeight * 0.65), behavior: 'smooth' });
            return;
          }
        }
        if (setlistNavData?.next) {
          e.preventDefault();
          navigateToSetlistSong(setlistNavData.next);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (pedalMode && e.key === 'ArrowUp')) {
        if (pedalMode) {
          if (window.scrollY > 48) {
            e.preventDefault();
            window.scrollBy({ top: -Math.round(window.innerHeight * 0.65), behavior: 'smooth' });
            return;
          }
        }
        if (setlistNavData?.prev) {
          e.preventDefault();
          navigateToSetlistSong(setlistNavData.prev);
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        setAutoScrollActive(a => !a);
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleStageFullscreen();
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (hasChords && hasLyrics) {
          handleViewModeChange(effectiveViewMode === 'lyrics' ? defaultChordsViewMode : 'lyrics');
        }
      } else if (e.key === '[' || e.key === '-') {
        if (e.shiftKey) {
          e.preventDefault();
          decreaseFontSize();
        } else {
          e.preventDefault();
          userManuallyAdjustedKeyRef.current = true;
          setSemi(prev => prev - 1);
        }
      } else if (e.key === ']' || e.key === '=' || e.key === '+') {
        if (e.shiftKey) {
          e.preventDefault();
          increaseFontSize();
        } else {
          e.preventDefault();
          userManuallyAdjustedKeyRef.current = true;
          setSemi(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setlistNavData, effectiveViewMode, defaultChordsViewMode, hasChords, hasLyrics, pedalMode]);

  if (loading || (!song && authLoading)) {
    return <SongViewSkeleton />;
  }

  if (error || !song) {
    return (
      <div className="song-view-page">
        <div className="sl-placeholder empty-state animate-fade-in">
          <p style={{color: 'var(--color-accent-red)'}}>{error}</p>
          <button className="btn btn-secondary" data-native-route-back="true" onClick={handleSongBack} style={{marginTop: '16px'}}>{t('songView.back')}</button>
        </div>
      </div>
    );
  }

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0] && e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null || touchStartY === null) return;
    if (popoverChord || isShareModalOpen || isSetlistModalOpen || isPrintOpen) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    if (!touch) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && setlistNavData?.next) {
        navigateToSetlistSong(setlistNavData.next);
      } else if (diffX < 0 && setlistNavData?.prev) {
        navigateToSetlistSong(setlistNavData.prev);
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleTouchCancel = () => {
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <>
    <div key={id} className={`song-view-page ${setlistNavData ? 'has-seq-nav' : ''} ${!isPWA ? 'web-song-pro' : ''} ${isStageFullscreen ? 'is-stage-fullscreen' : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}>
      {/* Top Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <button
            type="button"
            className="icon-btn sv-back-btn"
            data-native-route-back="true"
            onClick={handleSongBack}
            aria-label={t('songView.back', 'Հետ գնալ')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="sv-title-area">
            <h1 className="sv-title">{displayTitle}</h1>
            {song.artist && <p className="sv-artist">{song.artist}</p>}
          </div>
        </div>

        <div className="sv-header-actions">
          <button
            type="button"
            className={`icon-btn ${isFavorite ? 'active sv-fav-active' : ''}`}
            onClick={toggleFavorite}
            title={isFavorite ? t('songView.removeFav') : t('songView.addFav')}
            aria-label={isFavorite ? t('songView.removeFav') : t('songView.addFav')}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={openSetlistModal}
            title={t('songView.addToSetlist', 'Ավելացնել երգացանկում')}
            aria-label={t('songView.addToSetlist', 'Ավելացնել երգացանկում')}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="16" y1="16" x2="16" y2="22" />
              <line x1="13" y1="19" x2="19" y2="19" />
            </svg>
          </button>

          <button
            type="button"
            className={`icon-btn sv-stage-btn ${isStageFullscreen ? 'active sv-stage-active' : ''}`}
            onClick={() => {
              triggerHaptic();
              toggleStageFullscreen();
            }}
            title={language === 'ru' ? 'Сценический режим' : language === 'en' ? 'Stage Mode' : 'Բեմական ռեժիմ'}
            aria-label={language === 'ru' ? 'Сценический режим' : language === 'en' ? 'Stage Mode' : 'Բեմական ռեժիմ'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>

          <div className="sv-tools-menu-container">
            <button
              ref={toolsBtnRef}
              type="button"
              className={`icon-btn sv-tools-menu-btn ${isToolsMenuOpen ? 'active' : ''}`}
              onClick={toggleToolsMenu}
              title={language === 'ru' ? 'Ещё' : language === 'en' ? 'More' : 'Ավելին'}
              aria-label={language === 'ru' ? 'Ещё' : language === 'en' ? 'More' : 'Ավելին'}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Meta & Quick Controls Bar */}
      <div className="sv-meta-row">
        <div className="sv-meta-left">
          {hasChords && (
            <button
              type="button"
              className={`sv-meta-pill key-pill sv-meta-clickable ${showToneCapo ? 'is-open' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setShowToneCapo((v) => !v);
              }}
              title={t('songView.transpose', 'Տոնայնություն և Կապո')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>{soundingKey || song.song_key || '—'}</span>
              {capo > 0 && <span className="sv-meta-sub">· C{capo}</span>}
              <svg className={`sv-meta-caret-svg ${showToneCapo ? 'is-open' : ''}`} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}

          <button
            type="button"
            className={`sv-meta-pill sv-meta-clickable ${showInlineMetronome ? 'is-open' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setShowInlineMetronome((v) => !v);
            }}
            title={language === 'ru' ? 'Метроном' : language === 'en' ? 'Metronome' : 'Մետրոնոմ'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L5 21h14L12 2z" />
              <line x1="12" y1="15" x2="17" y2="7" />
            </svg>
            <span>{Number.parseInt(song.bpm, 10) > 0 ? `${song.bpm} BPM` : 'BPM'}</span>
          </button>

          {pedalMode && (
            <button
              type="button"
              className="sv-meta-pill sv-meta-clickable is-open"
              onClick={() => {
                setPedalMode(false);
                localStorage.setItem('wp_pedal_mode_v1', 'false');
              }}
              title={language === 'ru' ? 'Отключить Bluetooth педаль' : language === 'en' ? 'Disable Bluetooth Pedal' : 'Անջատել Bluetooth ոտնակը'}
            >
              <span>{language === 'ru' ? 'Педаль' : language === 'en' ? 'Pedal' : 'Ոտնակ'} •</span>
            </button>
          )}
        </div>

        <div className="sv-quick-font" aria-label={t('songView.fontSize', 'Տառաչափ')}>
          <button
            type="button"
            className="sv-quick-font-btn"
            onClick={() => {
              triggerHaptic();
              decreaseFontSize();
            }}
            disabled={fontSize <= 14}
            aria-label="Փոքրացնել տառաչափը"
          >
            A−
          </button>
          <span className="sv-quick-font-val">{fontSize}</span>
          <button
            type="button"
            className="sv-quick-font-btn"
            onClick={() => {
              triggerHaptic();
              increaseFontSize();
            }}
            disabled={fontSize >= 40}
            aria-label="Մեծացնել տառաչափը"
          >
            A+
          </button>
          {hasChords && effectiveViewMode !== 'lyrics' && (
            <div className="sv-chord-scale-toggle" title="Ակկորդների չափ">
              <button
                type="button"
                className="sv-quick-font-btn chord-scale-btn"
                onClick={decreaseChordScale}
                disabled={chordScale <= 0.8}
                aria-label="Փոքրացնել ակկորդները"
              >
                C−
              </button>
              <span className="sv-quick-font-val chord-scale-val">{Math.round(chordScale * 100)}%</span>
              <button
                type="button"
                className="sv-quick-font-btn chord-scale-btn"
                onClick={increaseChordScale}
                disabled={chordScale >= 1.6}
                aria-label="Մեծացնել ակկորդները"
              >
                C+
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Consistent 3-Tab View Mode Segmented Control */}
      <div className="sv-segment-control-wrap">
        <SegmentedControl
          className="wp-glisse-segmented-3"
          aria-label="Song view mode"
          items={viewModeTabs.map((tab) => ({ value: tab.id, label: tab.label }))}
          value={effectiveViewMode}
          onValueChange={(val) => {
            if (val) handleViewModeChange(val);
          }}
        />
      </div>

      {/* Stage Modules Container (Single Unified Key & Capo Card + Inline Metronome + Stems) */}
      {((showToneCapo && hasChords) || showInlineMetronome || (stemsOpen && isEnabled('rehearsal_stems'))) && (
        <div className="sv-stage-modules">
          {showToneCapo && hasChords && (
            <section className="sv-tone-capo-card">
              <div className="sv-tone-capo-head">
                <span>{language === 'ru' ? 'ТОН И КАПО' : language === 'en' ? 'KEY & CAPO' : 'ՏՈՆԱՅՆՈՒԹՅՈՒՆ ԵՎ ԿԱՊՈ'}</span>
                <div className="sv-tone-capo-head-actions">
                  <button
                    type="button"
                    className={`sv-tone-flats-btn ${useFlats ? 'active' : ''}`}
                    onClick={() => setUseFlats((f) => !f)}
                  >
                    {useFlats ? '♭ Flats' : '♯ Sharps'}
                  </button>
                  {(semi !== 0 || capo !== 0) && (
                    <button
                      type="button"
                      className="sv-tone-reset"
                      onClick={() => {
                        userManuallyAdjustedKeyRef.current = true;
                        setSemi(0);
                        applyManualCapo(0);
                      }}
                    >
                      {language === 'ru' ? 'Сброс' : language === 'en' ? 'Reset' : 'Վերակայել'}
                    </button>
                  )}
                </div>
              </div>
              <div className="sv-tone-keys-grid">
                {KEYS.map((k) => {
                  const displayK = getTransposedFullKey(k, 0);
                  const isActive = soundingKey ? songKeysEqual(soundingKey, k) : false;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`sv-tone-key-chip ${isActive ? 'active' : ''}`}
                      onClick={() => handleKeyClick(displayK)}
                    >
                      {displayK}
                    </button>
                  );
                })}
              </div>
              <div className="sv-capo-chips-row">
                <span className="sv-capo-label">Capo:</span>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((cVal) => (
                  <button
                    key={cVal}
                    type="button"
                    className={`sv-capo-chip ${capo === cVal ? 'active' : ''}`}
                    onClick={() => {
                      triggerSelectionHaptic();
                      applyManualCapo(cVal);
                    }}
                  >
                    {cVal === 0 ? 'Off' : cVal}
                  </button>
                ))}
              </div>
              {capo > 0 && (
                <div className="sv-capo-calculator-card">
                  <span className="sv-capo-calc-icon">🎸</span>
                  <div className="sv-capo-calc-text">
                    <strong>Capo {capo}</strong> · {language === 'ru' ? 'Аппликатура аккордов' : language === 'en' ? 'Play chord shapes' : 'Նվագել ակկորդների ձևով'}՝ <strong>{playingKey}</strong> ({language === 'ru' ? 'звучит как' : language === 'en' ? 'sounds as' : 'հնչում է'} <strong>{soundingKey}</strong>)
                  </div>
                </div>
              )}
            </section>
          )}

          {showInlineMetronome && (
            <div className="sv-inline-metronome-wrap">
              <SmartMetronome
                initialBpm={Number.parseInt(song?.bpm, 10) || 120}
                compact
                enableScreenPulse
              />
            </div>
          )}

          {stemsOpen && isEnabled('rehearsal_stems') && (
            <Suspense fallback={null}>
              <SongStemsMixer
                songTitle={displayTitle}
                songKey={soundingKey || song?.song_key || 'C'}
                initialBpm={song?.bpm || 120}
                audioUrl={resolveMediaUrl(song?.audio_url || (song?.attachments?.[0]?.url))}
                onClose={() => setStemsOpen(false)}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Personal Musician Stage Note (collapsible inline editor / crisp banner when saved) */}
      {(showNoteEditor || personalNote) && (
        <div className="sv-personal-note-box">
          {showNoteEditor ? (
            <div className="sv-personal-note-editor">
              <div className="sv-personal-note-head">
                <span>
                  {language === 'ru' ? 'Личная заметка' : language === 'en' ? 'Personal Stage Note' : 'Իմ բեմական նշումը'}
                </span>
                <button type="button" className="sv-tone-reset" onClick={() => setShowNoteEditor(false)}>
                  {language === 'ru' ? 'Отмена' : language === 'en' ? 'Cancel' : 'Չեղարկել'}
                </button>
              </div>
              <textarea
                className="sv-personal-note-input"
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={language === 'ru' ? 'Напр.: начать с пианино, припев 2×...' : language === 'en' ? 'e.g. Piano intro, Chorus 2×...' : 'Օր.՝ սկսել դաշնամուրով, կրկներգը 2×...'}
                autoFocus
              />
              <div className="sv-personal-note-actions">
                {personalNote && (
                  <button
                    type="button"
                    className="sv-note-clear-btn"
                    onClick={() => {
                      setNoteDraft('');
                      setPersonalNote('');
                      try { localStorage.removeItem(`wp_song_note_${id}`); } catch {}
                      setShowNoteEditor(false);
                    }}
                  >
                    {language === 'ru' ? 'Удалить' : language === 'en' ? 'Delete' : 'Ջնջել'}
                  </button>
                )}
                <button type="button" className="sv-note-save-btn" onClick={handleSavePersonalNote}>
                  {language === 'ru' ? 'Сохранить' : language === 'en' ? 'Save' : 'Պահպանել'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="sv-personal-note-banner"
              onClick={() => {
                setNoteDraft(personalNote);
                setShowNoteEditor(true);
              }}
              title={language === 'ru' ? 'Редактировать заметку' : language === 'en' ? 'Edit note' : 'Խմբագրել նշումը'}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>{personalNote}</span>
            </button>
          )}
        </div>
      )}

      {/* Color-Coded Song Arrangement Ribbon (Auto-highlights active section on scroll) */}
      {arrangementSections.length >= 2 && (
        <div ref={ribbonRef} className="sv-arrangement-ribbon" aria-label="Երգի կառուցվածք">
          {arrangementSections.map((sec, idx) => (
            <button
              key={`${sec.label}_${idx}`}
              type="button"
              className={`sv-arr-pill ${activeSectionIdx === idx ? 'is-active' : ''}`}
              style={{ '--arr-color': sec.color }}
              title={sec.label}
              onClick={() => {
                setActiveSectionIdx(idx);
                const sheetEl = sheetRef.current || document.querySelector('.sv-sheet');
                if (sheetEl) {
                  const rect = sheetEl.getBoundingClientRect();
                  const absTop = rect.top + window.scrollY;
                  const targetY = absTop + Math.max(0, sheetEl.scrollHeight * sec.ratio - 90);
                  window.scrollTo({ top: targetY, behavior: 'smooth' });
                }
              }}
            >
              <span className="sv-arr-badge">{sec.short}</span>
              <span className="sv-arr-name">{sec.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sheet Music / Lyrics Content */}
      <div
        ref={sheetRef}
        className={`sv-sheet ${effectiveViewMode === 'lyrics' ? 'lyrics-mode' : ''} ${isTwoColumn ? 'web-two-column' : ''}`}
        style={{ fontSize: `${fontSize}px`, '--song-chord-color': chordColor || '#ffffff', '--song-chord-size': `${chordScale}em` }}
        onMouseOver={openChordPopover}
        onMouseOut={closeChordPopover}
        onClick={openChordPopover}
      >
        {effectiveViewMode === 'chords' ? (
          hasChords ? (
            <pre className="chords-block" style={{ '--song-chord-color': chordColor || '#ffffff' }} dangerouslySetInnerHTML={{ __html: currentChords }} />
          ) : (
            <p className="sv-empty-mode-msg">
              {language === 'ru' ? 'Аккорды недоступны' : language === 'en' ? 'Chords are unavailable' : 'Ակորդները հասանելի չեն'}
            </p>
          )
        ) : effectiveViewMode === 'both' ? (
          hasChords && hasLyrics ? (
            <>
              <pre className="chords-block" style={{ '--song-chord-color': chordColor || '#ffffff' }} dangerouslySetInnerHTML={{ __html: currentChords }} />
              <div className="sv-divider"></div>
              <pre className="lyrics-block" dangerouslySetInnerHTML={{ __html: renderLyricsWithStageNotes(currentLyrics) }} />
            </>
          ) : hasChords ? (
            <>
              <pre className="chords-block" style={{ '--song-chord-color': chordColor || '#ffffff' }} dangerouslySetInnerHTML={{ __html: currentChords }} />
              <div className="sv-divider"></div>
              <p className="sv-empty-mode-msg">{t('songView.noLyrics', 'Բառերը հասանելի չեն')}</p>
            </>
          ) : hasLyrics ? (
            <pre className="lyrics-block" dangerouslySetInnerHTML={{ __html: renderLyricsWithStageNotes(currentLyrics) }} />
          ) : (
            <p className="sv-empty-mode-msg">{t('songView.noLyrics', 'Բառերը հասանելի չեն')}</p>
          )
        ) : hasLyrics ? (
          <pre className="lyrics-block">{stripStageNotes(currentLyrics)}</pre>
        ) : (
          <p className="sv-empty-mode-msg">{t('songView.noLyrics', 'Բառերը հասանելի չեն')}</p>
        )}
      </div>

      {/* Attachments & Media UI — rendered ONLY when media attachments exist */}
      {song.attachments?.length > 0 && (
        <div className="sv-pwa-media-section sv-attachments">
          <div className="sv-pwa-media-header">
            <div className="sv-pwa-media-title-group">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
              <h3>{t('songView.mediaAndMaterials', 'Մեդիա և նյութեր')}</h3>
              <span className="sv-pwa-media-count">{song.attachments.length}</span>
            </div>
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <button
                type="button"
                onClick={promptAddAttachment}
                className="sv-pwa-media-add-inline"
                title="Ավելացնել նյութ"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>

          <div className="sv-pwa-media-list">
            {song.attachments.map(att => {
              const attType = getAttachmentType(att);
              const resolvedUrl = resolveMediaUrl(att.url);
              const embedUrl = getYouTubeEmbedUrl(att.url);
              const driveEmbedUrl = getGoogleDriveEmbedUrl(att.url);
              const isEmbedActive = activeEmbedId === att.id;

              return (
                <div key={att.id} className="sv-pwa-media-card-item">
                  <div className="sv-pwa-media-item-main">
                    <div className={`sv-pwa-media-icon-badge ${attType}`}>
                      {attType === 'youtube' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      )}
                      {attType === 'audio' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                      {attType === 'video' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      )}
                      {attType === 'drive' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                      {attType === 'image' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                      )}
                      {attType === 'link' && (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      )}
                    </div>

                    <div className="sv-pwa-media-info">
                      <span className="sv-pwa-media-title">{att.title || 'Բացել նյութը'}</span>
                      <span className="sv-pwa-media-sub">
                        {attType === 'youtube'
                          ? 'YouTube'
                          : attType === 'audio'
                          ? 'Աուդիո'
                          : attType === 'video'
                          ? 'Տեսանյութ'
                          : attType === 'drive'
                          ? 'Փաստաթուղթ'
                          : attType === 'image'
                          ? 'Նկար'
                          : 'Հղում'}
                      </span>
                    </div>

                    <div className="sv-pwa-media-actions">
                      {(embedUrl || driveEmbedUrl || (!embedUrl && !driveEmbedUrl && attType === 'video')) && (
                        <button
                          type="button"
                          className={`sv-pwa-media-btn ${isEmbedActive ? 'active' : ''}`}
                          onClick={() => setActiveEmbedId(isEmbedActive ? null : att.id)}
                          title={isEmbedActive ? 'Փակել' : 'Դիտել'}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            {isEmbedActive ? (
                              <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </>
                            ) : (
                              <polygon points="5 3 19 12 5 21 5 3" />
                            )}
                          </svg>
                          <span>{isEmbedActive ? 'Փակել' : 'Դիտել'}</span>
                        </button>
                      )}

                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sv-pwa-media-btn sv-pwa-media-ext-btn"
                        title="Բացել նոր պատուհանում"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>

                      {(user?.role === 'admin' || user?.role === 'owner') && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="sv-pwa-media-btn sv-pwa-media-del-btn"
                          title="Հեռացնել"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Pro Audio Player for Audio Tracks with Rehearsal A-B Looper */}
                  {!embedUrl && !driveEmbedUrl && attType === 'audio' && (
                    <div className="sv-pwa-media-audio-box sv-pro-audio-box">
                      <div className="sv-pro-audio-top">
                        <button
                          type="button"
                          className="sv-pro-play-btn"
                          onClick={() => {
                            triggerHaptic();
                            if (songAudio.track?.audioUrl === resolvedUrl && songAudio.isPlaying) {
                              songAudio.pauseTrack();
                            } else {
                              songAudio.playTrack({
                                songId: song.id,
                                title: displayTitle,
                                artist: song.artist,
                                audioUrl: resolvedUrl,
                              });
                            }
                          }}
                          aria-label={songAudio.track?.audioUrl === resolvedUrl && songAudio.isPlaying ? 'Դադարեցնել' : 'Նվագարկել'}
                        >
                          {songAudio.track?.audioUrl === resolvedUrl && songAudio.isPlaying ? (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <rect x="6" y="4" width="4" height="16" rx="1.5" />
                              <rect x="14" y="4" width="4" height="16" rx="1.5" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>
                        <div className="sv-pro-audio-info">
                          <span className="sv-pro-audio-name">{att.title || 'Ձայնագրություն'}</span>
                          <span className="sv-pro-audio-times">
                            {songAudio.track?.audioUrl === resolvedUrl
                              ? `${Math.floor(songAudio.currentTime / 60)}:${String(Math.floor(songAudio.currentTime % 60)).padStart(2, '0')} / ${Math.floor(songAudio.duration / 60)}:${String(Math.floor(songAudio.duration % 60)).padStart(2, '0')}`
                              : 'Աուդիո նվագարկիչ'}
                          </span>
                        </div>
                      </div>

                      {songAudio.track?.audioUrl === resolvedUrl && (
                        <>
                          <input
                            type="range"
                            min="0"
                            max={songAudio.duration || 100}
                            step="0.1"
                            value={songAudio.currentTime || 0}
                            onChange={(e) => songAudio.seek(Number(e.target.value))}
                            className="sv-pro-audio-slider"
                          />
                          <div className="sv-pro-audio-looper">
                            <span className="sv-looper-label">🔁 A-B Կրկնություն:</span>
                            <button
                              type="button"
                              className={`sv-loop-btn ${songAudio.loopA !== null ? 'active' : ''}`}
                              onClick={() => {
                                triggerHaptic();
                                songAudio.setLoopA(songAudio.currentTime);
                              }}
                            >
                              {songAudio.loopA !== null ? `A: ${Math.floor(songAudio.loopA)}վ` : 'Դնել A'}
                            </button>
                            <button
                              type="button"
                              className={`sv-loop-btn ${songAudio.loopB !== null ? 'active' : ''}`}
                              onClick={() => {
                                triggerHaptic();
                                songAudio.setLoopB(songAudio.currentTime);
                              }}
                            >
                              {songAudio.loopB !== null ? `B: ${Math.floor(songAudio.loopB)}վ` : 'Դնել B'}
                            </button>
                            {songAudio.loopA !== null && songAudio.loopB !== null && (
                              <button
                                type="button"
                                className={`sv-loop-btn loop-toggle ${songAudio.isLoopActive ? 'is-looping' : ''}`}
                                onClick={() => {
                                  triggerHaptic();
                                  songAudio.toggleLoop();
                                }}
                              >
                                {songAudio.isLoopActive ? '✓ Կրկնվում է' : 'Միացնել'}
                              </button>
                            )}
                            {(songAudio.loopA !== null || songAudio.loopB !== null) && (
                              <button
                                type="button"
                                className="sv-loop-clear"
                                onClick={() => {
                                  triggerHaptic();
                                  songAudio.clearLoop();
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Inline Video Player ONLY for local/direct video files */}
                  {!embedUrl && !driveEmbedUrl && attType === 'video' && isEmbedActive && (
                    <div className="sv-pwa-media-video-box" style={{
                      marginTop: '10px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#000000'
                    }}>
                      <video
                        controls
                        playsInline
                        src={resolvedUrl}
                        preload="metadata"
                        style={{ width: '100%', maxHeight: '360px', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* YouTube Embed Player */}
                  {embedUrl && isEmbedActive && (
                    <div className="sv-pwa-media-player-container">
                      <iframe
                        src={embedUrl}
                        title={att.title || 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {/* Google Drive Embed Preview */}
                  {!embedUrl && driveEmbedUrl && isEmbedActive && (
                    <div className="sv-pwa-media-player-container">
                      <iframe
                        src={driveEmbedUrl}
                        title={att.title || 'Google Drive Document'}
                        allow="autoplay"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isPWA && song && (
        <SongViewWebTools
          keys={KEYS.map(k => getTransposedFullKey(k, 0))}
          activeKey={soundingKey ? getTransposedFullKey(soundingKey, 0) : ''}
          onKeyClick={handleKeyClick}
          capo={capo}
          onCapoChange={applyManualCapo}
          fontSize={fontSize}
          onDecreaseFont={decreaseFontSize}
          onIncreaseFont={increaseFontSize}
          autoScrollActive={autoScrollActive}
          autoScrollSpeed={autoScrollSpeed}
          onToggleAutoScroll={() => setAutoScrollActive(a => !a)}
          onAutoScrollSpeedChange={setAutoScrollSpeed}
          chordColor={chordColor}
          onChordColorChange={setChordColor}
          onOpenPrint={() => setIsPrintOpen(true)}
          useFlats={useFlats}
          onToggleFlats={() => setUseFlats(f => !f)}
          isTwoColumn={isTwoColumn}
          onToggleTwoColumn={toggleTwoColumn}
          keepAwakeActive={keepAwakeActive}
          onToggleKeepAwake={toggleKeepAwake}
          isStageFullscreen={isStageFullscreen}
          onToggleStageFullscreen={toggleStageFullscreen}
          viewMode={effectiveViewMode}
          onToggleViewMode={() => handleViewModeChange(effectiveViewMode === 'lyrics' ? defaultChordsViewMode : 'lyrics')}
          onOpenAIStudio={() => setIsAIStudioOpen(true)}
          onToggleStems={() => setStemsOpen(!stemsOpen)}
          stemsOpen={stemsOpen}
          songId={song?.id}
          hasChords={hasChords}
        />
      )}
      </div>

    {/* Setlist Navigation */}
    {setlistNavData && createPortal(
      <div className="seq-nav">
        <button 
          className="seq-btn" 
          disabled={!setlistNavData.prev} 
          onClick={() => navigateToSetlistSong(setlistNavData.prev)}
          aria-label={t('songView.prevSong', 'Նախորդ երգ')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div 
          className="seq-info" 
          onClick={handleSongBack}
          title={t('songView.backToSetlist', 'Վերադառնալ սեթլիստ')}
        >
          <span className="seq-count">{(setlistNavData.current?.index ?? setlistNavData.index) || 1} / {setlistNavData.total}</span>
          <span className="seq-title">{setlistNavData.setlist?.name || t('songView.setlistTitle')}</span>
        </div>
        <button 
          className="seq-btn" 
          disabled={!setlistNavData.next} 
          onClick={() => navigateToSetlistSong(setlistNavData.next)}
          aria-label={t('songView.nextSong', 'Հաջորդ երգ')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>,
      document.body
    )}

    {/* Floating / Sticky Key Save Bar (Setlists & Favorites) */}
    {((isFromSetlist && (isKeyOrCapoChangedInSetlist || keySavedFeedback)) ||
      (!isFromSetlist && isFavorite && (hasUnsavedKeyChange || favKeySavedFeedback))) && createPortal(
      <aside
        className={`sv-sticky-save-bar ${setlistNavData ? 'has-seq-nav' : ''}`}
        aria-live="polite"
      >
        <div className="sv-sticky-save-content">
          <div className="sv-sticky-save-info">
            <div className={`sv-sticky-save-badge ${(isFromSetlist ? keySavedFeedback : favKeySavedFeedback) ? 'is-success' : ''}`}>
              {(isFromSetlist ? keySavedFeedback : favKeySavedFeedback) ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              )}
            </div>
            <div className="sv-sticky-save-text">
              <span className="sv-sticky-save-title">
                {(isFromSetlist ? keySavedFeedback : favKeySavedFeedback)
                  ? t('songView.setlistKeySaved', 'Տոնայնությունը պահպանվեց')
                  : `${t('songView.newKey', 'Նոր տոնայնություն')}՝ ${soundingKey}${capo > 0 ? ` (Capo ${capo})` : ''}`}
              </span>
              <span className="sv-sticky-save-sub">
                {(isFromSetlist ? keySavedFeedback : favKeySavedFeedback)
                  ? (isFromSetlist ? t('songView.setlistInstantUpdated', 'Երգացանկն ակնթարթորեն թարմացված է') : t('songView.favsInstantUpdated', 'Պահպանվածներն ակնթարթորեն թարմացված են'))
                  : (isFromSetlist ? t('songView.clickToSaveSetlist', 'Սեղմեք՝ երգացանկում պահպանելու համար') : t('songView.clickToSaveFavs', 'Սեղմեք՝ պահպանվածներում պահելու համար'))}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`sv-sticky-save-btn ${(isFromSetlist ? keySavedFeedback : favKeySavedFeedback) ? 'is-saved' : ''}`}
            onClick={isFromSetlist ? handleSaveKeyToSetlist : handleSaveFavoriteKey}
            disabled={isFromSetlist ? savingKeyToSetlist : savingFavKey}
          >
            {(isFromSetlist ? savingKeyToSetlist : savingFavKey) ? (
              <span>{t('common.saving', 'Պահպանվում է...')}</span>
            ) : (isFromSetlist ? keySavedFeedback : favKeySavedFeedback) ? (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{t('songView.keyIsSaved', 'Պահպանված է')}</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>{t('songView.saveKey', 'Պահպանել')}</span>
              </>
            )}
          </button>
        </div>
      </aside>,
      document.body
    )}

    {/* Floating Auto-Scroll Mini Controller (only shown while active on PWA / compact screens) */}
    {autoScrollActive && createPortal(
      <div className={`sv-autoscroll-pill ${setlistNavData ? 'has-seq-nav' : ''}`} role="region" aria-label="Ավտոմատ սահք">
        <button
          type="button"
          className="sv-autoscroll-btn"
          onClick={() => setAutoScrollSpeed((s) => Math.max(0.5, Number((s - 0.2).toFixed(1))))}
          aria-label="Դանդաղեցնել"
        >
          −
        </button>
        <span className="sv-autoscroll-speed">{autoScrollSpeed.toFixed(1)}×</span>
        <button
          type="button"
          className="sv-autoscroll-btn"
          onClick={() => setAutoScrollSpeed((s) => Math.min(3.0, Number((s + 0.2).toFixed(1))))}
          aria-label="Արագացնել"
        >
          +
        </button>
        <button
          type="button"
          className="sv-autoscroll-stop"
          onClick={() => setAutoScrollActive(false)}
          aria-label="Կանգնեցնել ավտոմատ սահքը"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </button>
      </div>,
      document.body
    )}

    {/* Print Studio */}
    {!isPWA && isPrintOpen && (
      <Suspense fallback={null}>
        <PrintStudio
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          documents={[{
            id: song.id,
            title: getLocalizedTitle(song.title, language),
            artist: song.artist,
            key: soundingKey || song.song_key,
            bpm: song.bpm,
            chords: currentChords,
            lyrics: currentLyrics,
          }]}
          documentTitle={getLocalizedTitle(song.title, language)}
          defaultShowChords={effectiveViewMode !== 'lyrics'}
        />
      </Suspense>
    )}

    {popoverChord && popoverPos && (
      <ChordDiagramPopover
        chord={popoverChord}
        position={popoverPos}
        onClose={() => {
          setPopoverChord(null);
          setPopoverPos(null);
        }}
        onMouseEnter={() => setPopoverChord(popoverChord)}
        onMouseLeave={() => {
          if (!window.matchMedia('(pointer: coarse)').matches) {
            setPopoverChord(null);
            setPopoverPos(null);
          }
        }}
      />
    )}

    {favMsg && createPortal(
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(28, 28, 30, 0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        padding: '16px 32px',
        borderRadius: '100px',
        fontWeight: '600',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 2147483647,
        fontSize: '1.05rem',
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>{favMsg}</div>, 
      document.body
    )}

    {isSetlistModalOpen && createPortal(
      <div className="sv-modal-overlay" onClick={() => setIsSetlistModalOpen(false)}>
        <div className="sv-modal-content" onClick={e => e.stopPropagation()}>
          <div className="sv-modal-header">
            <div className="sv-modal-header-info">
              <h2>{t('songView.addToSetlist', 'Ավելացնել երգացանկում')}</h2>
              <div className="sv-modal-song-pill">
                <span className="sv-modal-song-pill__key">
                  Տոն՝ {soundingKey || song?.song_key || '—'}{capo > 0 ? ` (Capo ${capo})` : ''}
                </span>
              </div>
            </div>
            <button type="button" className="icon-btn sv-modal-close" onClick={() => setIsSetlistModalOpen(false)} aria-label="Փակել">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="sv-modal-toolbar">
            <div className="sv-modal-search-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                className="sv-modal-search-input"
                placeholder="Որոնել երգացանկ..."
                value={setlistSearch}
                onChange={e => setSetlistSearch(e.target.value)}
              />
              {setlistSearch && (
                <button type="button" className="sv-modal-search-clear" onClick={() => setSetlistSearch('')}>✕</button>
              )}
            </div>

            <button
              type="button"
              className={`sv-modal-new-btn ${isCreatingSetlist ? 'active' : ''}`}
              onClick={() => setIsCreatingSetlist(!isCreatingSetlist)}
            >
              {isCreatingSetlist ? 'Փակել' : '+ Նոր'}
            </button>
          </div>

          {isCreatingSetlist && (
            <form className="sv-modal-create-box" onSubmit={handleCreateAndAddSetlist}>
              <div className="sv-modal-create-row">
                <input
                  type="text"
                  className="sv-modal-create-input"
                  placeholder="Երգացանկի անուն"
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  autoFocus
                  required
                />
                <input
                  type="date"
                  className="sv-modal-create-date"
                  value={newSetDate}
                  onChange={e => setNewSetDate(e.target.value)}
                />
              </div>
              <div className="sv-modal-create-actions">
                <button
                  type="button"
                  className="sv-btn-cancel"
                  onClick={() => setIsCreatingSetlist(false)}
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  className="sv-btn-submit"
                  disabled={createSetlistLoading || !newSetName.trim()}
                >
                  {createSetlistLoading ? 'Ստեղծվում է...' : 'Ստեղծել և ավելացնել'}
                </button>
              </div>
            </form>
          )}

          <div className="sv-modal-body">
            {setlistsLoading ? (
              <ModalListSkeleton rows={4} />
            ) : filteredSetlists.length > 0 ? (
              filteredSetlists.map(sl => {
                const isAdded = !!addedSetlistIds[sl.id];
                const isAdding = addingSetlistId === sl.id;
                const dateLabel = formatSetlistDate(sl.service_date, language);

                return (
                  <div
                    key={sl.id}
                    className={`sv-setlist-row ${isAdded ? 'is-added' : ''}`}
                    onClick={() => !isAdding && !isAdded && addToSetlist(sl.id)}
                  >
                    <div className="sv-setlist-row__info">
                      <div className="sv-setlist-row__title-wrap">
                        <span className="sv-setlist-row__name">{sl.name}</span>
                        {sl.team_name && (
                          <span className="sv-setlist-row__team-pill">{sl.team_name}</span>
                        )}
                      </div>
                      <div className="sv-setlist-row__meta">
                        {dateLabel && (
                          <span className="sv-setlist-row__date">{dateLabel}</span>
                        )}
                        <span className="sv-setlist-row__count">{sl.items_count || 0} երգ</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`sv-setlist-row__btn ${isAdded ? 'added' : ''}`}
                      disabled={isAdding || isAdded}
                    >
                      {isAdding ? (
                        <div className="loading-spinner-sm" />
                      ) : isAdded ? (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          <span>Ավելացվեց</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          <span>Ավելացնել</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="sv-modal-empty">
                <span>{setlistSearch ? 'Երգացանկեր չեն գտնվել' : 'Դեռ երգացանկեր չկան:'}</span>
                {!isCreatingSetlist && (
                  <button
                    type="button"
                    className="sv-empty-create-btn"
                    onClick={() => setIsCreatingSetlist(true)}
                  >
                    + Ստեղծել նոր երգացանկ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

    {isShareModalOpen && createPortal(
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }} onClick={() => setIsShareModalOpen(false)}>
        <div style={{
          background: 'var(--native-surface-elevated, #1a1a2e)',
          border: '1px solid var(--native-hairline-strong, rgba(255,255,255,0.1))',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--native-hairline, rgba(255,255,255,0.1))', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--native-text, #fff)' }}>{t('chat.send', 'Ուղարկել Չաթով')}</h3>
            <button onClick={() => setIsShareModalOpen(false)} style={{ background: 'var(--native-surface-2, rgba(255,255,255,0.1))', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--native-text, #fff)' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shareLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--native-text-2, #aaa)' }}>Loading...</div>
            ) : shareChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--native-text-2, #aaa)' }}>{t('chat.emptySubtitle', 'Չաթեր չկան')}</div>
            ) : (
              shareChats.map(chat => (
                <div key={chat.id} onClick={() => handleShareToChat(chat.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px', background: 'var(--native-surface-2, rgba(255,255,255,0.06))', border: '1px solid var(--native-hairline, transparent)', cursor: 'pointer' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--native-accent-grad, rgba(255,255,255,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--native-accent-on, #fff)', fontSize: '1rem', flexShrink: 0 }}>
                    {chat.type === 'group' ? (chat.name ? chat.name.charAt(0).toUpperCase() : 'G') : (chat.participant_names ? chat.participant_names.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--native-text, #fff)', fontSize: '0.95rem' }}>
                    {chat.type === 'group' ? chat.name : chat.participant_names}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

      {/* Clean Song Actions & Stage Tools Sheet (•••) */}
      {isToolsMenuOpen && createPortal(
        <div className="sv-tools-portal-overlay" onClick={() => setIsToolsMenuOpen(false)}>
          <div
            className="sv-tools-dropdown-menu sv-tools-dropdown-portal"
            style={!isPWA ? {
              top: `${toolsMenuPos.top}px`,
              right: `${toolsMenuPos.right}px`,
            } : undefined}
            onClick={e => e.stopPropagation()}
          >
            <div className="sv-tools-dropdown-header">
              <span>{language === 'ru' ? 'Действия с песней' : language === 'en' ? 'Song Actions' : 'Երգի գործողություններ'}</span>
              <button type="button" onClick={() => setIsToolsMenuOpen(false)} aria-label="Փակել">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="sv-tools-dropdown-items">
              <button
                type="button"
                className="sv-tools-menu-item"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  copyShareLink();
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{t('songView.copyLink', 'Կիսվել հղումով')}</strong>
                </div>
              </button>

              <button
                type="button"
                className="sv-tools-menu-item"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  openShareModal();
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{t('chat.send', 'Ուղարկել չաթով')}</strong>
                </div>
              </button>

              <button
                type="button"
                className="sv-tools-menu-item"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  copySongContent();
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{t('songView.copyContent', 'Պատճենել տեքստը')}</strong>
                </div>
              </button>

              <button
                type="button"
                className={`sv-tools-menu-item sv-tools-compact-only ${autoScrollActive ? 'is-active' : ''}`}
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setAutoScrollActive((a) => !a);
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {autoScrollActive ? (
                      <>
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </>
                    ) : (
                      <polygon points="5 3 19 12 5 21 5 3" />
                    )}
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{language === 'ru' ? 'Автопрокрутка' : language === 'en' ? 'Auto-scroll' : 'Ավտոմատ սահք'}</strong>
                </div>
                {autoScrollActive && <span className="sv-tools-status-pill">ON</span>}
              </button>

              <button
                type="button"
                className={`sv-tools-menu-item sv-tools-compact-only ${keepAwakeActive ? 'is-active' : ''}`}
                onClick={() => {
                  toggleKeepAwake();
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{language === 'ru' ? 'Не гасить экран' : language === 'en' ? 'Keep Screen Awake' : 'Էկրանը պահել վառ'}</strong>
                </div>
                {keepAwakeActive && <span className="sv-tools-status-pill">ON</span>}
              </button>

              <button
                type="button"
                className={`sv-tools-menu-item ${pedalMode ? 'is-active' : ''}`}
                onClick={() => {
                  setPedalMode((v) => {
                    const next = !v;
                    localStorage.setItem('wp_pedal_mode_v1', String(next));
                    return next;
                  });
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="3" />
                    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{language === 'ru' ? 'Bluetooth педаль' : language === 'en' ? 'Bluetooth Pedal' : 'Bluetooth ոտնակ'}</strong>
                  <small>{language === 'ru' ? 'PageUp / PageDown / Стрелки' : language === 'en' ? 'PageUp / PageDown / Arrows' : 'Էջաթերթում ստեղներով'}</small>
                </div>
                {pedalMode && <span className="sv-tools-status-pill">ON</span>}
              </button>

              {!isPWA && (
                <button
                  type="button"
                  className="sv-tools-menu-item sv-tools-compact-web-only"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setIsPrintOpen(true);
                  }}
                >
                  <span className="sv-tools-item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9V2h12v7" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  </span>
                  <div className="sv-tools-item-text">
                    <strong>Print & PDF Studio</strong>
                  </div>
                </button>
              )}

              <button
                type="button"
                className={`sv-tools-menu-item ${personalNote ? 'is-active' : ''}`}
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setNoteDraft(personalNote);
                  setShowNoteEditor(true);
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{language === 'ru' ? 'Моя заметка к песне' : language === 'en' ? 'Personal Stage Note' : 'Իմ նշումը երգի համար'}</strong>
                  <small>{language === 'ru' ? 'Видно только вам на этом устройстве' : language === 'en' ? 'Private cue saved on this device' : 'Պահվում է միայն քո սարքում'}</small>
                </div>
                {personalNote && <span className="sv-tools-status-pill">ON</span>}
              </button>

              <button
                type="button"
                className="sv-tools-menu-item"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  navigate(`/song-request?song_id=${song.id}`);
                }}
              >
                <span className="sv-tools-item-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
                <div className="sv-tools-item-text">
                  <strong>{t('songView.requestEdit', 'Առաջարկել խմբագրում')}</strong>
                </div>
              </button>

              {(user?.role === 'admin' || user?.role === 'owner') && (
                <button
                  type="button"
                  className="sv-tools-menu-item"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    promptAddAttachment();
                  }}
                >
                  <span className="sv-tools-item-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>
                  <div className="sv-tools-item-text">
                    <strong>Ավելացնել մեդիա նյութ</strong>
                  </div>
                </button>
              )}

              {(isVisible('pro_studio') || isVisible('rehearsal_stems') || isVisible('worship_ai_studio') || isVisible('lyrics_projection')) && (
                <>
                  <div className="sv-tools-section-label">
                    {language === 'ru' ? 'Сценические инструменты' : language === 'en' ? 'Stage & Studio' : 'Բեմական գործիքներ'}
                  </div>

                  {isVisible('rehearsal_stems') && (
                    <button
                      type="button"
                      className={`sv-tools-menu-item sv-tools-compact-only ${isSoon('rehearsal_stems') ? 'is-disabled' : ''} ${stemsOpen ? 'is-active' : ''}`}
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        if (isSoon('rehearsal_stems')) {
                          alert('RehearsalMix & Stems միքսերը շուտով հասանելի կլինի ծրագրում։');
                          return;
                        }
                        setStemsOpen(v => !v);
                      }}
                    >
                      <span className="sv-tools-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                      </span>
                      <div className="sv-tools-item-text">
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {stemsOpen ? 'Փակել Stems Միքշերը' : 'RehearsalMix & Stems'}
                          {isSoon('rehearsal_stems') ? <ComingSoonBadge /> : (isBeta('rehearsal_stems') && <BetaBadge />)}
                        </strong>
                        <small>Բազմաթրեկ միքշեր</small>
                      </div>
                    </button>
                  )}

                  {isVisible('worship_ai_studio') && (
                    <button
                      type="button"
                      className={`sv-tools-menu-item sv-tools-compact-only ${isSoon('worship_ai_studio') ? 'is-disabled' : ''}`}
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        if (isSoon('worship_ai_studio')) {
                          alert('Worship AI Studio-ն շուտով հասանելի կլինի ծրագրում։');
                          return;
                        }
                        setIsAIStudioOpen(true);
                      }}
                    >
                      <span className="sv-tools-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
                        </svg>
                      </span>
                      <div className="sv-tools-item-text">
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Worship AI Studio
                          {isSoon('worship_ai_studio') ? <ComingSoonBadge /> : (isBeta('worship_ai_studio') && <BetaBadge />)}
                        </strong>
                        <small>Ակորդների գեներացում և հարստացում</small>
                      </div>
                    </button>
                  )}

                  {isVisible('lyrics_projection') && (
                    <button
                      type="button"
                      className={`sv-tools-menu-item sv-tools-compact-only ${isSoon('lyrics_projection') ? 'is-disabled' : ''}`}
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        if (isSoon('lyrics_projection')) {
                          alert('Live Projection & OBS համակարգը շուտով հասանելի կլինի ծրագրում։');
                          return;
                        }
                        window.open(`/projection/${song.id}`, '_blank');
                      }}
                    >
                      <span className="sv-tools-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </span>
                      <div className="sv-tools-item-text">
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Live Projection & OBS
                          {isSoon('lyrics_projection') ? <ComingSoonBadge /> : (isBeta('lyrics_projection') && <BetaBadge />)}
                        </strong>
                        <small>Դահլիճի պրոյեկտոր և ուղիղ եթեր</small>
                      </div>
                    </button>
                  )}

                  {isVisible('pro_studio') && (
                    <button
                      type="button"
                      className={`sv-tools-menu-item ${isSoon('pro_studio') ? 'is-disabled is-disabled-soon' : ''}`}
                      disabled={isSoon('pro_studio')}
                      onClick={() => {
                        if (isSoon('pro_studio')) return;
                        setIsToolsMenuOpen(false);
                        navigate('/studio?song=' + (song?.id || id));
                      }}
                      style={isSoon('pro_studio') ? { opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                    >
                      <span className="sv-tools-item-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                        </svg>
                      </span>
                      <div className="sv-tools-item-text">
                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Pro Studio Hub
                          {isSoon('pro_studio') ? (
                            <ComingSoonBadge />
                          ) : (
                            (isBeta('pro_studio') || isBeta('rehearsal_stems') || isBeta('lyrics_projection') || isBeta('live_stage_follower')) && <BetaBadge />
                          )}
                        </strong>
                        <small>Բեմական գործիքների կենտրոն</small>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isAIStudioOpen && (
        <Suspense fallback={null}>
          <WorshipAIStudioModal
            isOpen={isAIStudioOpen}
            onClose={() => setIsAIStudioOpen(false)}
            songTitle={displayTitle}
            songKey={soundingKey || song?.song_key || 'C'}
            lyrics={currentLyrics}
            chords={song?.chords || ''}
            onApplyResult={(newText, modeType) => {
              if (modeType === 'chords' || modeType === 'stylize' || newText.includes('[') || /^[A-G][#b]?/.test(newText)) {
                setSong(prev => ({ ...prev, chords: newText }));
                setViewMode('chords');
              } else {
                setSong(prev => ({ ...prev, lyrics: newText }));
              }
            }}
          />
        </Suspense>
      )}

      {/* Floating Exit Button for Stage Mode */}
      {isStageFullscreen && createPortal(
        <button
          type="button"
          className="sv-stage-floating-exit"
          onClick={() => {
            triggerHaptic();
            toggleStageFullscreen();
          }}
          aria-label="Դուրս գալ բեմական ռեժիմից"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>{language === 'ru' ? 'Выйти со сцены' : language === 'en' ? 'Exit Stage' : 'Դուրս գալ բեմից'}</span>
        </button>,
        document.body
      )}

    </>
  );
}
