import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { useFeatureFlags } from '../utils/featureFlags';
import { useIsPWA } from '../hooks/useIsPWA';
import { BetaBadge, BetaBanner, FeatureDisabledScreen } from '../components/BetaBadge';
import { liveStageSync } from '../utils/liveStageSync';
import SongStemsMixer from '../components/SongStemsMixer';
import LiveStageBar from '../components/LiveStageBar';
import SmartMetronome from '../components/SmartMetronome';
import WorshipAIStudioModal from '../components/WorshipAIStudioModal';
import ServicePlanner from './ServicePlanner';
import './WorshipStudioHub.css';

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PAD_KEYS = [
  { key: 'C', freq: 130.81 },
  { key: 'C#', freq: 138.59 },
  { key: 'D', freq: 146.83 },
  { key: 'Eb', freq: 155.56 },
  { key: 'E', freq: 164.81 },
  { key: 'F', freq: 174.61 },
  { key: 'F#', freq: 185.0 },
  { key: 'G', freq: 196.0 },
  { key: 'Ab', freq: 207.65 },
  { key: 'A', freq: 220.0 },
  { key: 'Bb', freq: 233.08 },
  { key: 'B', freq: 246.94 },
];

const PROJECTION_THEMES = [
  { id: 'space', label: 'Deep Space' },
  { id: 'purple', label: 'Royal Worship' },
  { id: 'ocean', label: 'Ocean Glow' },
  { id: 'black', label: 'Pure Black' },
];

function transposeNoteName(note, semitones) {
  if (!note || !semitones) return note;
  const match = String(note).trim().match(/^([A-G][#b]?)(.*)$/);
  if (!match) return note;
  const [, root, suffix] = match;
  let idx = NOTES_SHARP.indexOf(root);
  let useFlats = false;
  if (idx === -1) {
    idx = NOTES_FLAT.indexOf(root);
    useFlats = true;
  }
  if (idx === -1) return note;
  const nextIdx = (idx + (semitones % 12) + 12) % 12;
  const scale = useFlats ? NOTES_FLAT : NOTES_SHARP;
  return `${scale[nextIdx]}${suffix}`;
}

function transposeChordToken(token, semitones) {
  if (!semitones) return token;
  return token.replace(/([A-G][#b]?)/g, (m) => transposeNoteName(m, semitones));
}

function isPureChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('[')) return false;
  return /^([A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d)*(?:\/[A-G][#b]?)?\s*)+$/.test(trimmed);
}

function transposeLyricsOrChords(rawText, semitones) {
  if (!rawText) return '';
  if (!semitones) return rawText;
  return rawText
    .split('\n')
    .map((line) => {
      if (isPureChordLine(line)) {
        return line.replace(/([A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d)*(?:\/[A-G][#b]?)?)/g, (c) =>
          transposeChordToken(c, semitones)
        );
      }
      return line.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, chord) => `[${transposeChordToken(chord, semitones)}]`);
    })
    .join('\n');
}

function parseProjectionSlides(rawText, loading) {
  if (!rawText || !rawText.trim()) {
    return [
      {
        section: 'Պատրաստ',
        text: loading ? 'Երգը բեռնվում է...' : 'Ընտրված երգի բառերը հասանելի չեն',
      },
    ];
  }

  const chunks = rawText.split(/\n\s*\n+/);
  const parsedSlides = [];

  chunks.forEach((chunk, idx) => {
    const lines = chunk.split('\n');
    let sectionLabel = '';
    const lyricLines = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (isPureChordLine(trimmed)) return;

      const headerMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (headerMatch && !/^[A-G][#b]?/.test(headerMatch[1])) {
        sectionLabel = headerMatch[1].trim();
        return;
      }

      const cleanLine = trimmed.replace(/\[[A-G][#b]?[^\]]*\]/g, '').trim();
      if (cleanLine) {
        lyricLines.push(cleanLine);
      }
    });

    if (lyricLines.length > 0) {
      if (lyricLines.length > 6) {
        for (let i = 0; i < lyricLines.length; i += 4) {
          const subLines = lyricLines.slice(i, i + 4);
          parsedSlides.push({
            section: sectionLabel
              ? `${sectionLabel}${i > 0 ? ` (${Math.floor(i / 4) + 1})` : ''}`
              : `Սլայդ ${parsedSlides.length + 1}`,
            text: subLines.join('\n'),
          });
        }
      } else {
        parsedSlides.push({
          section: sectionLabel || `Սլայդ ${idx + 1}`,
          text: lyricLines.join('\n'),
        });
      }
    }
  });

  return parsedSlides.length > 0 ? parsedSlides : [{ section: 'Երգ', text: rawText.trim() }];
}

function StudioIcon({ name, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'overview':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'stems':
      return (
        <svg {...props}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
    case 'live_stage':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
      );
    case 'projection':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'ai_studio':
      return (
        <svg {...props}>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
        </svg>
      );
    case 'planner':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      );
    case 'metronome':
      return (
        <svg {...props}>
          <path d="M6 21h12L14.5 4h-5L6 21z" />
          <path d="M12 16l5-8" />
          <circle cx="12" cy="16" r="1.5" />
        </svg>
      );
    case 'music':
      return (
        <svg {...props}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'external':
      return (
        <svg {...props}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case 'wave':
      return (
        <svg {...props}>
          <path d="M2 12h2m4-7v14m4-10v6m4-11v16m4-9v2h2" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
        </svg>
      );
    case 'stop':
      return (
        <svg {...props}>
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      );
    case 'chevronLeft':
      return (
        <svg {...props}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...props}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function WorshipStudioHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { isEnabled, isBeta } = useFeatureFlags();
  const isAppMode = useIsPWA();

  const initialTab = searchParams.get('tab') || 'overview';
  const initialSongId = searchParams.get('song') || '';

  const [activeTab, setActiveTabState] = useState(initialTab);
  const [songs, setSongs] = useState(() => {
    try {
      const cached = localStorage.getItem('wp_songs_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songDetailsCache, setSongDetailsCache] = useState({});
  const [loadingSongDetail, setLoadingSongDetail] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // Master musical context
  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [chordFontSize, setChordFontSize] = useState(15);
  const [showStemsChordPanel, setShowStemsChordPanel] = useState(true);

  // Live Stage Director state
  const [liveSessionState, setLiveSessionState] = useState(() =>
    typeof liveStageSync.getState === 'function' ? liveStageSync.getState() : liveStageSync.currentState || null
  );
  const [customCueText, setCustomCueText] = useState('');
  const [stageNotice, setStageNotice] = useState('');

  // Live Projection Presenter Console state
  const [projSlideIndex, setProjSlideIndex] = useState(0);
  const [projIsBlank, setProjIsBlank] = useState(false);
  const [projShowTitle, setProjShowTitle] = useState(true);
  const [projTheme, setProjTheme] = useState('space');
  const [projMode, setProjMode] = useState('beamer');

  // Ambient Worship Drone Pad Web Audio Engine
  const [padPlaying, setPadPlaying] = useState(false);
  const [padKey, setPadKey] = useState('C');
  const [padVolume, setPadVolume] = useState(0.45);
  const [padWarmth, setPadWarmth] = useState(750);
  const [padShimmer, setPadShimmer] = useState(true);
  const padAudioRef = useRef({ ctx: null, masterGain: null, filter: null, oscs: [] });

  // Quick Tap Tempo state
  const [quickBpm, setQuickBpm] = useState(76);
  const tapTimesRef = useRef([]);

  // Sync activeTab with URL ?tab=
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'overview';
    if (tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const setActiveTab = useCallback(
    (nextTab) => {
      setActiveTabState(nextTab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextTab === 'overview') {
            next.delete('tab');
          } else {
            next.set('tab', nextTab);
          }
          return next;
        },
        { replace: true }
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams]
  );

  // Close song dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setSongPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Subscribe to liveStageSync
  useEffect(() => {
    return liveStageSync.subscribe((state) => {
      setLiveSessionState({ ...state });
    });
  }, []);

  // Fetch songs list for Master Context Bar
  useEffect(() => {
    let active = true;
    if (songs.length === 0) setLoadingSongs(true);

    fetch('/api.php')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.songs)
          ? data.songs
          : [];
        if (list.length > 0) {
          setSongs(list);
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(list));
          } catch {}
          setSelectedSong((prev) => {
            if (prev) {
              const updated = list.find((s) => String(s.id) === String(prev.id));
              return updated || prev;
            }
            if (initialSongId) {
              const matched = list.find((s) => String(s.id) === String(initialSongId));
              if (matched) return matched;
            }
            return list[0];
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSongs(false);
      });

    return () => {
      active = false;
    };
  }, [initialSongId]);

  // Ensure selectedSong is initialized from cached songs on first mount
  useEffect(() => {
    if (!selectedSong && songs.length > 0) {
      if (initialSongId) {
        const matched = songs.find((s) => String(s.id) === String(initialSongId));
        if (matched) {
          setSelectedSong(matched);
          return;
        }
      }
      setSelectedSong(songs[0]);
    }
  }, [songs, selectedSong, initialSongId]);

  // Fetch full song details (lyrics, chords, stems) whenever selectedSong changes
  useEffect(() => {
    const songId = selectedSong?.id;
    if (!songId) return;

    // Reset transpose & slide index when switching songs
    setTransposeSemitones(0);
    setProjSlideIndex(0);

    // Sync Pad Key & Quick BPM to song's defaults if available
    if (selectedSong?.tonality) {
      const cleanRoot = String(selectedSong.tonality).replace(/m.*$/i, '').trim();
      const matchedPad = PAD_KEYS.find((k) => k.key.toLowerCase() === cleanRoot.toLowerCase());
      if (matchedPad && !padPlaying) {
        setPadKey(matchedPad.key);
      }
    }
    if (selectedSong?.tempo && Number(selectedSong.tempo) >= 40 && Number(selectedSong.tempo) <= 240) {
      setQuickBpm(Number(selectedSong.tempo));
    }

    if (songDetailsCache[songId]?.lyrics || songDetailsCache[songId]?.chords) {
      return;
    }

    let active = true;
    setLoadingSongDetail(true);
    fetch(`/api.php?id=${encodeURIComponent(songId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setSongDetailsCache((prev) => ({ ...prev, [songId]: data }));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingSongDetail(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSong?.id]);

  // Merged active song object with full lyrics & chords
  const activeSongFull = useMemo(() => {
    if (!selectedSong) return null;
    const detail = songDetailsCache[selectedSong.id];
    return detail ? { ...selectedSong, ...detail } : selectedSong;
  }, [selectedSong, songDetailsCache]);

  const selectSong = useCallback(
    (song) => {
      setSelectedSong(song);
      setSongPickerOpen(false);
      if (song?.id) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('song', String(song.id));
            return next;
          },
          { replace: true }
        );
      }
    },
    [setSearchParams]
  );

  // Prev / Next song navigation
  const currentSongIdx = useMemo(() => {
    if (!selectedSong || songs.length === 0) return -1;
    return songs.findIndex((s) => String(s.id) === String(selectedSong.id));
  }, [selectedSong, songs]);

  const handlePrevSong = useCallback(() => {
    if (songs.length === 0) return;
    const prevIdx = currentSongIdx > 0 ? currentSongIdx - 1 : songs.length - 1;
    selectSong(songs[prevIdx]);
  }, [songs, currentSongIdx, selectSong]);

  const handleNextSong = useCallback(() => {
    if (songs.length === 0) return;
    const nextIdx = currentSongIdx >= 0 && currentSongIdx < songs.length - 1 ? currentSongIdx + 1 : 0;
    selectSong(songs[nextIdx]);
  }, [songs, currentSongIdx, selectSong]);

  const filteredSongs = useMemo(() => {
    if (!songSearch.trim()) return songs.slice(0, 60);
    const q = songSearch.toLowerCase();
    return songs
      .filter((s) => {
        const title = getLocalizedTitle(s.title || s.title_hy || '', language).toLowerCase();
        const cat = String(s.category || '').toLowerCase();
        const key = String(s.tonality || '').toLowerCase();
        return title.includes(q) || cat.includes(q) || key.includes(q);
      })
      .slice(0, 50);
  }, [songs, songSearch, language]);

  const activeSongTitle = useMemo(() => {
    if (!activeSongFull) return 'Ընտրեք երգը...';
    return getLocalizedTitle(activeSongFull.title || activeSongFull.title_hy || 'Երգ', language);
  }, [activeSongFull, language]);

  const effectiveTonality = useMemo(() => {
    const baseKey = activeSongFull?.tonality || 'Am';
    return transposeNoteName(baseKey, transposeSemitones);
  }, [activeSongFull?.tonality, transposeSemitones]);

  const transposedChordSheet = useMemo(() => {
    const raw = activeSongFull?.chords || activeSongFull?.lyrics || '';
    return transposeLyricsOrChords(raw, transposeSemitones);
  }, [activeSongFull, transposeSemitones]);

  // Extract section headers from active song for Live Stage quick section jump
  const songSections = useMemo(() => {
    const raw = activeSongFull?.chords || activeSongFull?.lyrics || '';
    if (!raw) return ['Տուն 1', 'Կրկներգ', 'Տուն 2', 'Կամուրջ', 'Ավարտ'];
    const found = [];
    raw.split('\n').forEach((line) => {
      const m = line.trim().match(/^\[([^\]]+)\]$/);
      if (m && !/^[A-G][#b]?/.test(m[1]) && !found.includes(m[1].trim())) {
        found.push(m[1].trim());
      }
    });
    return found.length > 0 ? found : ['Տուն 1', 'Կրկներգ', 'Տուն 2', 'Կամուրջ', 'Ավարտ'];
  }, [activeSongFull]);

  // Projection slides for active song
  const projectionSlides = useMemo(
    () => parseProjectionSlides(activeSongFull?.lyrics || activeSongFull?.chords || '', loadingSongDetail),
    [activeSongFull, loadingSongDetail]
  );

  const safeProjSlideIndex = Math.min(Math.max(0, projSlideIndex), Math.max(0, projectionSlides.length - 1));
  const currentProjSlide = projectionSlides[safeProjSlideIndex] || { section: '', text: '' };
  const nextProjSlide = projectionSlides[safeProjSlideIndex + 1] || null;

  // Broadcast projection state to any open /projection/:id window
  const broadcastProjectionState = useCallback(
    (overrides = {}) => {
      const payload = {
        songId: activeSongFull?.id || null,
        slideIndex: overrides.slideIndex ?? safeProjSlideIndex,
        isBlank: overrides.isBlank ?? projIsBlank,
        showTitleOverlay: overrides.showTitleOverlay ?? projShowTitle,
        theme: overrides.theme ?? projTheme,
        mode: overrides.mode ?? projMode,
        stageMessage: overrides.stageMessage ?? (liveSessionState?.stage_message || ''),
        ts: Date.now(),
      };
      try {
        localStorage.setItem('wp_projection_live_state', JSON.stringify(payload));
      } catch {}
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('worship_projection_sync');
          bc.postMessage(payload);
          bc.close();
        } catch {}
      }
      if (liveStageSync.sessionId && typeof overrides.slideIndex === 'number') {
        const slideObj = projectionSlides[overrides.slideIndex];
        liveStageSync.broadcastState({
          song_id: activeSongFull?.id || null,
          song_title: activeSongTitle,
          section_index: overrides.slideIndex,
          section_name: slideObj?.section || '',
        });
      }
    },
    [
      activeSongFull?.id,
      activeSongTitle,
      safeProjSlideIndex,
      projIsBlank,
      projShowTitle,
      projTheme,
      projMode,
      liveSessionState?.stage_message,
      projectionSlides,
    ]
  );

  // Ambient Worship Drone Pad Web Audio synthesis
  const stopAmbientPad = useCallback(() => {
    const ref = padAudioRef.current;
    if (ref.ctx && ref.masterGain) {
      try {
        const now = ref.ctx.currentTime;
        ref.masterGain.gain.cancelScheduledValues(now);
        ref.masterGain.gain.setValueAtTime(ref.masterGain.gain.value, now);
        ref.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(() => {
          ref.oscs.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch {}
          });
          try {
            ref.ctx.close();
          } catch {}
          padAudioRef.current = { ctx: null, masterGain: null, filter: null, oscs: [] };
        }, 650);
      } catch {}
    }
    setPadPlaying(false);
  }, []);

  const startAmbientPad = useCallback(
    (targetKey = padKey) => {
      stopAmbientPad();
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const keyEntry = PAD_KEYS.find((k) => k.key === targetKey) || PAD_KEYS[0];
        const rootFreq = keyEntry.freq;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = padWarmth;
        filter.Q.value = 0.7;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(padVolume * 0.35, ctx.currentTime + 1.2);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Warm 5th + Octave + Sub-octave detuned worship pad voices
        const intervals = [
          { mult: 0.5, type: 'sine', detune: -4, gain: 0.45 },
          { mult: 1, type: 'sawtooth', detune: -7, gain: 0.28 },
          { mult: 1, type: 'triangle', detune: 6, gain: 0.32 },
          { mult: 1.4983, type: 'sawtooth', detune: -5, gain: 0.22 }, // Perfect 5th
          { mult: 2, type: 'sine', detune: 8, gain: padShimmer ? 0.24 : 0.08 }, // Octave shimmer
        ];

        const oscs = intervals.map((v) => {
          const osc = ctx.createOscillator();
          const vGain = ctx.createGain();
          osc.type = v.type;
          osc.frequency.value = rootFreq * v.mult;
          osc.detune.value = v.detune;
          vGain.gain.value = v.gain;
          osc.connect(vGain);
          vGain.connect(filter);
          osc.start();
          return osc;
        });

        padAudioRef.current = { ctx, masterGain, filter, oscs };
        setPadPlaying(true);
      } catch {}
    },
    [padKey, padWarmth, padVolume, padShimmer, stopAmbientPad]
  );

  // Update live pad parameters without restarting oscillators
  useEffect(() => {
    const ref = padAudioRef.current;
    if (!padPlaying || !ref.ctx) return;
    const keyEntry = PAD_KEYS.find((k) => k.key === padKey) || PAD_KEYS[0];
    const rootFreq = keyEntry.freq;
    const mults = [0.5, 1, 1, 1.4983, 2];
    ref.oscs.forEach((osc, i) => {
      try {
        osc.frequency.setTargetAtTime(rootFreq * (mults[i] || 1), ref.ctx.currentTime, 0.15);
      } catch {}
    });
  }, [padKey, padPlaying]);

  useEffect(() => {
    const ref = padAudioRef.current;
    if (!padPlaying || !ref.ctx) return;
    try {
      if (ref.filter) ref.filter.frequency.setTargetAtTime(padWarmth, ref.ctx.currentTime, 0.1);
      if (ref.masterGain) ref.masterGain.gain.setTargetAtTime(padVolume * 0.35, ref.ctx.currentTime, 0.1);
    } catch {}
  }, [padWarmth, padVolume, padPlaying]);

  useEffect(() => {
    return () => {
      if (padAudioRef.current.ctx) {
        try {
          padAudioRef.current.ctx.close();
        } catch {}
      }
    };
  }, []);

  // Quick Tap Tempo handler
  const handleQuickTap = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 3000);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const computed = Math.round(60000 / avgMs);
      if (computed >= 40 && computed <= 240) {
        setQuickBpm(computed);
      }
    }
  }, []);

  const triggerStageCue = useCallback(
    (cueText) => {
      if (!liveStageSync.sessionId) {
        liveStageSync.createSession({
          song_id: activeSongFull?.id || null,
          song_title: activeSongTitle,
          transpose: transposeSemitones,
          bpm: Number(activeSongFull?.tempo) || quickBpm,
          stage_message: cueText,
        });
      } else {
        liveStageSync.sendStageMessage(cueText);
      }
      setStageNotice(`Ուղարկվեց բեմ՝ «${cueText}»`);
      setTimeout(() => setStageNotice(''), 2800);
    },
    [activeSongFull, activeSongTitle, transposeSemitones, quickBpm]
  );

  // Module registry governed by Feature Flags
  const studioModules = useMemo(() => {
    const list = [
      {
        id: 'stems',
        flag: 'rehearsal_stems',
        icon: 'stems',
        title: 'Multi-Track Stems & Ակորդներ',
        shortTitle: 'Stems Mixer',
        subtitle: '8-ալիքանի DAW վահանակ + կենդանի տրանսպոզիցիայով ակորդների տեքստ',
        accent: '#38bdf8',
        badge: '8 CH DAW',
        metrics: ['Click & Guide', 'Pitch / Speed', 'A–B Loop + Chords'],
      },
      {
        id: 'live_stage',
        flag: 'live_stage_follower',
        icon: 'live_stage',
        title: 'Band Live Follower & Stage Cue',
        shortTitle: 'Live Stage',
        subtitle: 'Խմբի իրական-ժամանակի սինխրոնիզացիա, բեմական հուշումներ և տոնայնության հեռարձակում',
        accent: '#f59e0b',
        badge: 'REALTIME SYNC',
        metrics: ['QR Band Join', '8 Stage Cue Pads', 'Section Broadcast'],
      },
      {
        id: 'projection',
        flag: 'lyrics_projection',
        icon: 'projection',
        title: 'Live Projection & OBS Վահանակ',
        shortTitle: 'Projection / OBS',
        subtitle: 'ProPresenter ոճի սլայդների կառավարում, 16:9 ուղիղ մոնիտոր և երկրորդ էկրանի սինխրոնիզացիա',
        accent: '#a855f7',
        badge: 'PROPRESENTER',
        metrics: ['Live Slide Grid', '16:9 Output Monitor', 'Multi-Window Sync'],
      },
      {
        id: 'ai_studio',
        flag: 'worship_ai_studio',
        icon: 'ai_studio',
        title: 'Worship AI Studio',
        shortTitle: 'AI Studio',
        subtitle: 'Ակորդների ավտոմատ ներդաշնակեցում, 6 երաժշտական ոճ, Capo-ի հաշվիչ և Սեթլիստի AI օգնական',
        accent: '#ec4899',
        badge: 'AI HARMONIZER',
        metrics: ['6 Worship Styles', 'Smart Capo Pick', 'Flow Transitions'],
      },
      {
        id: 'planner',
        flag: 'service_planner',
        icon: 'planner',
        title: 'Ծառայության Պլանավորիչ',
        shortTitle: 'Պլանավորիչ',
        subtitle: 'Run-of-Show րոպեական ժամանակացույց, երաժիշտների հերթափոխ և PDF տպագրություն',
        accent: '#10b981',
        badge: 'RUN-OF-SHOW',
        metrics: ['Minute Timeline', 'Team Roster', 'Print / PDF Export'],
      },
      {
        id: 'metronome',
        flag: 'pro_studio',
        icon: 'metronome',
        title: 'Մետրոնոմ & Ambient Pad',
        shortTitle: 'Metronome & Pad',
        subtitle: 'Բարձր ճշգրտության Web Audio մետրոնոմ, Tap Tempo և տաք Ambient Drone Pad սինթեզատոր',
        accent: '#6366f1',
        badge: 'CLICK + PAD',
        metrics: ['Subdivisions', '12-Key Drone Pad', 'Lowpass Warmth'],
      },
    ];

    return list.filter((m) => isEnabled(m.flag));
  }, [isEnabled]);

  const anyBetaEnabled =
    isBeta('pro_studio') ||
    isBeta('rehearsal_stems') ||
    isBeta('lyrics_projection') ||
    isBeta('live_stage_follower') ||
    isBeta('worship_ai_studio') ||
    isBeta('service_planner');

  if (!isEnabled('pro_studio') && studioModules.length === 0) {
    return (
      <div className="worship-studio-hub-page">
        <FeatureDisabledScreen
          title="Worship Pro Studio Հաբն անջատված է"
          description="Այս բաժինը և ներառված գործիքները ժամանակավորապես անջատված են կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
          backUrl="/songs"
          backLabel="Գնալ Երգարան"
        />
      </div>
    );
  }

  return (
    <div className={`worship-studio-hub-page ${isAppMode ? 'is-app-surface' : 'is-web-surface'}`}>
      {/* Context-Aware Header: Compact App Bar in PWA/Native, Full Command Header on Web */}
      {isAppMode ? (
        <header className="wsh-app-topbar">
          <button
            type="button"
            className="wsh-app-back-btn"
            onClick={() => (activeTab !== 'overview' ? setActiveTab('overview') : navigate('/songs'))}
          >
            <StudioIcon name="chevronLeft" size={18} />
            <span>{activeTab !== 'overview' ? 'Հաբ' : 'Երգեր'}</span>
          </button>

          <div className="wsh-app-title-block">
            <div className="wsh-app-title-row">
              <h1>Pro Studio</h1>
              {anyBetaEnabled && <BetaBadge label="BETA" />}
            </div>
            <span className="wsh-app-subtitle">
              {activeTab === 'overview'
                ? `${studioModules.length} ակտիվ գործիք`
                : studioModules.find((m) => m.id === activeTab)?.shortTitle || 'Workstation'}
            </span>
          </div>

          <button
            type="button"
            className={`wsh-app-pad-pill ${padPlaying ? 'active' : ''}`}
            onClick={() => (padPlaying ? stopAmbientPad() : startAmbientPad(padKey))}
            title="Ambient Worship Pad"
          >
            <StudioIcon name="wave" size={15} />
            <span>Pad {padKey}</span>
          </button>
        </header>
      ) : (
        <header className="wsh-web-hero">
          <div className="wsh-web-hero-left">
            <div className="wsh-web-eyebrow">
              <span className="wsh-pulse-dot" />
              <span>WORSHIP AUDIO & STAGE WORKSTATION</span>
              {anyBetaEnabled && <BetaBadge label="BETA LABS" />}
            </div>
            <h1>Worship Pro Studio Հաբ</h1>
            <p>
              Միասնական երաժշտական աշխատակայան փորձերի, կենդանի պաշտամունքի, բազմաալիք Stems միքսերի,
              ProPresenter պրոյեկցիայի և AI ներդաշնակեցման համար։
            </p>
          </div>

          <div className="wsh-web-hero-telemetry">
            <div className="wsh-telemetry-card">
              <span className="wsh-telemetry-label">ԱԿՏԻՎ ՄՈԴՈՒԼՆԵՐ</span>
              <strong>{studioModules.length} Գործիք</strong>
              <span className="wsh-telemetry-sub">Web Audio 48kHz Engine</span>
            </div>
            <div className="wsh-telemetry-card">
              <span className="wsh-telemetry-label">AMBIENT PAD ՍԻՆԹ</span>
              <div className="wsh-telemetry-pad-row">
                <strong>{padKey} Drone</strong>
                <button
                  type="button"
                  className={`wsh-mini-pad-toggle ${padPlaying ? 'playing' : ''}`}
                  onClick={() => (padPlaying ? stopAmbientPad() : startAmbientPad(padKey))}
                >
                  {padPlaying ? '■ Stop' : '▶ Play'}
                </button>
              </div>
              <span className="wsh-telemetry-sub">{padPlaying ? 'Հնչում է ուղիղ եթերում' : 'Պատրաստ է մեկ հպումով'}</span>
            </div>
            <div className="wsh-telemetry-card">
              <span className="wsh-telemetry-label">ԲԵՄԱԿԱՆ ՍԵՍԻԱ</span>
              <strong>{liveSessionState?.sessionId || 'Լոկալ Ռեժիմ'}</strong>
              <span className="wsh-telemetry-sub">
                {liveSessionState?.sessionId ? 'Սինխրոնիզացված է խմբի հետ' : 'Պատրաստ է միացման'}
              </span>
            </div>
          </div>
        </header>
      )}

      {!isAppMode && anyBetaEnabled && (
        <BetaBanner
          title="Worship Pro Studio — Միասնական Աշխատակայան"
          description="Բոլոր գործիքներն աշխատում են անմիջապես այս էջի ներսում՝ ընդհանուր ընտրված երգի, տոնայնության և տեմպի սինխրոնիզացիայով։"
        />
      )}

      {/* Unified Master Song & Musical Context Bar */}
      <section className="wsh-master-bar" aria-label="Ակտիվ երգի և տոնայնության կառավարման վահանակ">
        <div className="wsh-master-song-group" ref={pickerRef}>
          <div className="wsh-master-step-btns">
            <button
              type="button"
              className="wsh-step-btn"
              onClick={handlePrevSong}
              title="Նախորդ երգը"
              disabled={songs.length === 0}
            >
              <StudioIcon name="chevronLeft" size={16} />
            </button>
            <button
              type="button"
              className="wsh-step-btn"
              onClick={handleNextSong}
              title="Հաջորդ երգը"
              disabled={songs.length === 0}
            >
              <StudioIcon name="chevronRight" size={16} />
            </button>
          </div>

          <div className="wsh-song-selector-wrap">
            <button
              type="button"
              className={`wsh-song-selector-btn ${songPickerOpen ? 'open' : ''}`}
              onClick={() => setSongPickerOpen((v) => !v)}
            >
              <span className="wsh-song-selector-icon">
                <StudioIcon name="music" size={17} />
              </span>
              <span className="wsh-song-selector-text">
                <span className="wsh-song-selector-eyebrow">ԱԿՏԻՎ ԵՐԳ WORKSTATION-ՈՒՄ</span>
                <span className="wsh-song-selector-title">
                  {loadingSongs && !activeSongFull ? 'Բեռնվում է երգարանը...' : activeSongTitle}
                </span>
              </span>
              <span className="wsh-song-selector-caret">▾</span>
            </button>

            {songPickerOpen && (
              <div className="wsh-song-dropdown">
                <div className="wsh-song-search-box">
                  <StudioIcon name="search" size={15} />
                  <input
                    type="text"
                    placeholder="Որոնել երգը վերնագրով կամ տոնայնությամբ..."
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    autoFocus
                  />
                  {songSearch && (
                    <button type="button" className="wsh-clear-search" onClick={() => setSongSearch('')}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="wsh-song-dropdown-list">
                  {filteredSongs.length === 0 ? (
                    <div className="wsh-song-empty">Երգ չի գտնվել</div>
                  ) : (
                    filteredSongs.map((s) => {
                      const isSel = selectedSong && String(selectedSong.id) === String(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`wsh-song-option ${isSel ? 'selected' : ''}`}
                          onClick={() => selectSong(s)}
                        >
                          <span className="wsh-song-opt-title">
                            {getLocalizedTitle(s.title || s.title_hy || 'Երգ', language)}
                          </span>
                          <span className="wsh-song-opt-badges">
                            {s.tonality && <span className="wsh-opt-key">{s.tonality}</span>}
                            {s.tempo && <span className="wsh-opt-bpm">{s.tempo} BPM</span>}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Key Transposer + BPM + Direct Actions */}
        <div className="wsh-master-controls">
          <div className="wsh-transpose-widget" title="Տոնայնության տրանսպոզիցիա կիսատոներով">
            <span className="wsh-widget-label">ՏՈՆ</span>
            <button
              type="button"
              className="wsh-tr-btn"
              onClick={() => setTransposeSemitones((t) => t - 1)}
              aria-label="Transpose down"
            >
              −
            </button>
            <button
              type="button"
              className={`wsh-tr-val ${transposeSemitones !== 0 ? 'modified' : ''}`}
              onClick={() => setTransposeSemitones(0)}
              title="Սեղմեք՝ օրիգինալ տոնայնությանը վերադառնալու համար"
            >
              <strong>{effectiveTonality}</strong>
              {transposeSemitones !== 0 && (
                <em>({transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones})</em>
              )}
            </button>
            <button
              type="button"
              className="wsh-tr-btn"
              onClick={() => setTransposeSemitones((t) => t + 1)}
              aria-label="Transpose up"
            >
              +
            </button>
          </div>

          <div className="wsh-bpm-pill" onClick={() => setActiveTab('metronome')} title="Բացել Մետրոնոմը">
            <StudioIcon name="metronome" size={14} />
            <span>{activeSongFull?.tempo || quickBpm} BPM</span>
          </div>

          {activeSongFull?.id && (
            <div className="wsh-master-quick-links">
              <button
                type="button"
                className="wsh-master-link-btn"
                onClick={() => navigate(`/song/${activeSongFull.id}`)}
                title="Բացել երգի էջը"
              >
                <StudioIcon name="external" size={14} />
                <span>Երգի էջ</span>
              </button>
              {isEnabled('lyrics_projection') && (
                <button
                  type="button"
                  className="wsh-master-link-btn accent"
                  onClick={() => window.open(`/projection/${activeSongFull.id}`, '_blank', 'noopener,noreferrer')}
                  title="Բացել Պրոյեկտորի էկրանը նոր պատուհանում"
                >
                  <StudioIcon name="projection" size={14} />
                  <span>Beamer Էկրան</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Workstation Navigation Dock */}
      <nav className="wsh-dock-nav" aria-label="Pro Studio մոդուլներ">
        <button
          type="button"
          className={`wsh-dock-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <StudioIcon name="overview" size={17} />
          <span>Բոլոր Գործիքները</span>
        </button>

        {studioModules.map((mod) => (
          <button
            key={mod.id}
            type="button"
            className={`wsh-dock-tab ${activeTab === mod.id ? 'active' : ''}`}
            style={{ '--tab-accent': mod.accent }}
            onClick={() => setActiveTab(mod.id)}
          >
            <StudioIcon name={mod.icon} size={17} />
            <span>{mod.shortTitle}</span>
          </button>
        ))}
      </nav>

      {/* Main Workstation Viewport */}
      <div className="wsh-viewport">
        {/* ================= 1. OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="wsh-overview-layout">
            {/* Interactive Quick Studio Strip: Ambient Pad + Tap Tempo + Active Song Quick Chords */}
            <div className="wsh-quick-strip">
              {/* Quick Ambient Pad Card */}
              <div className={`wsh-strip-card pad-card ${padPlaying ? 'is-playing' : ''}`}>
                <div className="wsh-strip-head">
                  <div className="wsh-strip-title">
                    <StudioIcon name="wave" size={18} />
                    <div>
                      <h3>Ambient Worship Pad</h3>
                      <span>Տաք ֆոնային սինթեզատոր աղոթքի և անցումների համար</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`wsh-pad-power-btn ${padPlaying ? 'active' : ''}`}
                    onClick={() => (padPlaying ? stopAmbientPad() : startAmbientPad(padKey))}
                  >
                    <StudioIcon name={padPlaying ? 'stop' : 'play'} size={14} />
                    <span>{padPlaying ? 'Կանգնեցնել' : 'Միացնել Pad-ը'}</span>
                  </button>
                </div>

                <div className="wsh-pad-keys-grid">
                  {PAD_KEYS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      className={`wsh-pad-key-btn ${padKey === k.key ? 'selected' : ''} ${
                        padPlaying && padKey === k.key ? 'sounding' : ''
                      }`}
                      onClick={() => {
                        setPadKey(k.key);
                        if (!padPlaying) startAmbientPad(k.key);
                      }}
                    >
                      {k.key}
                    </button>
                  ))}
                </div>

                <div className="wsh-pad-sliders">
                  <label>
                    <span>Ջերմություն (Filter)</span>
                    <input
                      type="range"
                      min="250"
                      max="2200"
                      step="10"
                      value={padWarmth}
                      onChange={(e) => setPadWarmth(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>Ձայնի ուժգնություն</span>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.02"
                      value={padVolume}
                      onChange={(e) => setPadVolume(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Quick Tap Tempo & Active Song Snapshot */}
              <div className="wsh-strip-card tempo-snapshot-card">
                <div className="wsh-strip-head">
                  <div className="wsh-strip-title">
                    <StudioIcon name="metronome" size={18} />
                    <div>
                      <h3>Արագ Տեմպ & Ակորդների Դիտում</h3>
                      <span>{activeSongTitle} ({effectiveTonality})</span>
                    </div>
                  </div>
                  <div className="wsh-tap-box">
                    <button type="button" className="wsh-tap-btn" onClick={handleQuickTap}>
                      TAP TEMPO
                    </button>
                    <span className="wsh-tap-readout">{quickBpm} BPM</span>
                  </div>
                </div>

                <div className="wsh-quick-chords-preview">
                  {loadingSongDetail ? (
                    <div className="wsh-preview-placeholder">Բեռնվում են երգի ակորդները...</div>
                  ) : transposedChordSheet ? (
                    <pre>{transposedChordSheet.slice(0, 380)}{transposedChordSheet.length > 380 ? '...' : ''}</pre>
                  ) : (
                    <div className="wsh-preview-placeholder">Այս երգի համար ակորդներ դեռ ավելացված չեն։</div>
                  )}
                </div>

                <div className="wsh-snapshot-actions">
                  <button type="button" onClick={() => setActiveTab('stems')}>
                    Բացել Stems + Ակորդներ →
                  </button>
                  <button type="button" onClick={() => setActiveTab('projection')}>
                    Բացել Սլայդների Վահանակը →
                  </button>
                  <button type="button" onClick={() => setActiveTab('ai_studio')}>
                    AI Ներդաշնակեցում →
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Flagship Bento Workstation Cards */}
            <div className="wsh-bento-grid">
              {studioModules.map((mod) => (
                <article
                  key={mod.id}
                  className="wsh-bento-card"
                  style={{ '--card-accent': mod.accent }}
                  onClick={() => setActiveTab(mod.id)}
                >
                  <div className="wsh-bento-top">
                    <div className="wsh-bento-icon">
                      <StudioIcon name={mod.icon} size={22} />
                    </div>
                    <div className="wsh-bento-badges">
                      <span className="wsh-bento-tag">{mod.badge}</span>
                      {isBeta(mod.flag) && <BetaBadge />}
                    </div>
                  </div>

                  <h2>{mod.title}</h2>
                  <p>{mod.subtitle}</p>

                  <div className="wsh-bento-metrics">
                    {mod.metrics.map((m) => (
                      <span key={m} className="wsh-metric-chip">
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="wsh-bento-footer">
                    <span className="wsh-bento-cta">Բացել աշխատակայանը</span>
                    <span className="wsh-bento-arrow">→</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ================= 2. STEMS MIXER + LIVE CHORD SHEET ================= */}
        {activeTab === 'stems' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-pane-toolbar">
              <div className="wsh-pane-title">
                <StudioIcon name="stems" size={20} />
                <div>
                  <h2>Multi-Track Stems & Փորձի Վահանակ</h2>
                  <p>
                    Կառավարեք գործիքների բալանսը, տեմպը և միաժամանակ հետևեք «{activeSongTitle}» երգի տրանսպոզիցիայով
                    ակորդներին։
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`wsh-toggle-chord-pane-btn ${showStemsChordPanel ? 'active' : ''}`}
                onClick={() => setShowStemsChordPanel((v) => !v)}
              >
                {showStemsChordPanel ? 'Թաքցնել Ակորդների Վահանակը' : 'Ցուցադրել Ակորդները կողքին'}
              </button>
            </div>

            <div className={`wsh-stems-split ${showStemsChordPanel ? 'with-chords' : 'full-mixer'}`}>
              <div className="wsh-stems-mixer-col">
                <SongStemsMixer
                  songId={activeSongFull?.id}
                  songTitle={activeSongTitle}
                  songKey={effectiveTonality}
                  songBpm={Number(activeSongFull?.tempo) || quickBpm}
                  stemsData={activeSongFull?.stems || null}
                  fallbackAudioUrl={activeSongFull?.audio_url || ''}
                />
              </div>

              {showStemsChordPanel && (
                <aside className="wsh-live-chord-sheet">
                  <div className="wsh-chord-sheet-header">
                    <div>
                      <span className="wsh-cs-eyebrow">ԿԵՆԴԱՆԻ ԱԿՈՐԴՆԵՐ & ԲԱՌԵՐ</span>
                      <h3>
                        {activeSongTitle} <span className="wsh-cs-key">({effectiveTonality})</span>
                      </h3>
                    </div>
                    <div className="wsh-cs-tools">
                      <button
                        type="button"
                        onClick={() => setChordFontSize((s) => Math.max(12, s - 1))}
                        title="Փոքրացնել տառաչափը"
                      >
                        A−
                      </button>
                      <button
                        type="button"
                        onClick={() => setChordFontSize((s) => Math.min(22, s + 1))}
                        title="Մեծացնել տառաչափը"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  <div className="wsh-chord-sheet-body" style={{ fontSize: `${chordFontSize}px` }}>
                    {loadingSongDetail ? (
                      <div className="wsh-cs-empty">Բեռնվում է երգի տեքստը...</div>
                    ) : transposedChordSheet ? (
                      <pre>{transposedChordSheet}</pre>
                    ) : (
                      <div className="wsh-cs-empty">Այս երգի համար բառեր կամ ակորդներ չեն գտնվել։</div>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {/* ================= 3. BAND LIVE FOLLOWER & STAGE DIRECTOR ================= */}
        {activeTab === 'live_stage' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-pane-toolbar">
              <div className="wsh-pane-title">
                <StudioIcon name="live_stage" size={20} />
                <div>
                  <h2>Band Live Follower & Stage Director</h2>
                  <p>
                    Ստեղծեք Live սեսիա, կիսվեք QR կոդով երաժիշտների հետ և մեկ հպումով ուղարկեք բեմական հուշումներ կամ
                    երգի հատվածներ։
                  </p>
                </div>
              </div>
              {stageNotice && <div className="wsh-stage-toast">{stageNotice}</div>}
            </div>

            <LiveStageBar
              currentSong={activeSongFull}
              currentTranspose={transposeSemitones}
              currentCapo={0}
              currentBpm={Number(activeSongFull?.tempo) || quickBpm}
              onRemoteStateChange={(remote) => {
                if (remote?.song_id && (!selectedSong || Number(selectedSong.id) !== Number(remote.song_id))) {
                  const found = songs.find((s) => Number(s.id) === Number(remote.song_id));
                  if (found) selectSong(found);
                }
                if (typeof remote?.transpose === 'number') {
                  setTransposeSemitones(remote.transpose);
                }
              }}
            />

            <div className="wsh-stage-director-grid">
              {/* Tactile Stage Cue Pad Deck */}
              <div className="wsh-stage-deck-card">
                <div className="wsh-card-head">
                  <h3>Բեմական Արագ Հուշումներ (One-Tap Stage Cues)</h3>
                  <span>Ակնթարթորեն ցուցադրվում է բոլոր միացված երաժիշտների և վստահության մոնիտորի վրա</span>
                </div>

                <div className="wsh-cue-pads-grid">
                  {[
                    { label: 'Կրկներգ 2x', sub: 'Կրկնել կրկներգը', accent: '#38bdf8' },
                    { label: 'Տուն 1', sub: 'Վերադարձ սկիզբ', accent: '#818cf8' },
                    { label: 'Կամուրջ (Bridge)', sub: 'Անցում կամուրջին', accent: '#c084fc' },
                    { label: 'Միայն Ձայներ', sub: 'Գործիքները լռում են', accent: '#10b981' },
                    { label: 'Աղոթք / Pad', sub: 'Միայն մեղմ ստեղնաշար', accent: '#f59e0b' },
                    { label: 'Դինամիկ Աճ ↑', sub: 'Աստիճանաբար ուժեղացնել', accent: '#f97316' },
                    { label: 'Գործիքային Սոլո', sub: 'Ազատ իմպրովիզացիա', accent: '#ec4899' },
                    { label: 'Հանգիստ Ավարտ', sub: 'Դանդաղեցնել (Ritardando)', accent: '#64748b' },
                  ].map((cue) => (
                    <button
                      key={cue.label}
                      type="button"
                      className="wsh-cue-pad"
                      style={{ '--cue-color': cue.accent }}
                      onClick={() => triggerStageCue(cue.label)}
                    >
                      <strong>{cue.label}</strong>
                      <span>{cue.sub}</span>
                    </button>
                  ))}
                </div>

                <form
                  className="wsh-custom-cue-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customCueText.trim()) return;
                    triggerStageCue(customCueText.trim());
                    setCustomCueText('');
                  }}
                >
                  <input
                    type="text"
                    placeholder="Գրել հատուկ հաղորդագրություն բեմի համար (օր.՝ «Տոնայնությունը +1 կրկներգից հետո»)..."
                    value={customCueText}
                    onChange={(e) => setCustomCueText(e.target.value)}
                  />
                  <button type="submit">Ուղարկել Բեմ</button>
                </form>

                {/* Section Jump Broadcaster */}
                <div className="wsh-section-broadcaster">
                  <span className="wsh-sb-label">ԱԿՏԻՎ ՀԱՏՎԱԾԻ ՀԵՌԱՐՁԱԿՈՒՄ՝</span>
                  <div className="wsh-sb-pills">
                    {songSections.map((sec, idx) => (
                      <button
                        key={sec}
                        type="button"
                        className="wsh-sb-pill"
                        onClick={() => {
                          if (!liveStageSync.sessionId) {
                            liveStageSync.createSession({
                              song_id: activeSongFull?.id || null,
                              song_title: activeSongTitle,
                              section_index: idx,
                              section_name: sec,
                            });
                          } else {
                            liveStageSync.broadcastState({
                              song_id: activeSongFull?.id || null,
                              song_title: activeSongTitle,
                              section_index: idx,
                              section_name: sec,
                            });
                          }
                          setStageNotice(`Ակտիվ հատված՝ ${sec}`);
                          setTimeout(() => setStageNotice(''), 2400);
                        }}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Stage Chord Monitor */}
              <div className="wsh-live-chord-sheet">
                <div className="wsh-chord-sheet-header">
                  <div>
                    <span className="wsh-cs-eyebrow">ԲԵՄԱԿԱՆ ՄՈՆԻՏՈՐԻ ԱԿՈՐԴՆԵՐ</span>
                    <h3>
                      {activeSongTitle} <span className="wsh-cs-key">({effectiveTonality})</span>
                    </h3>
                  </div>
                </div>
                <div className="wsh-chord-sheet-body" style={{ fontSize: `${chordFontSize}px` }}>
                  {transposedChordSheet ? (
                    <pre>{transposedChordSheet}</pre>
                  ) : (
                    <div className="wsh-cs-empty">Ընտրված երգի ակորդները հասանելի չեն։</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. LIVE PROJECTION & OBS PRESENTER CONSOLE ================= */}
        {activeTab === 'projection' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-pane-toolbar">
              <div className="wsh-pane-title">
                <StudioIcon name="projection" size={20} />
                <div>
                  <h2>Live Projection & OBS Presenter Վահանակ</h2>
                  <p>
                    Կառավարեք պրոյեկտորի և OBS սթրիմի սլայդները ուղիղ այստեղից։ Սլայդի վրա սեղմելիս երկրորդ էկրանը
                    թարմացվում է ակնթարթորեն։
                  </p>
                </div>
              </div>

              <div className="wsh-proj-launch-btns">
                <button
                  type="button"
                  className="wsh-proj-window-btn primary"
                  onClick={() => {
                    broadcastProjectionState();
                    window.open(
                      `/projection/${activeSongFull?.id || 1}?mode=${projMode}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                >
                  <StudioIcon name="external" size={15} />
                  <span>Բացել Պրոյեկտորի Էկրանը (Նոր Պատուհան)</span>
                </button>
              </div>
            </div>

            <div className="wsh-presenter-console">
              {/* Left: Interactive Slide Grid */}
              <div className="wsh-slide-deck">
                <div className="wsh-slide-deck-header">
                  <span>
                    ՍԼԱՅԴՆԵՐԻ ՑԱՆԿ ({safeProjSlideIndex + 1} / {projectionSlides.length})
                  </span>
                  <div className="wsh-slide-step-btns">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = Math.max(0, safeProjSlideIndex - 1);
                        setProjSlideIndex(prev);
                        broadcastProjectionState({ slideIndex: prev });
                      }}
                      disabled={safeProjSlideIndex === 0}
                    >
                      ← Նախորդ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(projectionSlides.length - 1, safeProjSlideIndex + 1);
                        setProjSlideIndex(next);
                        broadcastProjectionState({ slideIndex: next });
                      }}
                      disabled={safeProjSlideIndex >= projectionSlides.length - 1}
                    >
                      Հաջորդ →
                    </button>
                  </div>
                </div>

                <div className="wsh-slides-grid">
                  {projectionSlides.map((sl, idx) => {
                    const isLive = idx === safeProjSlideIndex;
                    return (
                      <button
                        key={`${sl.section}-${idx}`}
                        type="button"
                        className={`wsh-slide-card ${isLive ? 'is-live' : ''}`}
                        onClick={() => {
                          setProjSlideIndex(idx);
                          broadcastProjectionState({ slideIndex: idx });
                        }}
                      >
                        <div className="wsh-slide-card-top">
                          <span className="wsh-slide-num">#{idx + 1}</span>
                          <span className="wsh-slide-sec">{sl.section}</span>
                          {isLive && <span className="wsh-live-pill">LIVE</span>}
                        </div>
                        <p className="wsh-slide-text">{sl.text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: 16:9 Live Output Monitor & Controls */}
              <aside className="wsh-output-monitor-col">
                <div className="wsh-monitor-frame-wrap">
                  <div className="wsh-monitor-topbar">
                    <span className="wsh-monitor-badge">● LIVE OUTPUT PREVIEW</span>
                    <span className="wsh-monitor-mode-tag">{projMode.toUpperCase()}</span>
                  </div>

                  <div className={`wsh-monitor-screen theme-${projTheme} mode-${projMode}`}>
                    {projShowTitle && !projIsBlank && (
                      <div className="wsh-mon-title-bar">
                        <span>{activeSongTitle}</span>
                        {currentProjSlide?.section && <em>{currentProjSlide.section}</em>}
                      </div>
                    )}

                    <div className="wsh-mon-lyric-stage">
                      {projIsBlank ? (
                        <span className="wsh-mon-blackout-label">BLACKOUT (ԷԿՐԱՆԸ ՍԵՎԱՑՎԱԾ Է)</span>
                      ) : (
                        <p>{currentProjSlide?.text}</p>
                      )}
                    </div>

                    {projMode === 'confidence' && nextProjSlide && !projIsBlank && (
                      <div className="wsh-mon-next-line">
                        <span>ՀԱՋՈՐԴԸ՝</span> {nextProjSlide.text.split('\n')[0]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Output Mode & Theme Controls */}
                <div className="wsh-monitor-controls-card">
                  <div className="wsh-mc-row">
                    <button
                      type="button"
                      className={`wsh-mc-toggle ${projIsBlank ? 'danger-active' : ''}`}
                      onClick={() => {
                        const next = !projIsBlank;
                        setProjIsBlank(next);
                        broadcastProjectionState({ isBlank: next });
                      }}
                    >
                      ⬛ Blackout {projIsBlank ? '(ՄԻԱՑՎԱԾ)' : ''}
                    </button>
                    <button
                      type="button"
                      className={`wsh-mc-toggle ${projShowTitle ? 'active' : ''}`}
                      onClick={() => {
                        const next = !projShowTitle;
                        setProjShowTitle(next);
                        broadcastProjectionState({ showTitleOverlay: next });
                      }}
                    >
                      🏷️ Վերնագիր {projShowTitle ? '(ՄԻԱՑՎԱԾ)' : ''}
                    </button>
                  </div>

                  <div className="wsh-mc-group">
                    <label>Էկրանի Ռեժիմ (Output Mode)</label>
                    <div className="wsh-mc-segmented">
                      {[
                        { id: 'beamer', label: 'Beamer (16:9)' },
                        { id: 'lowerthirds', label: 'OBS Stream' },
                        { id: 'confidence', label: 'Բեմի Մոնիտոր' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={projMode === m.id ? 'active' : ''}
                          onClick={() => {
                            setProjMode(m.id);
                            broadcastProjectionState({ mode: m.id });
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wsh-mc-group">
                    <label>Ֆոնային Թեմա</label>
                    <div className="wsh-mc-segmented">
                      {PROJECTION_THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          className={projTheme === th.id ? 'active' : ''}
                          onClick={() => {
                            setProjTheme(th.id);
                            broadcastProjectionState({ theme: th.id });
                          }}
                        >
                          {th.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ================= 5. WORSHIP AI STUDIO (INLINE WORKSTATION) ================= */}
        {activeTab === 'ai_studio' && (
          <div className="wsh-workstation-pane">
            <WorshipAIStudioModal
              inline={true}
              isOpen={true}
              onClose={() => setActiveTab('overview')}
              song={activeSongFull}
              allSongs={songs}
              currentKey={effectiveTonality}
              onApplyChords={(newChordsText) => {
                if (activeSongFull?.id) {
                  setSongDetailsCache((prev) => ({
                    ...prev,
                    [activeSongFull.id]: {
                      ...(prev[activeSongFull.id] || activeSongFull),
                      chords: newChordsText,
                      lyrics: newChordsText,
                    },
                  }));
                }
                setActiveTab('stems');
              }}
            />
          </div>
        )}

        {/* ================= 6. MINISTRY SERVICE PLANNER (EMBEDDED) ================= */}
        {activeTab === 'planner' && (
          <div className="wsh-workstation-pane">
            <ServicePlanner embedded={true} />
          </div>
        )}

        {/* ================= 7. SMART METRONOME & AMBIENT PAD ================= */}
        {activeTab === 'metronome' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-metronome-pad-split">
              <div className="wsh-metronome-col">
                <SmartMetronome
                  initialBpm={Number(activeSongFull?.tempo) || quickBpm}
                  songTitle={activeSongTitle}
                />

                <div className="wsh-tempo-presets-card">
                  <h3>Պաշտամունքի Տեմպերի Շաբլոններ</h3>
                  <div className="wsh-tempo-presets-grid">
                    {[
                      { bpm: 68, name: 'Խորը երկրպագություն', desc: 'Դանդաղ բալլադ (68 BPM)' },
                      { bpm: 76, name: 'Ժամանակակից Worship', desc: 'Միջին-դանդաղ (76 BPM)' },
                      { bpm: 92, name: 'Օրհնության Հիմն', desc: 'Չափավոր քայլերգ (92 BPM)' },
                      { bpm: 118, name: 'Ուրախ Փառաբանություն', desc: 'Աշխույժ ռիթմ (118 BPM)' },
                      { bpm: 128, name: 'Տոնական Կրկներգ', desc: 'Բարձր էներգիա (128 BPM)' },
                    ].map((p) => (
                      <div key={p.bpm} className="wsh-preset-pill">
                        <strong>{p.bpm} BPM</strong>
                        <span>{p.name}</span>
                        <small>{p.desc}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dedicated Ambient Pad Console */}
              <div className="wsh-ambient-console-card">
                <div className="wsh-strip-head">
                  <div className="wsh-strip-title">
                    <StudioIcon name="wave" size={20} />
                    <div>
                      <h3>Ambient Worship Pad Սինթեզատոր</h3>
                      <span>5-ձայնանի դետունավորված ֆոնային Pad՝ մետրոնոմի հետ միաժամանակ նվագելու համար</span>
                    </div>
                  </div>
                </div>

                <div className="wsh-pad-keys-grid large">
                  {PAD_KEYS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      className={`wsh-pad-key-btn ${padKey === k.key ? 'selected' : ''} ${
                        padPlaying && padKey === k.key ? 'sounding' : ''
                      }`}
                      onClick={() => {
                        setPadKey(k.key);
                        if (!padPlaying) startAmbientPad(k.key);
                      }}
                    >
                      <span className="key-name">{k.key}</span>
                      <span className="key-hz">{Math.round(k.freq)} Hz</span>
                    </button>
                  ))}
                </div>

                <div className="wsh-pad-sliders vertical">
                  <label>
                    <div className="slider-label-row">
                      <span>Lowpass Ֆիլտրի Ջերմություն (Cutoff)</span>
                      <strong>{padWarmth} Hz</strong>
                    </div>
                    <input
                      type="range"
                      min="250"
                      max="2400"
                      step="10"
                      value={padWarmth}
                      onChange={(e) => setPadWarmth(Number(e.target.value))}
                    />
                  </label>

                  <label>
                    <div className="slider-label-row">
                      <span>Pad-ի Հնչողության Մակարդակ</span>
                      <strong>{Math.round(padVolume * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.02"
                      value={padVolume}
                      onChange={(e) => setPadVolume(Number(e.target.value))}
                    />
                  </label>

                  <div className="wsh-pad-footer-controls">
                    <label className="wsh-shimmer-check">
                      <input
                        type="checkbox"
                        checked={padShimmer}
                        onChange={(e) => setPadShimmer(e.target.checked)}
                      />
                      <span>Octave Shimmer (Վերին օկտավայի փայլ)</span>
                    </label>

                    <button
                      type="button"
                      className={`wsh-pad-power-btn large ${padPlaying ? 'active' : ''}`}
                      onClick={() => (padPlaying ? stopAmbientPad() : startAmbientPad(padKey))}
                    >
                      <StudioIcon name={padPlaying ? 'stop' : 'play'} size={16} />
                      <span>{padPlaying ? `Կանգնեցնել ${padKey} Pad-ը` : `Միացնել ${padKey} Pad-ը`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
