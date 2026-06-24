import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";

import { useNavigate } from 'react-router-dom';
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
        <div className="loading-state"><p>{t('favorites.loading')}</p></div>
      ) : error ? (
        <div className="error-state"><p>{error}</p></div>
      ) : (
        <div className="library-grid">
          {songs.map((song, index) => (
            <div 
              key={song.id} 
              className="library-card glass-panel"
              style={{ animationDelay: `${(index % 10) * 40}ms` }}
              onClick={() => navigate(`/song/${song.id}?list=favorites`)}
            >
              <div className="card-top">
                <span className="card-artist">{song.artist || t('songs.unknownArtist')}</span>
                <h3 className="card-title">{getLocalizedTitle(song.title, language)}</h3>
                
                <div className="card-tags">
                  <span className="tag active-tag">{t('favorites.favoriteTag')}</span>
                  {song.target_key ? (
                    <span className="tag">{t('favorites.keyTag')} {song.target_key}</span>
                  ) : song.song_key ? (
                    <span className="tag">{t('favorites.keyTag')} {song.song_key}</span>
                  ) : null}
                </div>
              </div>
              
              <div className="card-bottom" style={{ justifyContent: 'flex-end' }}>
                <span className="time">{t('favorites.openSong')} &rarr;</span>
              </div>
            </div>
          ))}
          {songs.length === 0 && (
            <div className="no-results">
              <p>{t('favorites.noFavorites')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
