import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Setlists.css';

export default function SetlistEditor() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [setlistData, setSetlistData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
        alert(data.error || 'Սխալ տեղի ունեցավ');
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const removeItem = async (itemId) => {
    if (!window.confirm(t('setlists.confirmRemove'))) return;
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
        alert(data.error || 'Սխալ տեղի ունեցավ');
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
    return (
      <div className="setlists-page container">
        <div className="loading-state"><p>{t('setlists.loading')}</p></div>
      </div>
    );
  }

  if (error || !setlistData) {
    return (
      <div className="setlists-page container">
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/setlists')}>{t('setlists.goBack')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="setlists-page container animate-fade-in">
      <div className="page-header">
        <div>
          <button className="icon-btn" onClick={() => navigate('/setlists')} style={{ marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>{setlistData.name}</h2>
            {setlistData.can_edit === 1 && (
              <button className="icon-btn" onClick={openEditModal} title="Խմբագրել երգացանկի կարգավորումները" style={{ color: 'var(--color-accent-gold)' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
            )}
          </div>
          {setlistData.service_date && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Օր: {setlistData.service_date}</p>}
          {setlistData.description && <p>{setlistData.description}</p>}
        </div>
        
        {setlistData.can_edit === 1 && (
          <button className="btn btn-primary" onClick={() => setIsSearching(!isSearching)}>
            {isSearching ? t('setlists.closeSearch') : t('setlists.addSong')}
          </button>
        )}
      </div>
      
      {isEditingSettings && (
        <div className="modal-overlay" onClick={() => setIsEditingSettings(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3>Խմբագրել երգացանկը</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label>Անուն</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Ամսաթիվ / Օր</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Նկարագրություն</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingSettings(false)}>Չեղարկել</button>
                <button type="submit" className="btn btn-primary">Պահպանել</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {isSearching && (
        <div className="create-panel glass-panel animate-fade-in">
          <form onSubmit={handleSearch}>
            <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder={t('setlists.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary">{t('setlists.searchBtn')}</button>
            </div>
          </form>
          
          {searchResults.length > 0 && (
            <div className="search-results-list">
              {searchResults.map(song => (
                <div key={song.id} className="search-result-item">
                  <div>
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                  </div>
                  <button className="btn btn-secondary btn-small" onClick={() => addSong(song.id)}>{t('setlists.addBtn')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="setlist-items">
        {items.length === 0 ? (
          <div className="no-results glass-panel">
            <p>{t('setlists.emptySetlist')}</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="setlist-item-card glass-panel">
              <div className="item-details" onClick={() => item.song_id && navigate(`/song/${item.song_id}?list=setlist_${id}`)}>
                <div className="item-details-inner">
                  <span className="item-index">{index + 1}.</span>
                  <div>
                    <h3>{item.song_title || item.title}</h3>
                    {item.song_artist && <p>{item.song_artist}</p>}
                  </div>
                </div>
              </div>
              
              <div className="item-actions">
                <span className="badge song-key-badge">{item.target_key || item.original_key || t('setlists.noKey')}</span>
                
                {setlistData.can_edit === 1 && (
                  <button className="icon-btn remove-btn" onClick={() => removeItem(item.id)} title={t('setlists.remove')}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
