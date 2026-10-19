import { useState } from 'react';
import './SongStemsMixer.css';

const DEFAULT_STEM_TRACKS = [
  { id: 'click', name: 'Click / Guide', volume: 80, mute: false, solo: false },
  { id: 'vocal', name: 'Lead Vocal', volume: 90, mute: false, solo: false },
  { id: 'harmony', name: 'Harmonies', volume: 75, mute: false, solo: false },
  { id: 'acoustic', name: 'Acoustic', volume: 85, mute: false, solo: false },
  { id: 'electric', name: 'Electric Gtr', volume: 80, mute: false, solo: false },
  { id: 'keys', name: 'Keys / Pad', volume: 85, mute: false, solo: false },
  { id: 'bass', name: 'Bass', volume: 80, mute: false, solo: false },
  { id: 'drums', name: 'Drums', volume: 85, mute: false, solo: false },
];

export default function SongStemsMixer({ songTitle = 'Worship Song', audioUrl = null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState(DEFAULT_STEM_TRACKS);
  const [masterVolume, setMasterVolume] = useState(85);
  const [loopActive, setLoopActive] = useState(false);
  const [loopSection, setLoopSection] = useState('Chorus');

  const handleVolumeChange = (trackId, newVol) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: parseInt(newVol, 10) } : t))
    );
  };

  const handleToggleMute = (trackId) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, mute: !t.mute } : t))
    );
  };

  const handleToggleSolo = (trackId) => {
    setTracks((prev) => {
      const isCurrentlySolo = prev.find((t) => t.id === trackId)?.solo;
      return prev.map((t) =>
        t.id === trackId ? { ...t, solo: !isCurrentlySolo } : t
      );
    });
  };

  const hasAnySolo = tracks.some((t) => t.solo);

  return (
    <div className="stems-mixer-card">
      <div className="stems-mixer-header">
        <div className="stems-mixer-title">
          <span>🎛️ RehearsalMix & Stems Mixer</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
            {songTitle}
          </span>
        </div>

        {/* A-B Section Looper */}
        <div className="stems-looper-bar">
          <span>Loop:</span>
          {['Verse', 'Chorus', 'Bridge'].map((sec) => (
            <button
              key={sec}
              type="button"
              className={`stems-looper-btn ${loopActive && loopSection === sec ? 'active' : ''}`}
              onClick={() => {
                if (loopActive && loopSection === sec) {
                  setLoopActive(false);
                } else {
                  setLoopActive(true);
                  setLoopSection(sec);
                }
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls & Master Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? '#ef4444' : '#6366f1',
            border: 'none',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '999px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play Stems'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>MASTER</span>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseInt(e.target.value, 10))}
            style={{ width: '120px' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#e2e8f0', minWidth: '32px' }}>
            {masterVolume}%
          </span>
        </div>

        {audioUrl && (
          <audio src={audioUrl} controls style={{ height: '32px', maxWidth: '240px' }} />
        )}
      </div>

      {/* Multi-Track Channel Strips */}
      <div className="stems-channels-grid">
        {tracks.map((track) => {
          const isEffectivelyMuted = track.mute || (hasAnySolo && !track.solo);
          return (
            <div key={track.id} className="stem-channel-strip">
              <span className="stem-channel-name" title={track.name}>
                {track.name}
              </span>

              <div className="stem-fader-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={track.volume}
                  disabled={isEffectivelyMuted}
                  onChange={(e) => handleVolumeChange(track.id, e.target.value)}
                  className="stem-vertical-slider"
                />
              </div>

              <span style={{ fontSize: '0.7rem', color: isEffectivelyMuted ? '#64748b' : '#38bdf8' }}>
                {isEffectivelyMuted ? 'MUTE' : `${track.volume}%`}
              </span>

              <div className="stem-btn-group">
                <button
                  type="button"
                  className={`stem-action-btn stem-btn-solo ${track.solo ? 'active' : ''}`}
                  onClick={() => handleToggleSolo(track.id)}
                  title="Solo"
                >
                  S
                </button>
                <button
                  type="button"
                  className={`stem-action-btn stem-btn-mute ${track.mute ? 'active' : ''}`}
                  onClick={() => handleToggleMute(track.id)}
                  title="Mute"
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
