import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createPortal } from 'react-dom';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import './Setlists.css';
import './SongsApp.css'; // ensure track-list styles are loaded

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
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareChats, setShareChats] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  
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

  const openShareModal = async () => {
    if (!user) return;
    setIsShareModalOpen(true);
    setShareLoading(true);
    try {
      const res = await fetch('/chat_api.php?action=list_chats');
      const data = await res.json();
      if (data.ok) setShareChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
    setShareLoading(false);
  };

  const handleShareToChat = async (chatId) => {
    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: '', setlist_id: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsShareModalOpen(false);
        alert(t('chat.sent', 'Ուղարկված է'));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error');
    }
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

  const moveItem = async (index, direction, e) => {
    if (e) e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);

    const payload = newItems.map((item, idx) => ({ id: item.id, position: idx + 1 }));
    try {
      await fetch('/setlists_api.php?action=reorder_setlist_items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, items: payload })
      });
    } catch (err) {
      console.error(err);
      fetchSetlist(); // revert on error
    }
  };

  const handleDeleteSetlist = async () => {
    if (!window.confirm(t('setlists.confirmDelete', 'Are you sure you want to delete this setlist? This action cannot be undone.'))) return;
    try {
      const res = await fetch('/setlists_api.php?action=delete_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id })
      });
      const data = await res.json();
      if (data.ok) {
        navigate('/setlists');
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      alert(t('setlists.networkError', 'Network error'));
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
              <button className="icon-btn" onClick={openShareModal} title={t('chat.send', 'Ուղարկել Չաթով')} style={{ color: 'var(--color-text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
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
              <div
                className="track-cover"
                style={getSongCoverStyle(song.id || idx, song.title || song.song_key || '')}
              >
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

              <div
                className="track-cover"
                style={getSongCoverStyle(item.song_id || idx, item.title || item.song_title || item.song_key || '')}
              >
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
                <div className="track-actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button className="icon-btn" style={{ padding: '4px', opacity: idx === 0 ? 0.3 : 1, color: 'var(--color-text-secondary)' }} onClick={(e) => moveItem(idx, 'up', e)} disabled={idx === 0}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                  <button className="icon-btn" style={{ padding: '4px', opacity: idx === items.length - 1 ? 0.3 : 1, color: 'var(--color-text-secondary)' }} onClick={(e) => moveItem(idx, 'down', e)} disabled={idx === items.length - 1}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
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

              <div className="sl-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn btn-ghost" onClick={handleDeleteSetlist} style={{ color: 'var(--color-accent-red)' }}>
                  {t('setlists.deleteBtn', 'Delete')}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsEditingSettings(false)}>{t('setlists.cancelBtn')}</button>
                  <button type="submit" className="btn btn-primary">{t('setlists.saveBtn')}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isShareModalOpen && createPortal(
        <div className="share-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <style>{`
            .share-modal-overlay {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.6);
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              z-index: 2147483647;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
            }
            .share-modal-content {
              background: var(--bg-body, #111);
              width: 100%;
              max-width: 500px;
              border-radius: 24px;
              padding: 24px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.5);
              display: flex;
              flex-direction: column;
              max-height: 80vh;
            }
            .share-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              padding-bottom: 12px;
            }
            .share-modal-title {
              margin: 0;
              font-size: 1.25rem;
              font-weight: 600;
              color: #fff;
            }
            .share-chat-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-top: 10px;
            }
            .share-chat-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px;
              border-radius: 12px;
              background: rgba(255,255,255,0.05);
              cursor: pointer;
            }
            .share-chat-avatar {
              width: 40px; height: 40px;
              border-radius: 50%;
              background: rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              color: #fff;
            }
            .share-chat-name {
              font-weight: 600;
              color: #fff;
            }
          `}</style>
          <div className="share-modal-content fade-in" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3 className="share-modal-title">{t('chat.send', 'Ուղարկել Չաթով')}</h3>
              <button className="icon-btn" onClick={() => setIsShareModalOpen(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="share-chat-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {shareLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
              ) : shareChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('chat.emptySubtitle', 'Չաթեր չկան')}</div>
              ) : (
                shareChats.map(chat => (
                  <div key={chat.id} className="share-chat-item" onClick={() => handleShareToChat(chat.id)}>
                    <div className="share-chat-avatar">
                      {chat.type === 'group' ? '👥' : (chat.participant_names ? chat.participant_names.charAt(0).toUpperCase() : '👤')}
                    </div>
                    <div className="share-chat-name">
                      {chat.type === 'group' ? chat.name : chat.participant_names}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
