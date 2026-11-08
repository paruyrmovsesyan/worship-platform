import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { useFeatureFlags } from '../utils/featureFlags';
import { useIsPWA } from '../hooks/useIsPWA';
import { FeatureDisabledScreen } from '../components/BetaBadge';
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
  { id: 'space', label: 'Մութ կապույտ' },
  { id: 'purple', label: 'Մանուշակագույն' },
  { id: 'ocean', label: 'Փիրուզագույն' },
  { id: 'black', label: 'Մաքուր սև' },
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

function StudioIcon({ name, size = 20 }) {
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
  const { isEnabled } = useFeatureFlags();
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

  // Musical context
  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [chordFontSize, setChordFontSize] = useState(15);
  const [showStemsChordPanel, setShowStemsChordPanel] = useState(false);

  // Live Stage state
  const [liveSessionState, setLiveSessionState] = useState(() =>
    typeof liveStageSync.getState === 'function' ? liveStageSync.getState() : liveStageSync.currentState || null
  );
  const [customCueText, setCustomCueText] = useState('');
  const [stageNotice, setStageNotice] = useState('');

  // Projection state
  const [projSlideIndex, setProjSlideIndex] = useState(0);
  const [projIsBlank, setProjIsBlank] = useState(false);
  const [projShowTitle, setProjShowTitle] = useState(true);
  const [projTheme, setProjTheme] = useState('space');
  const [projMode, setProjMode] = useState('beamer');

  // Ambient Pad state
  const [padPlaying, setPadPlaying] = useState(false);
  const [padKey, setPadKey] = useState('C');
  const [padVolume, setPadVolume] = useState(0.5);
  const padAudioRef = useRef({ ctx: null, masterGain: null, filter: null, oscs: [] });

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

  // Fetch songs list
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

  // Fetch full song details (lyrics, chords, stems)
  useEffect(() => {
    const songId = selectedSong?.id;
    if (!songId) return;

    setTransposeSemitones(0);
    setProjSlideIndex(0);

    if (selectedSong?.tonality) {
      const cleanRoot = String(selectedSong.tonality).replace(/m.*$/i, '').trim();
      const matchedPad = PAD_KEYS.find((k) => k.key.toLowerCase() === cleanRoot.toLowerCase());
      if (matchedPad && !padPlaying) {
        setPadKey(matchedPad.key);
      }
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

  const projectionSlides = useMemo(
    () => parseProjectionSlides(activeSongFull?.lyrics || activeSongFull?.chords || '', loadingSongDetail),
    [activeSongFull, loadingSongDetail]
  );

  const safeProjSlideIndex = Math.min(Math.max(0, projSlideIndex), Math.max(0, projectionSlides.length - 1));
  const currentProjSlide = projectionSlides[safeProjSlideIndex] || { section: '', text: '' };
  const nextProjSlide = projectionSlides[safeProjSlideIndex + 1] || null;

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

  // Ambient Pad Audio
  const stopAmbientPad = useCallback(() => {
    const ref = padAudioRef.current;
    if (ref.ctx && ref.masterGain) {
      try {
        const now = ref.ctx.currentTime;
        ref.masterGain.gain.cancelScheduledValues(now);
        ref.masterGain.gain.setValueAtTime(ref.masterGain.gain.value, now);
        ref.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
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
        }, 550);
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
        filter.frequency.value = 780;
        filter.Q.value = 0.7;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(padVolume * 0.35, ctx.currentTime + 1.0);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        const intervals = [
          { mult: 0.5, type: 'sine', detune: -4, gain: 0.45 },
          { mult: 1, type: 'sawtooth', detune: -7, gain: 0.28 },
          { mult: 1, type: 'triangle', detune: 6, gain: 0.32 },
          { mult: 1.4983, type: 'sawtooth', detune: -5, gain: 0.22 },
          { mult: 2, type: 'sine', detune: 8, gain: 0.2 },
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
    [padKey, padVolume, stopAmbientPad]
  );

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
      if (ref.masterGain) ref.masterGain.gain.setTargetAtTime(padVolume * 0.35, ref.ctx.currentTime, 0.1);
    } catch {}
  }, [padVolume, padPlaying]);

  useEffect(() => {
    return () => {
      if (padAudioRef.current.ctx) {
        try {
          padAudioRef.current.ctx.close();
        } catch {}
      }
    };
  }, []);

  const triggerStageCue = useCallback(
    (cueText) => {
      if (!liveStageSync.sessionId) {
        liveStageSync.createSession({
          song_id: activeSongFull?.id || null,
          song_title: activeSongTitle,
          transpose: transposeSemitones,
          bpm: Number(activeSongFull?.tempo) || 76,
          stage_message: cueText,
        });
      } else {
        liveStageSync.sendStageMessage(cueText);
      }
      setStageNotice(`Ուղարկվեց բեմ՝ «${cueText}»`);
      setTimeout(() => setStageNotice(''), 2800);
    },
    [activeSongFull, activeSongTitle, transposeSemitones]
  );

  // Simple, clear Armenian module definitions
  const studioModules = useMemo(() => {
    const list = [
      {
        id: 'stems',
        flag: 'rehearsal_stems',
        icon: 'stems',
        title: 'Աուդիո Միքսեր (Stems)',
        shortTitle: 'Միքսեր',
        subtitle: 'Առանձնացրեք վոկալը, դաշնամուրը, կիթառը կամ հարվածայինները՝ երգը հեշտ սովորելու և փորձելու համար։',
        cta: 'Բացել Միքսերը',
        accent: '#38bdf8',
      },
      {
        id: 'live_stage',
        flag: 'live_stage_follower',
        icon: 'live_stage',
        title: 'Խմբի Ուղիղ Կապ (Live Բեմ)',
        shortTitle: 'Live Բեմ',
        subtitle: 'Միացրեք երաժիշտների հեռախոսները մեկ ընդհանուր սեսիայի մեջ և ուղարկեք հուշումներ բեմին։',
        cta: 'Բացել Live Կապը',
        accent: '#f59e0b',
      },
      {
        id: 'projection',
        flag: 'lyrics_projection',
        icon: 'projection',
        title: 'Էկրանի Բառեր (Պրոյեկտոր)',
        shortTitle: 'Պրոյեկտոր',
        subtitle: 'Ցուցադրեք երգի բառերը եկեղեցու մեծ էկրանին կամ ուղիղ եթերում՝ սլայդ առ սլայդ։',
        cta: 'Բացել Սլայդները',
        accent: '#a855f7',
      },
      {
        id: 'ai_studio',
        flag: 'worship_ai_studio',
        icon: 'ai_studio',
        title: 'AI Ակորդների Օգնական',
        shortTitle: 'AI Ակորդներ',
        subtitle: 'Ավտոմատ տեղադրեք, պարզեցրեք կամ հարմարեցրեք երգի ակորդներն ու Capo-ն ըստ երաժշտական ոճի։',
        cta: 'Բացել AI Օգնականը',
        accent: '#ec4899',
      },
      {
        id: 'planner',
        flag: 'service_planner',
        icon: 'planner',
        title: 'Ծառայության Պլանավորիչ',
        shortTitle: 'Պլանավորիչ',
        subtitle: 'Կազմեք ծառայության հերթականությունը՝ երգեր, աղոթք, քարոզ և մասնակից երաժիշտների ցանկ։',
        cta: 'Բացել Պլանավորիչը',
        accent: '#10b981',
      },
      {
        id: 'metronome',
        flag: 'pro_studio',
        icon: 'metronome',
        title: 'Մետրոնոմ և Ֆոնային Pad',
        shortTitle: 'Մետրոնոմ & Pad',
        subtitle: 'Ճշգրիտ ռիթմի հաշվիչ (BPM) և մեղմ ֆոնային երաժշտություն աղոթքի ու երգերի անցումների համար։',
        cta: 'Բացել Մետրոնոմը',
        accent: '#6366f1',
      },
    ];

    return list.filter((m) => isEnabled(m.flag));
  }, [isEnabled]);

  const activeModuleMeta = useMemo(
    () => studioModules.find((m) => m.id === activeTab) || null,
    [studioModules, activeTab]
  );

  if (!isEnabled('pro_studio') && studioModules.length === 0) {
    return (
      <div className="worship-studio-hub-page">
        <FeatureDisabledScreen
          title="Ստուդիա բաժինն անջատված է"
          description="Այս բաժինը ժամանակավորապես անջատված է կառավարման վահանակից:"
          backUrl="/songs"
          backLabel="Գնալ Երգարան"
        />
      </div>
    );
  }

  return (
    <div className={`worship-studio-hub-page ${isAppMode ? 'is-app-surface' : 'is-web-surface'}`}>
      {/* Simple Header */}
      <header className="wsh-simple-header">
        <div className="wsh-simple-header-left">
          {activeTab !== 'overview' ? (
            <button
              type="button"
              className="wsh-back-to-hub-btn"
              onClick={() => setActiveTab('overview')}
            >
              <StudioIcon name="chevronLeft" size={18} />
              <span>Բոլոր գործիքները</span>
            </button>
          ) : isAppMode ? (
            <button
              type="button"
              className="wsh-back-to-hub-btn"
              onClick={() => navigate('/songs')}
            >
              <StudioIcon name="chevronLeft" size={18} />
              <span>Երգարան</span>
            </button>
          ) : null}

          <div className="wsh-simple-titles">
            <h1>{activeModuleMeta ? activeModuleMeta.title : 'Ստուդիա և Բեմ'}</h1>
            <p>
              {activeModuleMeta
                ? activeModuleMeta.subtitle
                : 'Ընտրեք երգը և բացեք անհրաժեշտ գործիքը՝ փորձի կամ ծառայության համար'}
            </p>
          </div>
        </div>

        {/* Simple Song Selector & Key Control (hidden only in Planner which manages multiple items) */}
        {activeTab !== 'planner' && (
          <div className="wsh-simple-song-bar" ref={pickerRef}>
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
                  <span className="wsh-song-selector-eyebrow">ԸՆՏՐՎԱԾ ԵՐԳ</span>
                  <span className="wsh-song-selector-title">
                    {loadingSongs && !activeSongFull ? 'Բեռնվում է...' : activeSongTitle}
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
                      placeholder="Որոնել երգ..."
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
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="wsh-transpose-widget" title="Փոխել երգի տոնայնությունը">
              <span className="wsh-widget-label">ՏՈՆ</span>
              <button
                type="button"
                className="wsh-tr-btn"
                onClick={() => setTransposeSemitones((t) => t - 1)}
                aria-label="Իջեցնել տոնը"
              >
                −
              </button>
              <button
                type="button"
                className={`wsh-tr-val ${transposeSemitones !== 0 ? 'modified' : ''}`}
                onClick={() => setTransposeSemitones(0)}
                title="Սեղմեք՝ սկզբնական տոնայնությանը վերադառնալու համար"
              >
                <strong>{effectiveTonality}</strong>
              </button>
              <button
                type="button"
                className="wsh-tr-btn"
                onClick={() => setTransposeSemitones((t) => t + 1)}
                aria-label="Բարձրացնել տոնը"
              >
                +
              </button>
            </div>

            {activeSongFull?.id && (
              <button
                type="button"
                className="wsh-open-song-link"
                onClick={() => navigate(`/song/${activeSongFull.id}`)}
                title="Բացել երգի էջը"
              >
                <StudioIcon name="external" size={14} />
                <span>Երգի էջ</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Simple Tab Switcher when inside a tool */}
      {activeTab !== 'overview' && (
        <nav className="wsh-dock-nav" aria-label="Գործիքների ցանկ">
          <button
            type="button"
            className="wsh-dock-tab"
            onClick={() => setActiveTab('overview')}
          >
            <StudioIcon name="overview" size={16} />
            <span>Բոլորը</span>
          </button>

          {studioModules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              className={`wsh-dock-tab ${activeTab === mod.id ? 'active' : ''}`}
              style={{ '--tab-accent': mod.accent }}
              onClick={() => setActiveTab(mod.id)}
            >
              <StudioIcon name={mod.icon} size={16} />
              <span>{mod.shortTitle}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Main Content */}
      <div className="wsh-viewport">
        {/* ================= 1. SIMPLE OVERVIEW LAUNCHER ================= */}
        {activeTab === 'overview' && (
          <div className="wsh-bento-grid">
            {studioModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                className="wsh-bento-card"
                style={{ '--card-accent': mod.accent }}
                onClick={() => setActiveTab(mod.id)}
              >
                <div className="wsh-bento-top">
                  <div className="wsh-bento-icon">
                    <StudioIcon name={mod.icon} size={24} />
                  </div>
                  <div className="wsh-bento-title-wrap">
                    <h2>{mod.title}</h2>
                  </div>
                </div>

                <p>{mod.subtitle}</p>

                <div className="wsh-bento-footer">
                  <span className="wsh-bento-cta">{mod.cta}</span>
                  <span className="wsh-bento-arrow">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ================= 2. STEMS MIXER ================= */}
        {activeTab === 'stems' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-simple-pane-bar">
              <span>Կառավարեք առանձին գործիքների ձայնը և տեմպը</span>
              <button
                type="button"
                className={`wsh-toggle-chord-pane-btn ${showStemsChordPanel ? 'active' : ''}`}
                onClick={() => setShowStemsChordPanel((v) => !v)}
              >
                {showStemsChordPanel ? 'Թաքցնել բառերն ու ակորդները' : '📄 Ցույց տալ բառերն ու ակորդները'}
              </button>
            </div>

            <div className={`wsh-stems-split ${showStemsChordPanel ? 'with-chords' : 'full-mixer'}`}>
              <div className="wsh-stems-mixer-col">
                <SongStemsMixer
                  songId={activeSongFull?.id}
                  songTitle={activeSongTitle}
                  songKey={effectiveTonality}
                  songBpm={Number(activeSongFull?.tempo) || 76}
                  stemsData={activeSongFull?.stems || null}
                  fallbackAudioUrl={activeSongFull?.audio_url || ''}
                />
              </div>

              {showStemsChordPanel && (
                <aside className="wsh-live-chord-sheet">
                  <div className="wsh-chord-sheet-header">
                    <h3>
                      {activeSongTitle} <span className="wsh-cs-key">({effectiveTonality})</span>
                    </h3>
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

        {/* ================= 3. LIVE STAGE ================= */}
        {activeTab === 'live_stage' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-simple-steps-banner">
              <span><strong>1.</strong> Սեղմեք «Սկսել Live»</span>
              <span><strong>2.</strong> Երաժիշտները միանում են կոդով</span>
              <span><strong>3.</strong> Սեղմեք հուշման կոճակին՝ բեմ ուղարկելու համար</span>
            </div>

            {stageNotice && <div className="wsh-stage-toast">{stageNotice}</div>}

            <LiveStageBar
              currentSong={activeSongFull}
              currentTranspose={transposeSemitones}
              currentCapo={0}
              currentBpm={Number(activeSongFull?.tempo) || 76}
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

            <div className="wsh-stage-deck-card">
              <div className="wsh-card-head">
                <h3>Արագ հուշումներ բեմի համար</h3>
                <span>Սեղմեք կոճակին՝ բոլոր միացված երաժիշտների էկրանին ցուցադրելու համար</span>
              </div>

              <div className="wsh-cue-pads-grid">
                {[
                  { label: 'Կրկներգ 2x', sub: 'Կրկնել կրկներգը', accent: '#38bdf8' },
                  { label: 'Տուն 1', sub: 'Վերադարձ սկիզբ', accent: '#818cf8' },
                  { label: 'Կամուրջ', sub: 'Անցում կամուրջին', accent: '#c084fc' },
                  { label: 'Միայն Ձայներ', sub: 'Գործիքները լռում են', accent: '#10b981' },
                  { label: 'Աղոթք / Pad', sub: 'Միայն մեղմ ստեղնաշար', accent: '#f59e0b' },
                  { label: 'Ուժեղացնել ↑', sub: 'Դինամիկ աճ', accent: '#f97316' },
                  { label: 'Սոլո', sub: 'Գործիքային հատված', accent: '#ec4899' },
                  { label: 'Հանգիստ ավարտ', sub: 'Դանդաղեցնել և ավարտել', accent: '#64748b' },
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
                  placeholder="Գրել հաղորդագրություն բեմի համար..."
                  value={customCueText}
                  onChange={(e) => setCustomCueText(e.target.value)}
                />
                <button type="submit">Ուղարկել</button>
              </form>

              <div className="wsh-section-broadcaster">
                <span className="wsh-sb-label">Երգի հատվածներ՝</span>
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
          </div>
        )}

        {/* ================= 4. PROJECTION ================= */}
        {activeTab === 'projection' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-simple-pane-bar">
              <span>Սեղմեք սլայդի վրա՝ այն մեծ էկրանին ցուցադրելու համար</span>
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
                <span>Բացել Պրոյեկտորի Էկրանը</span>
              </button>
            </div>

            <div className="wsh-presenter-console">
              <div className="wsh-slide-deck">
                <div className="wsh-slide-deck-header">
                  <span>
                    Սլայդ {safeProjSlideIndex + 1} / {projectionSlides.length}
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
                          {isLive && <span className="wsh-live-pill">ԷԿՐԱՆԻՆ</span>}
                        </div>
                        <p className="wsh-slide-text">{sl.text}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="wsh-output-monitor-col">
                <div className="wsh-monitor-frame-wrap">
                  <div className="wsh-monitor-topbar">
                    <span className="wsh-monitor-badge">● ԷԿՐԱՆԻ ՆԱԽԱԴԻՏՈՒՄ</span>
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
                        <span className="wsh-mon-blackout-label">ԷԿՐԱՆԸ ՍԵՎԱՑՎԱԾ Է</span>
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
                      ⬛ Սև էկրան {projIsBlank ? '(Միացված)' : ''}
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
                      🏷️ Վերնագիր {projShowTitle ? '(Միացված)' : ''}
                    </button>
                  </div>

                  <div className="wsh-mc-group">
                    <label>Էկրանի տեսակը</label>
                    <div className="wsh-mc-segmented">
                      {[
                        { id: 'beamer', label: 'Պրոյեկտոր' },
                        { id: 'lowerthirds', label: 'Սթրիմ / OBS' },
                        { id: 'confidence', label: 'Բեմի էկրան' },
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
                    <label>Ֆոնի գույնը</label>
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

        {/* ================= 5. AI STUDIO ================= */}
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

        {/* ================= 6. SERVICE PLANNER ================= */}
        {activeTab === 'planner' && (
          <div className="wsh-workstation-pane">
            <ServicePlanner embedded={true} />
          </div>
        )}

        {/* ================= 7. METRONOME & PAD ================= */}
        {activeTab === 'metronome' && (
          <div className="wsh-workstation-pane">
            <div className="wsh-metronome-pad-split">
              <div className="wsh-metronome-col">
                <SmartMetronome
                  initialBpm={Number(activeSongFull?.tempo) || 76}
                  songTitle={activeSongTitle}
                />
              </div>

              <div className="wsh-ambient-console-card">
                <div className="wsh-strip-head">
                  <div className="wsh-strip-title">
                    <StudioIcon name="wave" size={20} />
                    <div>
                      <h3>Ֆոնային Աղոթքի Pad</h3>
                      <span>Ընտրեք տոնայնությունը՝ մեղմ ֆոնային հնչողություն միացնելու համար</span>
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
                    </button>
                  ))}
                </div>

                <div className="wsh-pad-sliders vertical">
                  <label>
                    <div className="slider-label-row">
                      <span>Ձայնի ուժգնություն</span>
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

                  <button
                    type="button"
                    className={`wsh-pad-power-btn large ${padPlaying ? 'active' : ''}`}
                    onClick={() => (padPlaying ? stopAmbientPad() : startAmbientPad(padKey))}
                  >
                    <StudioIcon name={padPlaying ? 'stop' : 'play'} size={16} />
                    <span>{padPlaying ? `Անջատել Pad-ը (${padKey})` : `Միացնել Pad-ը (${padKey})`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
