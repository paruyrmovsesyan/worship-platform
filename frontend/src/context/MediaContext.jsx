import { useState, useRef, useEffect, useCallback } from 'react';
import { CHRISTIAN_RADIO_STATIONS, MediaContext } from '../utils/mediaData';

export function MediaProvider({ children }) {
  const audioRef = useRef(null);
  const synthRef = useRef({ ctx: null, masterGain: null, timerId: null, oscs: [], active: false });
  const activeStationRef = useRef(null);
  const mutedRef = useRef(false);

  const [activeStation, setActiveStation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [streamError, setStreamError] = useState('');

  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const stopSynthEngine = useCallback(() => {
    const s = synthRef.current;
    if (s.timerId) {
      clearInterval(s.timerId);
      s.timerId = null;
    }
    if (s.oscs && s.oscs.length > 0) {
      s.oscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {}
      });
      s.oscs = [];
    }
    if (s.ctx) {
      try {
        s.ctx.close();
      } catch {}
      s.ctx = null;
      s.masterGain = null;
    }
    s.active = false;
  }, []);

  const startSynthFallback = useCallback(
    (station) => {
      stopSynthEngine();
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        const ctx = new AudioCtx();
        const profile = station?.synthProfile || { rootFreq: 130.81, tempoMs: 4500 };
        const baseFreq = profile.rootFreq || 130.81;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 820;
        filter.Q.value = 0.7;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(mutedRef.current ? 0.0001 : 0.22, ctx.currentTime + 0.9);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Warm continuous pad voices (I - V - VIII)
        const padMults = [
          { mult: 0.5, type: 'sine', detune: -4, gain: 0.42 },
          { mult: 1, type: 'triangle', detune: 5, gain: 0.35 },
          { mult: 1.4983, type: 'sawtooth', detune: -6, gain: 0.18 },
          { mult: 2, type: 'sine', detune: 7, gain: 0.2 },
        ];

        const oscs = padMults.map((v) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = v.type;
          osc.frequency.value = baseFreq * v.mult;
          osc.detune.value = v.detune;
          g.gain.value = v.gain;
          osc.connect(g);
          g.connect(filter);
          osc.start();
          return osc;
        });

        // Gentle worship chord progression (I -> V -> vi -> IV)
        const progression = [1, 0.7491, 0.8409, 0.6674];
        let step = 0;

        const triggerArpNote = (rootHz) => {
          if (!synthRef.current.ctx || mutedRef.current) return;
          const c = synthRef.current.ctx;
          const now = c.currentTime;
          const noteOsc = c.createOscillator();
          const noteGain = c.createGain();
          noteOsc.type = 'sine';
          noteOsc.frequency.setValueAtTime(rootHz * 2, now);
          noteGain.gain.setValueAtTime(0.001, now);
          noteGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
          noteGain.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);
          noteOsc.connect(noteGain);
          noteGain.connect(masterGain);
          noteOsc.start(now);
          noteOsc.stop(now + 2.5);
        };

        triggerArpNote(baseFreq);

        const timerId = window.setInterval(() => {
          if (!synthRef.current.ctx) return;
          step = (step + 1) % progression.length;
          const chordRoot = baseFreq * progression[step];
          const now = synthRef.current.ctx.currentTime;
          oscs.forEach((osc, idx) => {
            const mult = padMults[idx]?.mult || 1;
            try {
              osc.frequency.setTargetAtTime(chordRoot * mult, now, 0.35);
            } catch {}
          });
          triggerArpNote(chordRoot);
        }, profile.tempoMs || 4500);

        synthRef.current = { ctx, masterGain, timerId, oscs, active: true };
        setIsBuffering(false);
        setIsPlaying(true);
        setStreamError('');
        return true;
      } catch {
        return false;
      }
    },
    [stopSynthEngine]
  );

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handlePlaying = () => {
      stopSynthEngine();
      setIsBuffering(false);
      setIsPlaying(true);
      setStreamError('');
    };
    const handleWaiting = () => {
      if (!synthRef.current.active) {
        setIsBuffering(true);
      }
    };
    const handlePause = () => {
      if (!synthRef.current.active) {
        setIsPlaying(false);
        setIsBuffering(false);
      }
    };
    const handleError = () => {
      if (activeStationRef.current) {
        const started = startSynthFallback(activeStationRef.current);
        if (started) return;
      }
      setIsBuffering(false);
      setIsPlaying(false);
      setStreamError('Աուդիո հոսքը ժամանակավորապես անհասանելի է');
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      stopSynthEngine();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [startSynthFallback, stopSynthEngine]);

  const playStation = useCallback(
    async (station = CHRISTIAN_RADIO_STATIONS[0]) => {
      const audio = audioRef.current;
      if (!audio || !station) return;
      setStreamError('');

      if (activeStation?.id === station.id) {
        if (isPlaying) {
          audio.pause();
          stopSynthEngine();
          setIsPlaying(false);
          setIsBuffering(false);
          return;
        }
        setIsBuffering(true);
        try {
          await audio.play();
        } catch {
          startSynthFallback(station);
        }
        return;
      }

      stopSynthEngine();
      setActiveStation(station);
      activeStationRef.current = station;
      setIsBuffering(true);
      audio.src = station.streamUrl;
      audio.muted = muted;
      try {
        await audio.play();
      } catch {
        startSynthFallback(station);
      }
    },
    [activeStation, isPlaying, muted, startSynthFallback, stopSynthEngine]
  );

  const stopRadio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    stopSynthEngine();
    setActiveStation(null);
    activeStationRef.current = null;
    setIsPlaying(false);
    setIsBuffering(false);
    setStreamError('');
  }, [stopSynthEngine]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      if (synthRef.current.active && synthRef.current.masterGain && synthRef.current.ctx) {
        try {
          synthRef.current.masterGain.gain.setTargetAtTime(
            next ? 0.0001 : 0.22,
            synthRef.current.ctx.currentTime,
            0.08
          );
        } catch {}
      }
      return next;
    });
  }, []);

  return (
    <MediaContext.Provider
      value={{
        activeStation,
        isPlaying,
        isBuffering,
        muted,
        streamError,
        playStation,
        stopRadio,
        toggleMute,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}
