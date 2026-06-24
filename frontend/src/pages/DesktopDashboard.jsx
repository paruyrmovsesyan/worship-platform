import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { renderWithChords } from '../utils/chordTransposer';
import './DesktopDashboard.css';

export default function DesktopDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [activeSetlistId, setActiveSetlistId] = useState(null);
  const [activeSetlistSongs, setActiveSetlistSongs] = useState([]);
  
  const [previewSong, setPreviewSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch all songs for the library
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSongs(data);
        }
      })
      .catch(err => console.error('Error fetching songs', err));

    // Fetch user setlists
    if (user) {
      fetch('/setlists_api.php?action=get_setlists')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSetlists(data);
            if (data.length > 0) {
              setActiveSetlistId(data[0].id);
            }
          }
        })
        .catch(err => console.error('Error fetching setlists', err));
    }
  }, [user]);

  // Fetch songs for the active setlist
  useEffect(() => {
    if (activeSetlistId) {
      fetch(`/setlists_api.php?action=get_setlist_songs&setlist_id=${activeSetlistId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setActiveSetlistSongs(data);
          }
        })
        .catch(err => console.error('Error fetching setlist songs', err));
    } else {
      setActiveSetlistSongs([]);
    }
  }, [activeSetlistId]);

  const filteredSongs = songs.filter(song => {
    const localizedTitle = getLocalizedTitle(song, language).toLowerCase();
    return localizedTitle.includes(searchQuery.toLowerCase()) ||
           (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <>
    <div className="desktop-ambient-bg"></div>
    <div className="desktop-dashboard">
      
      {/* Column 1: Song Library */}
      <div className="dashboard-col col-library">
        <div className="col-header">
          <h2>{t('dashboard.library')}</h2>
          <span className="badge">{songs.length}</span>
        </div>
        
        <div className="search-bar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-tertiary)', position: 'absolute', left: '32px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder={t('dashboard.search')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="scroll-area list-group">
          {filteredSongs.map(song => (
            <div 
              key={song.id} 
              className={`list-item ${previewSong?.id === song.id ? 'active' : ''}`}
              onClick={() => setPreviewSong(song)}
            >
              <div className="item-info">
                <h4>{getLocalizedTitle(song, language)}</h4>
                <p>{song.artist || 'Worship'}</p>
              </div>
              <div className="item-meta">
                {song.song_key && <span className="key-badge">{song.song_key}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Setlist Builder */}
      <div className="dashboard-col col-setlist">
        <div className="col-header">
          <h2>{t('dashboard.loginSetlists')}</h2>
          <button className="icon-btn" onClick={() => navigate('/setlists')} title={t('dashboard.manageSetlists')} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: 'none' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
        </div>

        <div className="scroll-area setlist-items">
          {!user && (
            <div className="empty-state">
              <p>{t('dashboard.loginPrompt')}</p>
              <Link to="/login" className="btn btn-secondary btn-small" style={{ marginTop: '20px', borderRadius: '99px' }}>{t('dashboard.loginBtn')}</Link>
            </div>
          )}
          
          {user && activeSetlistSongs.length === 0 && (
            <div className="empty-state">
              <p>{t('dashboard.emptySetlist')}</p>
            </div>
          )}

          {user && activeSetlistSongs.map((song, index) => (
            <div 
              key={song.id} 
              className={`setlist-item ${previewSong?.id === song.song_id ? 'active' : ''}`}
              onClick={() => {
                const fullSong = songs.find(s => s.id === song.song_id);
                if (fullSong) setPreviewSong(fullSong);
              }}
            >
              <div className="order-num">{index + 1}</div>
              <div className="item-info">
                <h4>{song.song_title}</h4>
                <p>{t('dashboard.key')} {song.transpose_key || song.original_key || '?'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Preview Pane */}
      <div className="dashboard-col col-preview">
        {previewSong ? (
          <div className="preview-container">
            <div className="preview-header">
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.5px', marginBottom: '12px' }}>{getLocalizedTitle(previewSong, language)}</h2>
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-secondary)' }}></span>
                  {previewSong.song_key || 'C'}
                </p>
              </div>
              <div className="preview-actions">
                <button 
                  className="btn btn-primary" 
                  style={{ borderRadius: '99px', padding: '12px 24px', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}
                  onClick={() => navigate(`/song/${previewSong.id}`)}
                >
                  {t('dashboard.openStageReader')}
                </button>
              </div>
            </div>
            
            <div className="preview-body scroll-area">
              <div className="preview-chords">
                {previewSong.chords ? (
                  <pre>{previewSong.chords}</pre>
                ) : (
                  <pre>{previewSong.lyrics}</pre>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h2 style={{ fontSize: '2.2rem', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.5px', marginBottom: '12px', textAlign: 'left', width: '100%' }}>{t('dashboard.emptyTitle')}</h2>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '0.9rem', width: '100%', marginBottom: '40px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-secondary)' }}></span>
              Dm
            </p>
            <div style={{ width: '100%', textAlign: 'left', opacity: 0.8, fontFamily: 'monospace', fontSize: '1.1rem', lineHeight: '2' }}>
              {t('dashboard.emptyVerse')}<br/>
              Dm C A# C<br/><br/>
              {t('dashboard.emptyBridge')}<br/>
              Dm Am A# C
            </div>
          </div>
        )}
      </div>

    </div>
    </>
  );
}
