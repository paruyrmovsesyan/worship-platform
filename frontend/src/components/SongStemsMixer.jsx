import { useState, useEffect, useRef, useCallback } from 'react';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge } from './BetaBadge';
import './SongStemsMixer.css';

const DEFAULT_STEM_TRACKS = [
  { id: 'click', name: 'Click / Guide', icon: '⏱️', volume: 75, mute: false, solo: false },
  { id: 'pad', name: 'Warm Pad', icon: '🌊', volume: 85, mute: false, solo: false },
  { id: 'keys', name: 'Keys / Piano', icon: '🎹', volume: 80, mute: false, solo: false },
  { id: 'acoustic', name: 'Acoustic Gtr', icon: '🎸', volume: 80, mute: false, solo: false },
  { id: 'electric', name: 'Shimmer Gtr', icon: '⚡', volume: 65, mute: false, solo: false },
  { id: 'bass', name: 'Sub Bass', icon: '🔊', volume: 82, mute: false, solo: false },
  { id: 'drums', name: 'Drums / Groove', icon: '🥁', volume: 80, mute: false, solo: false },
  { id: 'vocal', name: 'Vocal / MP3', icon: '🎤', volume: 90, mute: false, solo: false },
];

// Root note frequencies (Hz) in octave 3
const KEY_ROOT_HZ = {
  C: 130.81,
  'C#': 138.59,
  Db: 138.59,
  D: 146.83,
  'D#': 155.56,
  Eb: 155.56,
  E: 164.81,
  F: 174.61,
  'F#': 185.0,
  Gb: 185.0,
  G: 196.0,
  'G#': 207.65,
  Ab: 207.65,
  A: 220.0,
  'A#': 233.08,
  Bb: 233.08,
  B: 246.94,
};

function parseKeyInfo(rawKey) {
  const clean = String(rawKey || 'C').trim();
  const match = clean.match(/^([A-G][#b]?)(m)?/i);
  if (!match) return { root: 'C', isMinor: false, freq: 130.81 };
  const root = match[1].charAt(0).toUpperCase() + (match[1].slice(1) || '');
  const isMinor = Boolean(match[2]);
  const freq = KEY_ROOT_HZ[root] || 130.81;
  return { root, isMinor, freq };
}

export default function SongStemsMixer({
  songTitle = 'Worship Song',
  audioUrl = null,
  songKey = 'C',
  initialBpm = 120,
  onClose,
}) {
  const { isBeta } = useFeatureFlags();
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState(DEFAULT_STEM_TRACKS);
  const [masterVolume, setMasterVolume] = useState(85);
  const [bpm, setBpm] = useState(() => {
    const parsed = parseInt(initialBpm, 10);
    return parsed >= 40 && parsed <= 240 ? parsed : 118;
  });
  const [selectedKey, setSelectedKey] = useState(() => {
    const info = parseKeyInfo(songKey);
    return info.root + (info.isMinor ? 'm' : '');
  });
  const [loopActive, setLoopActive] = useState(false);
  const [loopSection, setLoopSection] = useState('Chorus');
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(1);

  const audioCtxRef = useRef(null);
  const padNodesRef = useRef(null);
  const stepTimerRef = useRef(null);
  const stepIndexRef = useRef(0);
  const tracksRef = useRef(tracks);
  const masterVolRef = useRef(masterVolume);
  const bpmRef = useRef(bpm);
  const keyRef = useRef(selectedKey);
  const loopSecRef = useRef(loopSection);
  const htmlAudioRef = useRef(null);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    masterVolRef.current = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    keyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    loopSecRef.current = loopSection;
  }, [loopSection]);

  // Helper to get effective 0..1 gain for a track
  const getTrackGain = useCallback((trackId) => {
    const list = tracksRef.current;
    const anySolo = list.some((t) => t.solo);
    const tr = list.find((t) => t.id === trackId);
    if (!tr) return 0;
    if (tr.mute || (anySolo && !tr.solo)) return 0;
    return (tr.volume / 100) * (masterVolRef.current / 100);
  }, []);

  // Sync continuous Warm Pad & Shimmer gains + HTML audio volume whenever faders/solo/mute change
  useEffect(() => {
    if (padNodesRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      const padGainVal = getTrackGain('pad') * 0.18;
      const shimmerGainVal = getTrackGain('electric') * 0.08;
      padNodesRef.current.padGain.gain.setTargetAtTime(padGainVal, now, 0.06);
      padNodesRef.current.shimmerGain.gain.setTargetAtTime(shimmerGainVal, now, 0.06);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = Math.min(1, Math.max(0, getTrackGain('vocal')));
    }
  }, [tracks, masterVolume, getTrackGain]);

  // Update pad frequencies when key changes
  useEffect(() => {
    if (padNodesRef.current && audioCtxRef.current) {
      const { freq, isMinor } = parseKeyInfo(selectedKey);
      const thirdRatio = isMinor ? Math.pow(2, 3 / 12) : Math.pow(2, 4 / 12);
      const fifthRatio = Math.pow(2, 7 / 12);
      const now = audioCtxRef.current.currentTime;
      padNodesRef.current.osc1.frequency.setTargetAtTime(freq, now, 0.05);
      padNodesRef.current.osc2.frequency.setTargetAtTime(freq * fifthRatio, now, 0.05);
      padNodesRef.current.osc3.frequency.setTargetAtTime(freq * 2 * thirdRatio, now, 0.05);
      padNodesRef.current.shimmerOsc.frequency.setTargetAtTime(freq * 4, now, 0.05);
    }
  }, [selectedKey]);

  // Play synthesized step (8th-note grid: 8 steps per 4/4 bar)
  const triggerStep = useCallback((step) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const stepInBar = step % 8; // 0..7 (even = quarter beats 1,2,3,4; odd = 'and' 8th notes)
    const barIndex = Math.floor(step / 8) % 4; // 4-bar chord progression loop
    const isQuarter = stepInBar % 2 === 0;
    const beatNum = Math.floor(stepInBar / 2) + 1;

    if (isQuarter) {
      setCurrentBeat(beatNum);
      setCurrentBar(barIndex + 1);
    }

    const { freq: rootFreq, isMinor } = parseKeyInfo(keyRef.current);
    // Chord degree multipliers for Verse vs Chorus vs Bridge
    const sec = loopSecRef.current;
    const progressionDegrees =
      sec === 'Chorus'
        ? [5, 0, 7, isMinor ? 3 : 9] // IV - I - V - vi
        : sec === 'Bridge'
        ? [5, 7, isMinor ? 3 : 9, 0] // IV - V - vi - I
        : [0, 7, isMinor ? 3 : 9, 5]; // I - V - vi - IV

    const semitoneShift = progressionDegrees[barIndex] || 0;
    const chordRoot = rootFreq * Math.pow(2, semitoneShift / 12);
    const fifth = chordRoot * Math.pow(2, 7 / 12);
    const third = chordRoot * Math.pow(2, (isMinor ? 3 : 4) / 12);

    // 1. CLICK / GUIDE (Quarter notes)
    const clickVol = getTrackGain('click');
    if (isQuarter && clickVol > 0.005) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(beatNum === 1 ? 1350 : 900, now);
      g.gain.setValueAtTime(clickVol * (beatNum === 1 ? 0.55 : 0.32), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    }

    // 2. DRUMS (Kick on steps 0, 4, 5; Rim/Snare on steps 2, 6; Shaker/Hat on all 8th steps)
    const drumVol = getTrackGain('drums');
    if (drumVol > 0.005) {
      // Kick
      if (stepInBar === 0 || stepInBar === 4 || stepInBar === 5) {
        const kOsc = ctx.createOscillator();
        const kGain = ctx.createGain();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(125, now);
        kOsc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
        kGain.gain.setValueAtTime(drumVol * 0.65, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kOsc.connect(kGain);
        kGain.connect(ctx.destination);
        kOsc.start(now);
        kOsc.stop(now + 0.15);
      }
      // Snare / Worship Rimshot on beat 2 & 4 (step 2 & 6)
      if (stepInBar === 2 || stepInBar === 6) {
        const sOsc = ctx.createOscillator();
        const sGain = ctx.createGain();
        sOsc.type = 'triangle';
        sOsc.frequency.setValueAtTime(320, now);
        sOsc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
        sGain.gain.setValueAtTime(drumVol * 0.4, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        sOsc.connect(sGain);
        sGain.connect(ctx.destination);
        sOsc.start(now);
        sOsc.stop(now + 0.095);
      }
      // Hi-hat / Shaker pulse
      const hOsc = ctx.createOscillator();
      const hGain = ctx.createGain();
      hOsc.type = 'square';
      hOsc.frequency.setValueAtTime(6400, now);
      hGain.gain.setValueAtTime(drumVol * (isQuarter ? 0.06 : 0.035), now);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      hOsc.connect(hGain);
      hGain.connect(ctx.destination);
      hOsc.start(now);
      hOsc.stop(now + 0.03);
    }

    // 3. SUB BASS (Steps 0, 3, 4)
    const bassVol = getTrackGain('bass');
    if (bassVol > 0.005 && (stepInBar === 0 || stepInBar === 3 || stepInBar === 4)) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(chordRoot * 0.5, now);
      bGain.gain.setValueAtTime(bassVol * 0.48, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.36);
    }

    // 4. KEYS / PIANO (Warm chord pulse on beat 1 & 3 -> step 0 & 4)
    const keysVol = getTrackGain('keys');
    if (keysVol > 0.005 && (stepInBar === 0 || stepInBar === 4)) {
      [chordRoot * 2, third * 2, fifth * 2].forEach((freqVal) => {
        const kOsc = ctx.createOscillator();
        const kGain = ctx.createGain();
        kOsc.type = 'sine';
        kOsc.frequency.setValueAtTime(freqVal, now);
        kGain.gain.setValueAtTime(keysVol * 0.14, now);
        kGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
        kOsc.connect(kGain);
        kGain.connect(ctx.destination);
        kOsc.start(now);
        kOsc.stop(now + 0.56);
      });
    }

    // 5. ACOUSTIC ARPEGGIO (8th-note plucks across chord tones)
    const acVol = getTrackGain('acoustic');
    if (acVol > 0.005) {
      const arpNotes = [chordRoot * 2, fifth * 2, third * 4, fifth * 2];
      const noteFreq = arpNotes[stepInBar % arpNotes.length];
      const aOsc = ctx.createOscillator();
      const aGain = ctx.createGain();
      aOsc.type = 'triangle';
      aOsc.frequency.setValueAtTime(noteFreq, now);
      aGain.gain.setValueAtTime(acVol * 0.16, now);
      aGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.18);
      aOsc.connect(aGain);
      aGain.connect(ctx.destination);
      aOsc.start(now);
      aOsc.stop(now + 0.19);
    }

    // 6. VOCAL GUIDE (when no external MP3 is playing, subtle guide melody on beat 1 & 3)
    const vocalVol = getTrackGain('vocal');
    if (!audioUrl && vocalVol > 0.005 && (stepInBar === 0 || stepInBar === 2 || stepInBar === 4)) {
      const vOsc = ctx.createOscillator();
      const vGain = ctx.createGain();
      vOsc.type = 'sine';
      const guideNotes = [third * 4, fifth * 2, chordRoot * 4];
      vOsc.frequency.setValueAtTime(guideNotes[(stepInBar / 2) % guideNotes.length], now);
      vGain.gain.setValueAtTime(vocalVol * 0.09, now);
      vGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.32);
      vOsc.connect(vGain);
      vGain.connect(ctx.destination);
      vOsc.start(now);
      vOsc.stop(now + 0.34);
    }
  }, [audioUrl, getTrackGain]);

  const stopEngine = useCallback(() => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    if (padNodesRef.current) {
      try {
        padNodesRef.current.osc1.stop();
        padNodesRef.current.osc2.stop();
        padNodesRef.current.osc3.stop();
        padNodesRef.current.shimmerOsc.stop();
      } catch {
        // ignore
      }
      padNodesRef.current = null;
    }
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
      } catch {
        // ignore
      }
    }
    setIsPlaying(false);
    setCurrentBeat(1);
    setCurrentBar(1);
  }, []);

  const startEngine = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Stop any previous nodes
    if (padNodesRef.current) {
      try {
        padNodesRef.current.osc1.stop();
        padNodesRef.current.osc2.stop();
        padNodesRef.current.osc3.stop();
        padNodesRef.current.shimmerOsc.stop();
      } catch {
        // ignore
      }
    }

    const { freq, isMinor } = parseKeyInfo(keyRef.current);
    const thirdRatio = isMinor ? Math.pow(2, 3 / 12) : Math.pow(2, 4 / 12);
    const fifthRatio = Math.pow(2, 7 / 12);

    // Continuous Warm Worship Pad (3 oscillators + warm low-pass filter)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(getTrackGain('pad') * 0.18, ctx.currentTime);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq * fifthRatio, ctx.currentTime);
    osc3.frequency.setValueAtTime(freq * 2 * thirdRatio, ctx.currentTime);
    osc1.detune.setValueAtTime(-8, ctx.currentTime);
    osc2.detune.setValueAtTime(8, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(padGain);
    padGain.connect(ctx.destination);

    // Shimmer high pad
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(getTrackGain('electric') * 0.08, ctx.currentTime);
    const shimmerOsc = ctx.createOscillator();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(freq * 4, ctx.currentTime);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc3.start();
    shimmerOsc.start();

    padNodesRef.current = { osc1, osc2, osc3, shimmerOsc, padGain, shimmerGain };

    // Sync HTML audio if available
    if (htmlAudioRef.current && audioUrl) {
      htmlAudioRef.current.volume = Math.min(1, Math.max(0, getTrackGain('vocal')));
      htmlAudioRef.current.play().catch(() => {});
    }

    stepIndexRef.current = 0;
    triggerStep(0);

    const eighthNoteMs = (60000 / bpmRef.current) / 2;
    stepTimerRef.current = setInterval(() => {
      stepIndexRef.current += 1;
      triggerStep(stepIndexRef.current);
    }, eighthNoteMs);

    setIsPlaying(true);
  }, [audioUrl, getTrackGain, triggerStep]);

  // Adjust interval speed if BPM changes while playing
  useEffect(() => {
    if (isPlaying && stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      const eighthNoteMs = (60000 / bpm) / 2;
      stepTimerRef.current = setInterval(() => {
        stepIndexRef.current += 1;
        triggerStep(stepIndexRef.current);
      }, eighthNoteMs);
    }
  }, [bpm, isPlaying, triggerStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEngine();
    };
  }, [stopEngine]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopEngine();
    } else {
      startEngine();
    }
  };

  const handleVolumeChange = (trackId, newVol) => {
    const clamped = Math.max(0, Math.min(100, parseInt(newVol, 10) || 0));
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: clamped } : t))
    );
  };

  const handleToggleMute = (trackId) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, mute: !t.mute } : t))
    );
  };

  const handleToggleSolo = (trackId) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
    );
  };

  const handleResetMix = () => {
    setTracks(DEFAULT_STEM_TRACKS);
    setMasterVolume(85);
  };

  const hasAnySolo = tracks.some((t) => t.solo);

  const SECTIONS = [
    { id: 'Verse', label: 'Տուն (Verse)' },
    { id: 'Chorus', label: 'Կրկներգ (Chorus)' },
    { id: 'Bridge', label: 'Կամուրջ (Bridge)' },
  ];

  return (
    <div className="stems-mixer-card">
      <div className="stems-mixer-header">
        <div className="stems-mixer-title-wrap">
          <div className="stems-mixer-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🎛️ RehearsalMix & Stems Միքշեր
              {isBeta('rehearsal_stems') && <BetaBadge label="BETA" />}
            </span>
            {isPlaying && (
              <span className="stems-live-pill">
                ● ՏԱԿՏ {currentBar}.{currentBeat}
              </span>
            )}
          </div>
          <span className="stems-song-subtitle">{songTitle}</span>
        </div>

        <div className="stems-header-controls">
          {/* A-B Section Looper */}
          <div className="stems-looper-bar">
            <span className="stems-looper-label">🔁 Հատված՝</span>
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={`stems-looper-btn ${loopSection === sec.id ? 'active' : ''}`}
                onClick={() => {
                  setLoopSection(sec.id);
                  setLoopActive(true);
                }}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {onClose && (
            <button
              type="button"
              className="stems-close-btn"
              onClick={onClose}
              title="Փակել միքշերը"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Transport, Key, BPM & Master Volume */}
      <div className="stems-transport-bar">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`stems-play-btn ${isPlaying ? 'is-playing' : ''}`}
        >
          {isPlaying ? '⏹ Կանգնեցնել' : '▶ Միացնել Stems'}
        </button>

        <div className="stems-param-pill">
          <span>Տոն՝</span>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="stems-key-select"
          >
            {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Am', 'Dm', 'Em'].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="stems-param-pill">
          <span>BPM՝</span>
          <button type="button" onClick={() => setBpm((b) => Math.max(40, b - 2))} className="stems-mini-btn">−</button>
          <strong className="stems-bpm-val">{bpm}</strong>
          <button type="button" onClick={() => setBpm((b) => Math.min(240, b + 2))} className="stems-mini-btn">+</button>
        </div>

        <div className="stems-master-wrap">
          <span className="stems-master-label">MASTER</span>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
            className="stems-master-slider"
          />
          <span className="stems-master-pct">{masterVolume}%</span>
        </div>

        <button
          type="button"
          className="stems-reset-btn"
          onClick={handleResetMix}
          title="Վերականգնել բոլոր ալիքները"
        >
          ↺ Reset
        </button>

        {audioUrl && (
          <audio
            ref={htmlAudioRef}
            src={audioUrl}
            loop={loopActive}
            style={{ display: 'none' }}
          />
        )}
      </div>

      {/* Multi-Track Channel Strips */}
      <div className="stems-channels-grid">
        {tracks.map((track) => {
          const isEffectivelyMuted = track.mute || (hasAnySolo && !track.solo);
          const effectivePct = isEffectivelyMuted ? 0 : Math.round((track.volume * masterVolume) / 100);

          return (
            <div
              key={track.id}
              className={`stem-channel-strip ${isEffectivelyMuted ? 'is-muted' : ''} ${track.solo ? 'is-solo' : ''}`}
            >
              <div className="stem-channel-top">
                <span className="stem-channel-icon">{track.icon}</span>
                <span className="stem-channel-name" title={track.name}>
                  {track.name}
                </span>
              </div>

              {/* Cross-browser custom vertical fader + live VU meter */}
              <div className="stem-fader-stage">
                <div className="stem-vu-track">
                  <div
                    className={`stem-vu-fill ${isPlaying && !isEffectivelyMuted ? 'is-pulsing' : ''}`}
                    style={{ height: `${isPlaying ? effectivePct : 0}%` }}
                  />
                </div>

                <div className="stem-fader-track-wrap">
                  <div
                    className="stem-fader-fill"
                    style={{ height: `${isEffectivelyMuted ? 0 : track.volume}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    disabled={isEffectivelyMuted}
                    onChange={(e) => handleVolumeChange(track.id, e.target.value)}
                    className="stem-vertical-range"
                    aria-label={track.name}
                  />
                </div>
              </div>

              <span className={`stem-pct-readout ${isEffectivelyMuted ? 'muted' : ''}`}>
                {isEffectivelyMuted ? 'MUTE' : `${track.volume}%`}
              </span>

              <div className="stem-btn-group">
                <button
                  type="button"
                  className={`stem-action-btn stem-btn-solo ${track.solo ? 'active' : ''}`}
                  onClick={() => handleToggleSolo(track.id)}
                  title="Solo (Միայն այս գործիքը)"
                >
                  S
                </button>
                <button
                  type="button"
                  className={`stem-action-btn stem-btn-mute ${track.mute ? 'active' : ''}`}
                  onClick={() => handleToggleMute(track.id)}
                  title="Mute (Անջատել ձայնը)"
                >
                  M
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
