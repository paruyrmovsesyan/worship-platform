import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import './SongsApp.css'; // Reuse library styles

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const GRADS = ['bg-purple','bg-blue','bg-cyan','bg-gold', 'bg-orange'];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetch('/user_favorites_api.php?action=get_favorites')
      .then(res => {
        if (!res.ok) throw new Error('API fetch failed');
        return res.json();
      })
      .then(data => {
        setSongs(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(t('favorites.errorLoad'));
        setLoading(false);
      });
  }, [user, t]);

  const removeFavorite = async (songId) => {
    if (!window.confirm(t('favorites.confirmRemove', 'Հեռացնե՞լ երգը պահպանվածներից:'))) return;
    try {
      const res = await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId })
      });
      const data = await res.json();
      if (!data.favorite) {
        setSongs(prev => prev.filter(s => s.id !== songId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="library-page container animate-fade-in" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>{t('favorites.loginTitle')}</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>{t('favorites.loginPrompt')}</p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block' }}>{t('favorites.loginBtn')}</Link>
      </div>
    );
  }

  return (
    <div className="library-page container animate-fade-in">
      <div className="library-header">
        <div className="library-title-group">
          <h1>{t('favorites.title')}</h1>
          <p>{songs.length} {t('favorites.savedSongs')}</p>
        </div>
      </div>

      {loading ? (
        <div className="track-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="track-item skeleton-item">
              <div className="track-cover skeleton-box"></div>
              <div className="track-info">
                <div className="skeleton-line title-line"></div>
                <div className="skeleton-line artist-line"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error-state"><p>{error}</p></div>
      ) : (
        <div className="track-list">
          {songs.map((song, idx) => (
            <div 
              key={song.id} 
              className="track-item animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
              onClick={() => navigate(`/song/${song.id}?list=favorites`)}
            >
              <div className="track-number desk-only dim">
                {(idx + 1).toString().padStart(2, '0')}
              </div>

              <div className={`track-cover ${GRADS[(song.id||idx) % GRADS.length]}`}>
                {song.title?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div className="track-info">
                <span className="track-title">{getLocalizedTitle(song.title, language)}</span>
                <span className="track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</span>
              </div>
              
              <div className="track-meta">
                {(song.target_key || song.song_key) && <span className="track-key-badge">{song.target_key || song.song_key}</span>}
                {song.bpm && <span className="track-bpm desk-only dim">{song.bpm} BPM</span>}
              </div>

              <div className="track-actions">
                <button 
                  className="heart-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(song.id);
                  }}
                  title={t('favorites.removeFromFav', 'Remove')}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          
          {songs.length === 0 && (
            <div className="list-placeholder empty-state animate-fade-in">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              <p>{t('favorites.noFavorites')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
