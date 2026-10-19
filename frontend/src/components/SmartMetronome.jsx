import React, { useState, useEffect, useCallback, useId } from 'react';
import { metronomeEngine } from '../utils/metronomeEngine';
import './SmartMetronome.css';

export default function SmartMetronome({
  initialBpm = 120,
  initialSignature = 4,
  compact = false,
  enableScreenPulse = false,
  className = '',
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm || 120);
  const [beatsPerBar, setBeatsPerBar] = useState(initialSignature || 4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isAccent, setIsAccent] = useState(false);
  const [screenPulseActive, setScreenPulseActive] = useState(false);
  const selectId = useId();

  // Sync initial props
  useEffect(() => {
    if (initialBpm && initialBpm > 30 && initialBpm < 280) {
      metronomeEngine.setBpm(initialBpm);
      setBpm(initialBpm);
    }
  }, [initialBpm]);

  useEffect(() => {
    if (initialSignature) {
      metronomeEngine.setBeatsPerBar(initialSignature);
      setBeatsPerBar(initialSignature);
    }
  }, [initialSignature]);

  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = metronomeEngine.subscribe((event) => {
      if (event.type === 'beat') {
        setCurrentBeat(event.beat);
        setIsAccent(event.isAccent);
        if (enableScreenPulse) {
          setScreenPulseActive(true);
          setTimeout(() => setScreenPulseActive(false), 120);
        }
      } else if (event.type === 'start') {
        setIsPlaying(true);
      } else if (event.type === 'stop') {
        setIsPlaying(false);
        setCurrentBeat(0);
        setIsAccent(false);
      } else if (event.type === 'bpm_change') {
        setBpm(event.bpm);
      } else if (event.type === 'signature_change') {
        setBeatsPerBar(event.beatsPerBar);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enableScreenPulse]);

  // Keyboard shortcut: Space toggles in stage mode, or 'M' for metronome
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        metronomeEngine.toggle();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const tapped = metronomeEngine.tapTempo();
        setBpm(tapped);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTogglePlay = useCallback(() => {
    metronomeEngine.toggle();
  }, []);

  const handleStepBpm = useCallback((step) => {
    const newBpm = Math.max(30, Math.min(280, bpm + step));
    metronomeEngine.setBpm(newBpm);
    setBpm(newBpm);
  }, [bpm]);

  const handleTap = useCallback(() => {
    const newBpm = metronomeEngine.tapTempo();
    setBpm(newBpm);
  }, []);

  const handleSigChange = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    metronomeEngine.setBeatsPerBar(val);
    setBeatsPerBar(val);
  }, []);

  return (
    <>
      {screenPulseActive && (
        <div
          className={`stage-visual-pulse-flash ${isAccent ? 'accent-flash' : ''}`}
          aria-hidden="true"
        />
      )}

      <div className={`smart-metronome-container ${isPlaying ? 'is-active' : ''} ${className}`}>
        {/* Play / Stop Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`metronome-play-btn ${isPlaying ? 'is-running' : ''}`}
          title={isPlaying ? 'Stop (M)' : 'Start Metronome (M)'}
          aria-label={isPlaying ? 'Stop Metronome' : 'Start Metronome'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* BPM Adjust */}
        <button
          type="button"
          className="metronome-step-btn"
          onClick={() => handleStepBpm(-1)}
          title="-1 BPM"
          aria-label="Decrease BPM"
        >
          −
        </button>

        <div className="metronome-bpm-display">
          <span className="metronome-bpm-num">{bpm}</span>
          <span className="metronome-bpm-label">BPM</span>
        </div>

        <button
          type="button"
          className="metronome-step-btn"
          onClick={() => handleStepBpm(1)}
          title="+1 BPM"
          aria-label="Increase BPM"
        >
          +
        </button>

        {/* Beat dots */}
        <div className="metronome-beat-dots" aria-label={`Beat ${currentBeat} of ${beatsPerBar}`}>
          {Array.from({ length: beatsPerBar }, (_, i) => {
            const beatIndex = i + 1;
            const isCurrent = isPlaying && currentBeat === beatIndex;
            const isAccentPos = i === 0;
            return (
              <div
                key={beatIndex}
                className={`beat-dot ${isAccentPos ? 'is-accent-pos' : ''} ${
                  isCurrent ? `active ${isAccent ? 'accent' : ''}` : ''
                }`}
              />
            );
          })}
        </div>

        {/* Tap Tempo Button */}
        {!compact && (
          <button
            type="button"
            className="metronome-tap-btn"
            onClick={handleTap}
            title="Tap Tempo (T)"
          >
            Tap
          </button>
        )}

        {/* Time Signature */}
        {!compact && (
          <label htmlFor={selectId} className="visually-hidden">
            Time signature
            <select
              id={selectId}
              className="metronome-sig-select"
              value={beatsPerBar}
              onChange={handleSigChange}
            >
              <option value="4">4/4</option>
              <option value="3">3/4</option>
              <option value="6">6/8</option>
              <option value="2">2/4</option>
            </select>
          </label>
        )}
      </div>
    </>
  );
}
