import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MobileHub.css';

export default function MobileHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [recentSongs, setRecentSongs] = useState([]);
  const [upcomingSetlist, setUpcomingSetlist] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Fetch recent songs
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecentSongs(data.slice(0, 5));
        }
      })
      .catch(err => console.error(err));

    // Fetch user specific data
    if (user) {
      // Fetch setlists to get the latest one for "Upcoming Service"
      fetch('/setlists_api.php?action=get_setlists')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setUpcomingSetlist(data[0]);
          }
        })
        .catch(err => console.error(err));

      // Fetch favorites
      fetch('/user_favorites_api.php')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFavorites(data.slice(0, 6)); // Ensure we don't load too many
          }
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  // Helper to format date
  const getFormattedDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' | 10:30 AM';
  };

  return (
    <div className="mobile-hub animate-fade-in">
      <div className="hub-header">
        <h1>The Hub</h1>
        <button className="icon-btn" style={{ border: 'none' }} onClick={() => navigate('/notifications')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
      </div>

      <div className="hub-content">
        
        {/* Upcoming Service Card */}
        <div className="upcoming-card">
          <div className="card-bg-glow"></div>
          <div className="card-content">
            <h2 className="card-label">Upcoming Service:<br/>{upcomingSetlist ? upcomingSetlist.name : 'Sunday AM'}</h2>
            <p>{getFormattedDate()}</p>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => upcomingSetlist ? navigate(`/setlists/${upcomingSetlist.id}`) : navigate('/setlists')}
            >
              Start Rehearsal
            </button>
          </div>
        </div>

        {/* My Favorites (Horizontal Scroll) */}
        {user && favorites.length > 0 && (
          <div className="section-block">
            <div className="section-title">
              <h3>My Favorites</h3>
            </div>
            
            <div className="horizontal-scroll hub-horizontal">
              {favorites.map((song, i) => (
                <div key={song.id} className="hub-fav-card" onClick={() => navigate(`/song/${song.song_id}`)}>
                  <div className="fav-icon">♥</div>
                  <div className="fav-info">
                    <h4>{song.song_title}</h4>
                    <p>Worship Team<br/>12pt</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Added Chords */}
        <div className="section-block">
          <div className="section-title">
            <h3>Recently Added Chords</h3>
          </div>
          
          <div className="recent-list">
            {recentSongs.map((song, i) => (
              <div key={song.id} className="recent-item" onClick={() => navigate(`/song/${song.id}`)}>
                <div className="recent-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                </div>
                <div className="recent-info">
                  <h4>{song.title}</h4>
                  <p>{song.artist || 'Elevation Worship'}<br/>Key of {song.song_key || 'G'}</p>
                </div>
                <div className="recent-time">
                  {i === 0 ? '3 days ago' : i === 1 ? '1 week ago' : '9 days ago'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
