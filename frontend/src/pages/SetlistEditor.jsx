import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { usePageReady } from '../hooks/usePageReady';
import './Setlists.css';
import './SongsApp.css'; // ensure track-list styles are loaded

const GRADS = ['bg-purple', 'bg-blue', 'bg-cyan', 'bg-gold', 'bg-orange'];

export default function SetlistEditor() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [setlistData, setSetlistData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageReady(loading || authLoading);
  const [error, setError] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  
  const fetchSetlist = () => {
    fetch(`/setlists_api.php?action=get_setlist_items&setlist_id=${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch setlist');
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSetlistData(data.setlist);
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(t('setlists.errorFetch'));
        setLoading(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchSetlist();
    } else {
      setLoading(false);
    }
  }, [id, user, authLoading]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    fetch(`/setlists_api.php?action=search_songs&q=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json())
      .then(data => {
        setSearchResults(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  const addSong = async (songId) => {
    try {
      const res = await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, song_id: songId })
      });
      const data = await res.json();
      if (data.ok) {
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        fetchSetlist(); // refresh list
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const removeItem = async (itemId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t('setlists.confirmRemove', 'Հեռացնե՞լ երգը ցանկից:'))) return;
    try {
      const res = await fetch('/setlists_api.php?action=remove_setlist_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
      });
      const data = await res.json();
      if (data.ok) {
        setItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const res = await fetch('/setlists_api.php?action=update_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlist_id: id,
          name: editName,
          description: editDesc,
          service_date: editDate,
          service_type: setlistData.service_type || ''
        })
      });
      const data = await res.json();
      if (data.ok) {
        setIsEditingSettings(false);
        fetchSetlist();
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const openEditModal = () => {
    setEditName(setlistData.name || '');
    setEditDate(setlistData.service_date || '');
    setEditDesc(setlistData.description || '');
    setIsEditingSettings(true);
  };

  if (authLoading || loading) {
    return null;
  }

  if (error || !setlistData) {
    return (
      <div className="setlists-page">
        <div className="sl-placeholder empty-state animate-fade-in">
          <p style={{color: 'var(--color-accent-red)'}}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/setlists')} style={{marginTop: '16px'}}>
            {t('setlists.goBack', 'Գնալ Հետ')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setlists-page animate-fade-in">
      {/* Editor Header */}
      <div className="sl-header" style={{ marginBottom: '1rem' }}>
        <div className="sl-title">
          <button className="icon-btn" onClick={() => navigate('/setlists')} style={{ marginRight: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '12px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{setlistData.name}</h2>
              {setlistData.can_edit === 1 && (
                <button className="icon-btn" onClick={openEditModal} title={t('setlists.edit')} style={{ color: 'var(--color-text-secondary)' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </button>
              )}
            </div>
            {setlistData.service_date && (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '500', marginTop: '4px' }}>
                {setlistData.service_date}
              </span>
            )}
          </div>
        </div>
        
        {setlistData.can_edit === 1 && (
          <button className="btn btn-primary btn-new-set" onClick={() => setIsSearching(!isSearching)}>
            {isSearching ? (
              <><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> {t('setlists.closeSearch', 'Փակել')}</>
            ) : (
              <><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> {t('setlists.addSong', 'Ավելացնել')}</>
            )}
          </button>
        )}
      </div>

      {setlistData.description && (
        <div style={{ marginBottom: '24px', color: 'var(--color-text-secondary)', fontSize: '0.95rem', background: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-hover)' }}>
          {setlistData.description}
        </div>
      )}
      
      {/* Search Panel */}
      {isSearching && (
        <div className="search-box" style={{ marginBottom: '24px', background: 'var(--color-surface-hover)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%', gap: '12px' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ alignSelf: 'center' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder={t('setlists.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '12px', height: '100%' }}>{t('setlists.searchBtn', 'Որոնել')}</button>
          </form>
        </div>
      )}

      {/* Search Results */}
      {isSearching && searchResults.length > 0 && (
        <div className="track-list" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--color-surface-hover)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-text-secondary)' }}>{t('setlists.searchResults')}</h4>
          {searchResults.map((song, idx) => (
            <div key={song.id} className="track-item" style={{ background: 'var(--color-surface-hover)' }}>
              <div className={`track-cover ${GRADS[(song.id || idx) % GRADS.length]}`}>
                {song.title?.charAt(0)?.toUpperCase()}
              </div>
              <div className="track-info">
                <span className="track-title">{getLocalizedTitle(song, language)}</span>
                <span className="track-artist">{song.artist || t('songs.unknownArtist')}</span>
              </div>
              <div className="track-actions">
                <button className="btn btn-primary" onClick={() => addSong(song.id)} style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '12px' }}>
                  {t('setlists.addBtn', 'Ավելացնել')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setlist Items */}
      <div className="track-list">
        {items.length === 0 ? (
          <div className="list-placeholder empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <p>{t('setlists.emptySetlist', 'Երգացանկը դատարկ է')}</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="track-item" onClick={() => navigate(`/song/${item.song_id}`)}>
              <div className="track-number dim">
                {(idx + 1).toString().padStart(2, '0')}
              </div>

              <div className={`track-cover ${GRADS[(item.song_id || idx) % GRADS.length]}`}>
                {(item.title || item.song_title || '')?.charAt(0)?.toUpperCase()}
              </div>

              <div className="track-info">
                <span className="track-title">{getLocalizedTitle(item, language)}</span>
                <span className="track-artist">{item.artist || item.song_artist || t('songs.unknownArtist')}</span>
              </div>

              <div className="track-meta">
                {item.song_key && <span className="track-key-badge">{item.song_key}</span>}
              </div>

              {setlistData.can_edit === 1 && (
                <div className="track-actions">
                  <button 
                    className="heart-btn" 
                    onClick={(e) => removeItem(item.id, e)}
                    title={t('setlists.remove')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Settings Modal */}
      {isEditingSettings && (
        <div className="sl-modal-overlay" onClick={() => setIsEditingSettings(false)}>
          <div className="sl-modal" onClick={e => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{t('setlists.editSetlist')}</h2>
              <button className="sl-modal-close" onClick={() => setIsEditingSettings(false)}>✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="sl-form-group">
                <label>{t('setlists.nameField')}</label>
                <input 
                  type="text" 
                  className="sl-input" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  required 
                />
              </div>

              <div className="sl-form-group">
                <label>{t('setlists.dateField')}</label>
                <input 
                  type="date" 
                  className="sl-input" 
                  value={editDate} 
                  onChange={e => setEditDate(e.target.value)} 
                />
              </div>

              <div className="sl-form-group">
                <label>{t('setlists.descField')}</label>
                <textarea 
                  className="sl-input" 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                  rows={2}
                  style={{ resize: 'vertical' }}
                ></textarea>
              </div>

              <div className="sl-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditingSettings(false)}>{t('setlists.cancelBtn')}</button>
                <button type="submit" className="btn btn-primary">{t('setlists.saveBtn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
