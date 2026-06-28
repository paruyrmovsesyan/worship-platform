import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { usePageReady } from '../hooks/usePageReady';
import './Favorites.css';

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageReady(loading);
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
      <div className="favorites-page" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2>{t('favorites.loginTitle')}</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>{t('favorites.loginPrompt')}</p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block' }}>{t('favorites.loginBtn')}</Link>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Hero Header */}
      <div className="fav-hero">
        <div className="fav-hero-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div className="fav-hero-info">
          <span className="fav-hero-type">{t('favorites.playlist', 'Playlist')}</span>
          <h1 className="fav-hero-title">{t('favorites.title')}</h1>
          <div className="fav-hero-meta">
            <span>{user?.name || 'User'}</span> • {songs.length} {t('favorites.savedSongs')}
          </div>
        </div>
      </div>

      <div className="fav-content">
        {/* Play Action Row */}
        {songs.length > 0 && !loading && (
          <div className="fav-action-row animate-fade-in">
            <button className="fav-play-btn" onClick={() => navigate(`/song/${songs[0].id}?list=favorites`)}>
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="fav-track-list">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="fav-track-item skeleton-item">
                <div className="fav-track-img skeleton-box"></div>
                <div className="fav-track-info">
                  <div className="skeleton-line" style={{ width: '200px', height: '16px', marginBottom: '6px' }}></div>
                  <div className="skeleton-line" style={{ width: '120px', height: '12px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-state"><p>{error}</p></div>
        ) : (
          <div className="fav-track-list">
            {songs.map((song, idx) => (
              <div 
                key={song.id} 
                className="fav-track-item animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
                onClick={() => navigate(`/song/${song.id}?list=favorites`)}
              >
                <div className="fav-track-num">{idx + 1}</div>

                <div className={`fav-track-img ${GRADS[(song.id||idx) % GRADS.length]}`}>
                  {song.title?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="fav-track-info">
                  <div className="fav-track-title">{getLocalizedTitle(song.title, language)}</div>
                  <div className="fav-track-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</div>
                </div>
                
                <div className="fav-track-meta">
                  {(song.target_key || song.song_key) && <span className="fav-track-badge">{song.target_key || song.song_key}</span>}
                  
                  <button 
                    className="fav-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(song.id);
                    }}
                    title={t('favorites.removeFromFav', 'Remove')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {songs.length === 0 && (
              <div className="fav-empty animate-fade-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <h3>{t('favorites.noFavorites')}</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
