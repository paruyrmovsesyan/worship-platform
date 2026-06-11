import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Songs.css'; // Reuse library styles

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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
        setError('Չհաջողվեց բեռնել ֆավորիտները');
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="library-page container animate-fade-in" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>Մուտք գործեք</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>Խնդրում ենք մուտք գործել՝ ձեր ֆավորիտ երգերը տեսնելու համար:</p>
        <a href="/loginuser.php?next=/" className="btn btn-primary" style={{ marginTop: '24px', display: 'inline-block' }}>Մուտք</a>
      </div>
    );
  }

  return (
    <div className="library-page container animate-fade-in">
      <div className="library-header">
        <div className="library-title-group">
          <h1>Իմ Ընտրանին</h1>
          <p>{songs.length} պահպանված երգեր</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><p>Բեռնվում է...</p></div>
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
                <span className="card-artist">{song.artist || 'Անհայտ'}</span>
                <h3 className="card-title">{song.title}</h3>
                
                <div className="card-tags">
                  <span className="tag active-tag">Ֆավորիտ</span>
                  {song.target_key ? (
                    <span className="tag">Տոնայնություն: {song.target_key}</span>
                  ) : song.song_key ? (
                    <span className="tag">Տոնայնություն: {song.song_key}</span>
                  ) : null}
                </div>
              </div>
              
              <div className="card-bottom" style={{ justifyContent: 'flex-end' }}>
                <span className="time">Բացել Երգը &rarr;</span>
              </div>
            </div>
          ))}
          {songs.length === 0 && (
            <div className="no-results">
              <p>Դեռ չունեք պահպանված երգեր:</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
