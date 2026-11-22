import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaPlayer } from '../utils/mediaData';
import { useLanguage } from '../context/LanguageContext';
import { Glass } from 'glisse';
import './RadioMiniPlayer.css';

export default function RadioMiniPlayer() {
  const player = useMediaPlayer();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  if (!player || !player.activeStation) return null;
  if (location.pathname.startsWith('/chat/') || location.pathname.startsWith('/projection')) {
    return null;
  }

  const { activeStation, isPlaying, isBuffering, muted, streamError, playStation, stopRadio, toggleMute } = player;
  const stationTitle = activeStation.name?.[language] || activeStation.name?.am || 'Radio';

  return createPortal(
    <Glass className="radio-mini-pill" role="region" aria-label="Radio Player">
      <button
        type="button"
        className="radio-mini-play"
        onClick={() => playStation(activeStation)}
        aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
      >
        {isBuffering ? '⋯' : isPlaying ? '❚❚' : '▶'}
      </button>

      <button type="button" className="radio-mini-info" onClick={() => navigate('/media')}>
        <span className="radio-mini-dot" style={{ backgroundColor: activeStation.accent || '#f7b500' }} />
        <div>
          <strong>{stationTitle}</strong>
          <small>{streamError || (isPlaying ? 'LIVE 24/7' : 'Դադար')}</small>
        </div>
      </button>

      <button type="button" className="radio-mini-icon" onClick={toggleMute} aria-label="Toggle mute">
        {muted ? '🔇' : '🔊'}
      </button>
      <button type="button" className="radio-mini-icon" onClick={stopRadio} aria-label="Close radio">
        ✕
      </button>
    </Glass>,
    document.body,
  );
}
