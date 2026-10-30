import { useState, useEffect, useCallback, useId } from 'react';
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
  const [soundType, setSoundType] = useState('woodblock');
  const [pulseEnabled, setPulseEnabled] = useState(enableScreenPulse);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isAccent, setIsAccent] = useState(false);
  const [screenPulseActive, setScreenPulseActive] = useState(false);
  const selectId = useId();
  const soundSelectId = useId();

  // Sync initial props to engine (engine notifies subscriber on bpm_change / signature_change)
  useEffect(() => {
    const parsed = Number(initialBpm);
    if (parsed && parsed >= 30 && parsed <= 280) {
      metronomeEngine.setBpm(parsed);
    }
  }, [initialBpm]);

  useEffect(() => {
    if (initialSignature) {
      metronomeEngine.setBeatsPerBar(initialSignature);
    }
  }, [initialSignature]);

  // Stop metronome when leaving the page
  useEffect(() => {
    return () => {
      metronomeEngine.stop();
    };
  }, []);

  // Subscribe to engine events
  useEffect(() => {
    const unsubscribe = metronomeEngine.subscribe((event) => {
      if (event.type === 'beat') {
        setCurrentBeat(event.beat);
        setIsAccent(event.isAccent);
        if (pulseEnabled) {
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
  }, [pulseEnabled]);

  // Keyboard shortcut: 'M' for metronome, 'T' for tap tempo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
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

  const handleSoundChange = useCallback((e) => {
    const val = e.target.value;
    metronomeEngine.setSoundType(val);
    setSoundType(val);
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
          title={isPlaying ? 'Կանգնեցնել Մետրոնոմը (M)' : 'Միացնել Մետրոնոմը (M)'}
          aria-label={isPlaying ? 'Stop Metronome' : 'Start Metronome'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* BPM Adjust */}
        <div className="metronome-bpm-group">
          <button
            type="button"
            className="metronome-step-btn"
            onClick={() => handleStepBpm(-5)}
            title="-5 BPM"
          >
            −5
          </button>
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
          <button
            type="button"
            className="metronome-step-btn"
            onClick={() => handleStepBpm(5)}
            title="+5 BPM"
          >
            +5
          </button>
        </div>

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
            title="Հարվածեք տեմպը որոշելու համար (T)"
          >
            TAP
          </button>
        )}

        {/* Time Signature (Visible!) */}
        {!compact && (
          <div className="metronome-select-wrap">
            <label htmlFor={selectId} className="visually-hidden">Չափ (Time Signature)</label>
            <select
              id={selectId}
              className="metronome-sig-select"
              value={beatsPerBar}
              onChange={handleSigChange}
              title="Երաժշտական չափ"
            >
              <option value="4">4/4</option>
              <option value="3">3/4</option>
              <option value="6">6/8</option>
              <option value="2">2/4</option>
            </select>
          </div>
        )}

        {/* Sound Type Selector */}
        {!compact && (
          <div className="metronome-select-wrap">
            <label htmlFor={soundSelectId} className="visually-hidden">Ձայնի տեսակ</label>
            <select
              id={soundSelectId}
              className="metronome-sig-select"
              value={soundType}
              onChange={handleSoundChange}
              title="Մետրոնոմի ձայնը"
            >
              <option value="woodblock">🥁 Wood</option>
              <option value="click">🎛️ Click</option>
              <option value="bell">🔔 Bell</option>
              <option value="soft">🔉 Soft</option>
            </select>
          </div>
        )}

        {/* Screen Pulse Toggle */}
        {!compact && (
          <button
            type="button"
            className={`metronome-pulse-btn ${pulseEnabled ? 'active' : ''}`}
            onClick={() => setPulseEnabled((v) => !v)}
            title="Էկրանի լուսային զարկ (Visual Pulse)"
          >
            💡 Pulse
          </button>
        )}
      </div>
    </>
  );
}
