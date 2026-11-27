import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSongAudio } from '../context/SongAudioContext';
import { triggerHaptic } from '../utils/nativeHaptics';
import './NativeMiniAudioPlayer.css';

function formatTime(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function NativeMiniAudioPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    stopTrack,
    isLoopActive,
  } = useSongAudio();

  // If no track is loaded, don't render anything
  if (!track) return null;

  // Don't show floating mini player if user is currently inside this exact song view
  const isCurrentSongView = location.pathname === `/song/${track.songId}`;
  if (isCurrentSongView) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleOpenSong = () => {
    triggerHaptic();
    navigate(`/song/${track.songId}`);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    triggerHaptic();
    togglePlay();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    triggerHaptic();
    stopTrack();
  };

  return (
    <aside className="native-mini-player-wrap" onClick={handleOpenSong} role="region" aria-label="Audio player">
      <div className="native-mini-player-bar" style={{ width: `${progress}%` }} />
      <div className="native-mini-player-content">
        <div className="native-mini-player-art">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <div className="native-mini-player-meta">
          <span className="native-mini-player-title">{track.title || 'Երգ'}</span>
          <span className="native-mini-player-sub">
            {track.artist || 'Worship'} · {formatTime(currentTime)} / {formatTime(duration)}
            {isLoopActive && <span className="native-mini-player-loop-badge"> 🔁 Loop</span>}
          </span>
        </div>

        <div className="native-mini-player-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="native-mini-player-play-btn"
            onClick={handleToggle}
            aria-label={isPlaying ? 'Դադարեցնել' : 'Նվագարկել'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="native-mini-player-close-btn"
            onClick={handleClose}
            aria-label="Փակել փլեյերը"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
