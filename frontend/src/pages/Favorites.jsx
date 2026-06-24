import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import './Favorites.css';

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
  }, [user]);

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
    <div className="favorites-page animate-fade-in">
      <div className="favorites-header">
        <h1 className="favorites-title">{t('favorites.title')}</h1>
        <p className="favorites-subtitle">{songs.length} {t('favorites.savedSongs')}</p>
      </div>

      {loading ? (
        <div className="favorites-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="fav-card skeleton-item">
              <div className="fav-cover-wrapper skeleton-box"></div>
              <div className="fav-info">
                <div className="skeleton-line" style={{ width: '80%', height: '16px', marginTop: '4px' }}></div>
                <div className="skeleton-line" style={{ width: '50%', height: '12px' }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error-state"><p>{error}</p></div>
      ) : (
        <div className="favorites-grid">
          {songs.map((song, idx) => (
            <div 
              key={song.id} 
              className="fav-card animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 0.03, 0.5)}s` }}
              onClick={() => navigate(`/song/${song.id}?list=favorites`)}
            >
              <div className="fav-cover-wrapper">
                <div className={`fav-cover ${GRADS[(song.id||idx) % GRADS.length]}`}>
                  {song.title?.charAt(0)?.toUpperCase() || '?'}
                </div>
                
                {(song.target_key || song.song_key) && (
                  <span className="fav-badge">{song.target_key || song.song_key}</span>
                )}
                
                <button 
                  className="fav-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(song.id);
                  }}
                  title={t('favorites.removeFromFav', 'Remove')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>

              <div className="fav-info">
                <span className="fav-title">{getLocalizedTitle(song.title, language)}</span>
                <span className="fav-artist">{song.artist || t('songs.unknownArtist', 'Unknown Artist')}</span>
              </div>
            </div>
          ))}
          {songs.length === 0 && (
            <div className="list-placeholder empty-state animate-fade-in" style={{ gridColumn: '1 / -1', marginTop: '40px' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              <p>{t('favorites.noFavorites')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
