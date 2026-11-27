import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const SongAudioContext = createContext(null);

export function SongAudioProvider({ children }) {
  const audioRef = useRef(null);
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  const [loopA, setLoopA] = useState(null);
  const [loopB, setLoopB] = useState(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTrack(null);
    setIsPlaying(false);
    setLoopA(null);
    setLoopB(null);
    setIsLoopActive(false);
  }, []);

  // Initialize persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      // A-B Section Loop Handler
      if (isLoopActive && loopA !== null && loopB !== null && loopB > loopA) {
        if (cur >= loopB || cur < loopA) {
          audio.currentTime = loopA;
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [isLoopActive, loopA, loopB]);

  // Native and System MediaSession Integration (Lock screen & background audio controls)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (!track) {
      try {
        if ('playbackState' in navigator.mediaSession) {
          navigator.mediaSession.playbackState = 'paused';
        }
      } catch (_) {}
      try {
        window.NativeAudio?.setBackgroundAudioActive?.(false);
      } catch (_) {}
      return;
    }

    try {
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Worship Track',
          artist: track.artist || 'Worship Platform',
          album: track.songKey ? `Տոնայնություն: ${track.songKey}` : 'Worship Platform',
          artwork: [
            { src: 'https://worship.pmstudio.am/icon-192-v8.png', sizes: '192x192', type: 'image/png' },
            { src: 'https://worship.pmstudio.am/icon-512-v8.png', sizes: '512x512', type: 'image/png' },
          ],
        });
      }
    } catch (_) {}

    try {
      if ('playbackState' in navigator.mediaSession) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    } catch (_) {}

    try {
      window.NativeAudio?.setBackgroundAudioActive?.(isPlaying);
    } catch (_) {}

    const handlers = [
      ['play', () => audioRef.current?.play().catch(() => {})],
      ['pause', () => audioRef.current?.pause()],
      ['stop', () => stopTrack()],
      [
        'seekto',
        (details) => {
          if (details?.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
        },
      ],
      [
        'seekforward',
        (details) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
              audioRef.current.duration || 0,
              audioRef.current.currentTime + (details?.seekOffset || 10)
            );
          }
        },
      ],
      [
        'seekbackward',
        (details) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(
              0,
              audioRef.current.currentTime - (details?.seekOffset || 10)
            );
          }
        },
      ],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (_) {}
    });

    return () => {
      try {
        window.NativeAudio?.setBackgroundAudioActive?.(false);
      } catch (_) {}
      handlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (_) {}
      });
    };
  }, [track, isPlaying, stopTrack]);

  // Position state tracking for lock screen / notification scrub bar
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession) ||
      !track ||
      !duration ||
      duration <= 0 ||
      !isFinite(duration)
    )
      return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: Math.max(0.1, playbackRate || 1),
        position: Math.max(0, Math.min(currentTime || 0, duration)),
      });
    } catch (_) {}
  }, [track, currentTime, duration, playbackRate]);

  const playTrack = useCallback((newTrack) => {
    if (!audioRef.current || !newTrack?.audioUrl) return;
    const audio = audioRef.current;

    if (track?.audioUrl === newTrack.audioUrl) {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      return;
    }

    setTrack(newTrack);
    setLoopA(null);
    setLoopB(null);
    setIsLoopActive(false);
    audio.src = newTrack.audioUrl;
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [track, playbackRate]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, []);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || 0));
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const setPlaybackRate = useCallback((rate) => {
    const clean = Math.max(0.5, Math.min(1.5, Number(rate) || 1.0));
    setPlaybackRateState(clean);
    if (audioRef.current) {
      audioRef.current.playbackRate = clean;
    }
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLoopActive((prev) => {
      const next = !prev;
      if (next && audioRef.current && loopA !== null) {
        audioRef.current.currentTime = loopA;
      }
      return next;
    });
  }, [loopA]);

  const clearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
    setIsLoopActive(false);
  }, []);

  const value = {
    track,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    loopA,
    loopB,
    isLoopActive,
    playTrack,
    pauseTrack,
    togglePlay,
    seek,
    setPlaybackRate,
    setLoopA,
    setLoopB,
    toggleLoop,
    clearLoop,
    stopTrack,
  };

  return (
    <SongAudioContext.Provider value={value}>
      {children}
    </SongAudioContext.Provider>
  );
}

export function useSongAudio() {
  const ctx = useContext(SongAudioContext);
  if (!ctx) {
    throw new Error('useSongAudio must be used within a SongAudioProvider');
  }
  return ctx;
}
