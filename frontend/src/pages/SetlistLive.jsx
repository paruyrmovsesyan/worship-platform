import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { subscribeToTabMessages } from '../utils/webPwaEnhancements';
import { renderWithChords } from '../utils/chordTransposer';
import { triggerHaptic, setupAndroidBackButton } from '../utils/nativeFeatures';
import LiveStageBar from '../components/LiveStageBar';
import './SetlistLive.css';

const KEY_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const getKeyTransitionInfo = (k1, k2) => {
  if (!k1 || !k2) return null;
  const root1 = String(k1).trim().replace(/m$/, '');
  const root2 = String(k2).trim().replace(/m$/, '');
  const semi1 = KEY_SEMITONES[root1];
  const semi2 = KEY_SEMITONES[root2];
  if (semi1 === undefined || semi2 === undefined) return null;

  const diff = (semi2 - semi1 + 12) % 12;
  // If same key (no modulation), do NOT render redundant transition badge
  if (diff === 0) {
    return null;
  }
  if (diff === 7) {
    return { label: `${k1} ➔ ${k2} (Կվինտա / +5th)`, isSmooth: true };
  }
  if (diff === 5) {
    return { label: `${k1} ➔ ${k2} (Կվարտա / +4th)`, isSmooth: true };
  }
  if (diff === 2) {
    return { label: `${k1} ➔ ${k2} (+1 Տոն)`, isSmooth: true };
  }
  if (diff === 1) {
    return { label: `${k1} ➔ ${k2} (+½ Տոն)`, isSmooth: true };
  }
  return { label: `${k1} ➔ ${k2} (${diff > 6 ? diff - 12 : '+' + diff} կտ)`, isSmooth: false };
};

export default function SetlistLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [cachedData] = useState(() => {
    try {
      const raw = localStorage.getItem(`wp_setlist_cache_${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [setlist, setSetlist] = useState(() => cachedData?.setlist || null);
  const [items, setItems] = useState(() => cachedData?.items || []);
  const [loading, setLoading] = useState(() => !cachedData?.items?.length);
  const [error, setError] = useState(null);
  const [activeMetronomeItemId, setActiveMetronomeItemId] = useState(null);
  const [isMetronomeMuted, setIsMetronomeMuted] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isBeatFlashing, setIsBeatFlashing] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stage Stopwatch Timer
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const stopwatchIntervalRef = useRef(null);

  // Modals
  const [previewItem, setPreviewItem] = useState(null);
  const [showPedalHelp, setShowPedalHelp] = useState(false);

  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const beatCountRef = useRef(0);
  const clockRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Setup Android Hardware Back Button
  useEffect(() => {
    return setupAndroidBackButton(() => {
      if (previewItem) {
        setPreviewItem(null);
        return;
      }
      if (showPedalHelp) {
        setShowPedalHelp(false);
        return;
      }
      navigate(`/setlists/${id}`);
    });
  }, [id, previewItem, showPedalHelp, navigate]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    triggerHaptic('light');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Stage Stopwatch logic
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [isStopwatchRunning]);

  const toggleStopwatch = () => {
    triggerHaptic('light');
    setIsStopwatchRunning(prev => !prev);
  };

  const resetStopwatch = (e) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium');
    setIsStopwatchRunning(false);
    setStopwatchSeconds(0);
  };

  const formatStopwatch = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Wake Lock (Prevent screen timeout during live performance)
  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          if (!wakeLockRef.current) {
            const lock = await navigator.wakeLock.request('screen');
            wakeLockRef.current = lock;
            if (isMounted) setWakeLockActive(true);
            lock.addEventListener('release', () => {
              wakeLockRef.current = null;
              if (isMounted) setWakeLockActive(false);
            });
          }
        } catch (err) {
          console.warn('Wake lock error:', err);
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };
  }, []);

  const playClick = useCallback((isAccent = false) => {
    if (isMetronomeMuted) return;
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1500 : 1000, ctx.currentTime);
      gain.gain.setValueAtTime(isAccent ? 1 : 0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  }, [isMetronomeMuted]);

  const triggerBeatPulse = (beatIndex) => {
    setCurrentBeat(beatIndex);
    setIsBeatFlashing(true);
    setTimeout(() => setIsBeatFlashing(false), 90);
  };

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveMetronomeItemId(null);
    setCurrentBeat(0);
    setIsBeatFlashing(false);
  }, []);

  const startMetronome = useCallback((itemId, bpm) => {
    stopMetronome();
    setActiveMetronomeItemId(itemId);
    beatCountRef.current = 0;
    triggerBeatPulse(0);
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    playClick(true);
    const msPerBeat = 60000 / bpm;
    intervalRef.current = setInterval(() => {
      beatCountRef.current = (beatCountRef.current + 1) % 4;
      triggerBeatPulse(beatCountRef.current);
      playClick(beatCountRef.current === 0);
    }, msPerBeat);
  }, [stopMetronome, playClick]);

  const toggleMetronome = useCallback((e, item) => {
    if (e) e.stopPropagation();
    triggerHaptic('light');
    const bpm = item.bpm && parseInt(item.bpm) > 0
      ? parseInt(item.bpm)
      : (item.original_bpm && parseInt(item.original_bpm) > 0 ? parseInt(item.original_bpm) : 0);
    if (!bpm) return;
    if (activeMetronomeItemId === item.id) {
      stopMetronome();
    } else {
      startMetronome(item.id, bpm);
    }
  }, [activeMetronomeItemId, stopMetronome, startMetronome]);

  const getEffectiveBpm = (item) => {
    if (item.bpm && parseInt(item.bpm) > 0) return parseInt(item.bpm);
    if (item.original_bpm && parseInt(item.original_bpm) > 0) return parseInt(item.original_bpm);
    return 0;
  };

  useEffect(() => {
    document.body.classList.add('live-mode-active');
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      document.body.classList.remove('live-mode-active');
      stopMetronome();
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [stopMetronome]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || '';

    let url = `/setlists_api.php?action=get_setlist_items&setlist_id=${id}`;
    if (token) {
      url = `/setlists_api.php?action=get_public_setlist&token=${encodeURIComponent(token)}`;
    }

    const loadData = () => {
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!data || data.error) throw new Error(data?.error || 'Failed to load');
          setSetlist(data.setlist);
          setItems(data.items || []);
          try {
            localStorage.setItem(`wp_setlist_cache_${id}`, JSON.stringify({
              setlist: data.setlist,
              items: data.items || []
            }));
          } catch {}
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          try {
            const raw = localStorage.getItem(`wp_setlist_cache_${id}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.items?.length) {
                setSetlist(parsed.setlist);
                setItems(parsed.items);
                setLoading(false);
                return;
              }
            }
          } catch {}
          setError(t('setlists.errorFetch') || 'Error fetching setlist');
          setLoading(false);
        });
    };

    loadData();

    const unsubscribe = subscribeToTabMessages((msg) => {
      if (msg.action === 'SETLIST_UPDATED' && String(msg.payload?.setlistId) === String(id)) {
        loadData();
      }
    });

    return unsubscribe;
  }, [id, t]);

  // Bluetooth Pedal & Keyboard Navigation (AirTurn, PageFlip, etc.)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const songsOnly = items.filter(i => i.item_type !== 'section');
      if (!songsOnly.length) return;

      const currentIndex = songsOnly.findIndex(s => s.id === focusedItemId);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const nextIdx = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, songsOnly.length - 1);
        const target = songsOnly[nextIdx];
        if (target) {
          triggerHaptic('selection');
          setFocusedItemId(target.id);
          const el = document.querySelector(`[data-live-item-id="${target.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevIdx = currentIndex <= 0 ? 0 : currentIndex - 1;
        const target = songsOnly[prevIdx];
        if (target) {
          triggerHaptic('selection');
          setFocusedItemId(target.id);
          const el = document.querySelector(`[data-live-item-id="${target.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const target = currentIndex >= 0 ? songsOnly[currentIndex] : songsOnly[0];
        if (target) toggleMetronome(e, target);
      } else if (e.key === 'Escape') {
        if (previewItem) setPreviewItem(null);
        if (showPedalHelp) setShowPedalHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedItemId, previewItem, showPedalHelp, toggleMetronome]);

  const songItems = useMemo(() => items.filter(i => i.item_type !== 'section'), [items]);
  const totalSongs = songItems.length;

  // Smart duration estimation
  const durationInfo = useMemo(() => {
    if (!songItems.length) return null;
    let knownMinutes = 0;
    let missingDurationCount = 0;

    for (const s of songItems) {
      const dur = parseInt(s.duration, 10);
      if (dur > 0) {
        knownMinutes += dur;
      } else {
        missingDurationCount++;
      }
    }
    for (const sec of items) {
      if (sec.item_type === 'section') {
        const secDur = parseInt(sec.duration, 10);
        if (secDur > 0) knownMinutes += secDur;
      }
    }

    const estimatedTotal = knownMinutes + (missingDurationCount * 4.5);
    return {
      minutes: Math.round(estimatedTotal),
      isEstimate: missingDurationCount > 0
    };
  }, [items, songItems]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) return (
    <div className="sll-loading">
      <div className="sll-spinner" />
    </div>
  );
  if (error) return <div className="sll-error">{error}</div>;

  const activeItem = activeMetronomeItemId ? items.find(i => i.id === activeMetronomeItemId) : null;
  let songCounter = 0;

  return (
    <div className={`sll-container${isBeatFlashing ? ' sll-beat-pulse-active' : ''}`}>

      {/* ── Balanced 2-Tier Header ── */}
      <header className="sll-header">
        {/* Top Row: Back button, Setlist Name, Tools */}
        <div className="sll-header-top">
          <button
            className="sll-back"
            data-native-route-back="true"
            onClick={() => {
              triggerHaptic('light');
              navigate(`/setlists/${id}`);
            }}
            title="Դուրս գալ"
            aria-label="Back to setlist"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="sll-header-center">
            <div className="sll-live-indicator">
              <span className="sll-pulse-ring" />
              <span className="sll-pulse-dot" />
              <span className="sll-live-label">LIVE</span>
            </div>
            <h1 className="sll-setlist-name" title={setlist?.name}>
              {setlist?.name || t('setlists.title', 'Երգացանկ')}
            </h1>
          </div>

          <div className="sll-header-actions">
            <button
              className="sll-hdr-tool"
              onClick={() => {
                triggerHaptic('light');
                setShowPedalHelp(true);
              }}
              title="Bluetooth ոտնակի կարգավորումներ"
              aria-label="Pedal controls"
            >
              🦶
            </button>
            <button
              className="sll-hdr-tool"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Դուրս գալ լիաէկրանից' : 'Լիաէկրան'}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? '↙↗' : '⛶'}
            </button>
          </div>
        </div>

        {/* Bottom Row: Info badges on left, Clock & Stopwatch on right */}
        <div className="sll-header-bottom">
          <div className="sll-header-meta">
            <span className="sll-song-count">{totalSongs} երգ</span>
            {durationInfo && (
              <span className="sll-dur-badge" title={durationInfo.isEstimate ? 'Մոտավոր ընդհանուր տևողություն' : 'Ընդհանուր տևողություն'}>
                ⏱ {durationInfo.isEstimate ? `~${durationInfo.minutes}` : durationInfo.minutes} ր
              </span>
            )}
            {wakeLockActive && (
              <span className="sll-wake-pill" title="Էկրանը բեմի վրա չի անջատվի">
                ☀️ Արթուն
              </span>
            )}
            {!isOnline && (
              <span className="sll-offline-pill" title="Անցանց ռեժիմ (քեշից)">
                📡 Օֆլայն
              </span>
            )}
          </div>

          <div className="sll-header-timers">
            <div className="sll-clock">{formatTime(currentTime)}</div>
            <button
              type="button"
              className={`sll-stopwatch-btn${isStopwatchRunning ? ' running' : ''}`}
              onClick={toggleStopwatch}
              title={isStopwatchRunning ? 'Կանգնեցնել ժամաչափը' : 'Սկսել բեմական ժամաչափը'}
            >
              <span className="sll-stopwatch-icon">{isStopwatchRunning ? '⏸' : '▶'}</span>
              <span>{formatStopwatch(stopwatchSeconds)}</span>
              {stopwatchSeconds > 0 && (
                <span
                  className="sll-stopwatch-reset"
                  onClick={resetStopwatch}
                  title="Զրոյացնել"
                >
                  ↺
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Live Stage Broadcast / Band Follower Bar ── */}
      <div style={{ padding: '0 16px', maxWidth: '800px', margin: '0 auto 12px auto', width: '100%', boxSizing: 'border-box' }}>
        <LiveStageBar
          sessionId={`SETLIST-${id}`}
          isLeader={true}
          onFollowSongChange={(songId) => navigate(`/song/${songId}?setlist_id=${id}`)}
        />
      </div>

      {/* ── Song List ── */}
      <main className="sll-list">
        {items.map((item, idx) => {

          /* Section Header */
          if (item.item_type === 'section') {
            return (
              <div key={item.id} className="sll-section">
                <div className="sll-section-inner">
                  <div className="sll-section-line" />
                  <span className="sll-section-title">{item.title}</span>
                  <div className="sll-section-line" />
                </div>
                {item.duration && (
                  <span className="sll-section-dur">⏱ {item.duration} ր</span>
                )}
              </div>
            );
          }

          /* Song Card */
          songCounter++;
          const bpm = getEffectiveBpm(item);
          const isActive = activeMetronomeItemId === item.id;
          const isFocused = focusedItemId === item.id;

          const nextSong = items.slice(idx + 1).find(i => i.item_type !== 'section');
          const currentKey = item.target_key || item.song_key;
          const nextKey = nextSong ? (nextSong.target_key || nextSong.song_key) : null;
          const harmonicFlow = (currentKey && nextKey) ? getKeyTransitionInfo(currentKey, nextKey) : null;

          return (
            <React.Fragment key={item.id}>
              <div
                data-live-item-id={item.id}
                className={`sll-card${isActive ? ' sll-card--active' : ''}${isFocused ? ' sll-card--focused' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  const q = new URLSearchParams();
                  if (id) q.set('setlist_id', String(id));
                  if (item.id) q.set('setlist_item_id', String(item.id));
                  if (item.target_key) q.set('tkey', item.target_key);
                  if (item.capo) {
                    q.set('capo', String(item.capo));
                    q.set('capo_mode', '1');
                  }
                  const token = new URLSearchParams(window.location.search).get('token');
                  if (token) q.set('setlist_token', token);
                  q.set('from_live', '1');
                  const qStr = q.toString();
                  navigate(`/song/${item.song_id}${qStr ? '?' + qStr : ''}`);
                }}
              >
                {/* Number */}
                <div className={`sll-card-num${isActive ? ' sll-card-num--active' : ''}`}>
                  {String(songCounter).padStart(2, '0')}
                </div>

                {/* Body */}
                <div className="sll-card-body">
                  <div className="sll-card-title">{getLocalizedTitle(item, language)}</div>

                  {(item.artist || item.song_artist) && (
                    <div className="sll-card-artist">{item.artist || item.song_artist}</div>
                  )}

                  {/* Chips: Key, Capo, BPM, Duration, Quick Chords */}
                  <div className="sll-card-chips">
                    {item.target_key && (
                      <span className="sll-chip sll-chip--key">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3"/></svg>
                        {item.target_key}
                      </span>
                    )}
                    {item.capo && parseInt(item.capo) > 0 && (
                      <span className="sll-chip sll-chip--capo" title={`Կապոդաստր ${item.capo}-րդ լադ`}>
                        🎸 Capo {item.capo}
                      </span>
                    )}
                    {bpm > 0 && (
                      <button
                        type="button"
                        className={`sll-chip sll-chip--bpm${isActive ? ' sll-chip--bpm-active' : ''}`}
                        onClick={e => toggleMetronome(e, item)}
                        title="Մետրոնոմ (սեղմեք միացնելու/անջատելու համար)"
                      >
                        {isActive
                          ? <><span className="sll-beat-dot" /><span className="sll-beat-dot sll-beat-dot--2" /><span className="sll-beat-dot sll-beat-dot--3" /></>
                          : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1zm0 4c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm1-8h-2v5h5v-2h-3V9z"/></svg>
                        }
                        {bpm} BPM
                      </button>
                    )}
                    {item.duration && (
                      <span className="sll-chip sll-chip--dur">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {item.duration} ր
                      </span>
                    )}

                    {/* Integrated Quick Chords Sheet Pill */}
                    <button
                      type="button"
                      className="sll-chip sll-chip--sheet"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        setPreviewItem(item);
                      }}
                      title="Տեսնել ակորդները տեղում"
                      aria-label="Preview chords"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Ակորդներ
                    </button>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="sll-card-notes">📝 {item.notes}</div>
                  )}

                  {/* Role Assignments */}
                  {item.assignments && item.assignments.length > 0 && (
                    <div className="sll-card-roles">
                      {item.assignments.map(a => (
                        <span key={a.id} className="sll-role-tag">
                          <span className="sll-role-name">{a.role_name}</span>
                          <span className="sll-role-user">{a.user_name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="sll-card-arrow">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* ── Inter-Song Transitions (Only show when there is an actual modulation or explicit transition) ── */}
              {(item.transition_type || harmonicFlow) && idx < items.length - 1 && (
                <div className="sll-transition-flow-wrap">
                  {item.transition_type && (
                    <span className="sll-transition-badge">
                      {item.transition_type === 'crossfade' && (
                        <><span className="sll-tr-icon">⇌</span> Սահուն անցում</>
                      )}
                      {item.transition_type === 'stop' && (
                        <><span className="sll-tr-icon">■</span> Դադար</>
                      )}
                      {item.transition_type !== 'crossfade' && item.transition_type !== 'stop' && (
                        <><span className="sll-tr-icon">💬</span> Խոսք / Աղոթք</>
                      )}
                    </span>
                  )}
                  {harmonicFlow && (
                    <span
                      className={`sll-harmonic-badge ${harmonicFlow.isSmooth ? 'smooth' : 'jump'}`}
                      title={`Հաջորդ երգի տոնայնությունը՝ ${currentKey} ➔ ${nextKey}`}
                    >
                      🎵 {harmonicFlow.label}
                    </span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="sll-end-marker">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
          Ավարտ
        </div>
      </main>

      {/* ── Floating Metronome Bar ── */}
      {activeItem && (() => {
        const bpm = getEffectiveBpm(activeItem);
        return (
          <div className={`sll-metro${isBeatFlashing ? ' flash' : ''}`}>
            {/* Visual Beat Indicator (1, 2, 3, 4) */}
            <div className="sll-metro-visual-beats" title={`Հարված ${currentBeat + 1}/4`}>
              {[0, 1, 2, 3].map(b => (
                <span
                  key={b}
                  className={`sll-beat-circle${currentBeat === b ? ' active' : ''}${b === 0 ? ' accent' : ''}`}
                />
              ))}
            </div>

            <div className="sll-metro-info">
              <span className="sll-metro-song">{getLocalizedTitle(activeItem, language)}</span>
              <span className="sll-metro-bpm">
                {bpm} <small>BPM</small>
              </span>
            </div>

            {/* Mute / Silent Stage Visual Toggle */}
            <button
              type="button"
              className={`sll-metro-tool-btn${isMetronomeMuted ? ' muted' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setIsMetronomeMuted(prev => !prev);
              }}
              title={isMetronomeMuted ? 'Միացնել ձայնը' : 'Լուռ տեսողական ֆլեշ (Visual Only)'}
              aria-label="Toggle metronome sound"
            >
              {isMetronomeMuted ? '🔇' : '🔊'}
            </button>

            {/* Stop Metronome */}
            <button
              type="button"
              className="sll-metro-stop"
              onClick={() => {
                triggerHaptic('light');
                stopMetronome();
              }}
              aria-label="Stop metronome"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        );
      })()}

      {/* ── Quick Chords Sheet Modal (Inside Live Mode) ── */}
      {previewItem && (
        <div className="sll-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="sll-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="sll-modal-handle" />
            <div className="sll-modal-header">
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className="sll-modal-title">{getLocalizedTitle(previewItem, language)}</h3>
                <div className="sll-modal-sub">
                  {(previewItem.artist || previewItem.song_artist) && (
                    <span>{previewItem.artist || previewItem.song_artist}</span>
                  )}
                  {previewItem.target_key && (
                    <span className="sll-chip sll-chip--key">{previewItem.target_key}</span>
                  )}
                  {previewItem.capo && parseInt(previewItem.capo) > 0 && (
                    <span className="sll-chip sll-chip--capo">Capo {previewItem.capo}</span>
                  )}
                  {getEffectiveBpm(previewItem) > 0 && (
                    <span className="sll-chip sll-chip--bpm">{getEffectiveBpm(previewItem)} BPM</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="sll-modal-close"
                onClick={() => setPreviewItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="sll-modal-body">
              {previewItem.chords || previewItem.lyrics ? (
                <div
                  className="sll-chords-render"
                  dangerouslySetInnerHTML={{
                    __html: renderWithChords(previewItem.chords || previewItem.lyrics || '', 0, false)
                  }}
                />
              ) : (
                <div className="sll-modal-empty">
                  <span>ℹ️ Այս երգի համար ակորդներ կամ բառեր մուտքագրված չեն։</span>
                </div>
              )}
            </div>

            <div className="sll-modal-footer">
              <button
                type="button"
                className="sll-modal-open-full"
                onClick={() => {
                  triggerHaptic('light');
                  const q = new URLSearchParams();
                  if (id) q.set('setlist_id', String(id));
                  if (previewItem.id) q.set('setlist_item_id', String(previewItem.id));
                  if (previewItem.target_key) q.set('tkey', previewItem.target_key);
                  if (previewItem.capo) {
                    q.set('capo', String(previewItem.capo));
                    q.set('capo_mode', '1');
                  }
                  q.set('from_live', '1');
                  navigate(`/song/${previewItem.song_id}?${q.toString()}`);
                }}
              >
                📖 Բացել Ամբողջական Երգը
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bluetooth Pedal / Controls Help Modal ── */}
      {showPedalHelp && (
        <div className="sll-modal-overlay" onClick={() => setShowPedalHelp(false)}>
          <div className="sll-modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="sll-modal-handle" />
            <div className="sll-modal-header">
              <div>
                <h3 className="sll-modal-title">🦶 Bluetooth ոտնակ և ստեղներ</h3>
                <p className="sll-modal-desc">Կառավարեք երգացանկը բեմի վրա առանց էկրանին դիպչելու</p>
              </div>
              <button
                type="button"
                className="sll-modal-close"
                onClick={() => setShowPedalHelp(false)}
              >
                ✕
              </button>
            </div>

            <div className="sll-modal-body" style={{ maxHeight: '60vh' }}>
              <div className="sll-shortcut-list">
                <div className="sll-shortcut-row">
                  <span className="sll-key-badge">➔  /  ↓  /  Space  /  PageDown</span>
                  <span className="sll-key-desc">Հաջորդ երգ (Next Song)</span>
                </div>
                <div className="sll-shortcut-row">
                  <span className="sll-key-badge">⬅  /  ↑  /  PageUp</span>
                  <span className="sll-key-desc">Նախորդ երգ (Previous Song)</span>
                </div>
                <div className="sll-shortcut-row">
                  <span className="sll-key-badge">M</span>
                  <span className="sll-key-desc">Մետրոնոմի միացում / դադարեցում</span>
                </div>
                <div className="sll-shortcut-row">
                  <span className="sll-key-badge">Esc</span>
                  <span className="sll-key-desc">Փակել բացված պատուհանները</span>
                </div>
              </div>

              <div className="sll-pedal-tip-box">
                💡 <strong>Համատեղելիություն՝</strong> Աշխատում է AirTurn (BT200/BT500), PageFlip, Donner, Coda Stompbox և ցանկացած Bluetooth կամ USB ոտնակի հետ (Mode 1 կամ Mode 3):
              </div>
            </div>

            <div className="sll-modal-footer">
              <button
                type="button"
                className="sll-modal-open-full"
                onClick={() => setShowPedalHelp(false)}
              >
                Հասկանալի է
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
