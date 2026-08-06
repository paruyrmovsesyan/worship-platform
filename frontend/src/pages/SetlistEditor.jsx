import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createPortal } from 'react-dom';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { useIsPWA } from '../hooks/useIsPWA';
import { renderWithChords } from '../utils/chordTransposer';
import PrintStudio from '../components/PrintStudio';
import './Setlists.css';
import './SongsApp.css'; // ensure track-list styles are loaded
import './SetlistEditorWebPro.css';

export default function SetlistEditor() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isPWA = useIsPWA();
  
  const [setlistData, setSetlistData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageReady(loading || authLoading);
  const [error, setError] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareAsEditable, setShareAsEditable] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareChats, setShareChats] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [team, setTeam] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const canEdit = setlistData?.can_edit === true || Number(setlistData?.can_edit) === 1;
  const canDelete = setlistData?.access_role === 'owner';
  const isEditRoute = location.pathname.endsWith('/edit');
  
  const totalDuration = items.reduce((sum, item) => sum + (parseInt(item.duration) || 0), 0);

  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ duration: '', bpm: '', capo: '', target_key: '', notes: '', title: '', transition_type: '' });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [dropTargetItemId, setDropTargetItemId] = useState(null);
  const quickSearchTimerRef = useRef(null);

  const printDocuments = useMemo(() => {
    return items
      .reduce((state, item, index) => {
        if (item.item_type === 'section') {
          return {
            sectionTitle: item.title || '',
            documents: state.documents,
          };
        }
        const title = getLocalizedTitle(item, language);
        return {
          sectionTitle: state.sectionTitle,
          documents: [
            ...state.documents,
            {
              id: item.id || `${item.song_id}-${index}`,
              title: state.sectionTitle ? `${state.sectionTitle} / ${title}` : title,
              artist: item.artist || item.song_artist,
              key: item.target_key || item.song_key,
              bpm: item.bpm || item.original_bpm,
              chords: item.chords ? renderWithChords(item.chords, 0, false) : '',
              lyrics: item.lyrics || '',
            },
          ],
        };
      }, { sectionTitle: '', documents: [] })
      .documents;
  }, [items, language]);
  
  const openItemEdit = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    
    const validBpm = (item.bpm && parseInt(item.bpm) > 0) 
      ? item.bpm 
      : (item.original_bpm && parseInt(item.original_bpm) > 0 ? item.original_bpm : '');

    setItemForm({
      title: item.title || '',
      duration: item.duration || '',
      bpm: validBpm,
      capo: item.capo || '',
      target_key: item.target_key || '',
      notes: item.notes || '',
      transition_type: item.transition_type || ''
    });
  };

  const closeItemEdit = () => setEditingItem(null);

  const handleItemEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/setlists_api.php?action=update_setlist_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: editingItem.id,
          ...itemForm
        })
      });
      const data = await res.json();
      if (data.ok) {
        setEditingItem(null);
        fetchSetlist();
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const openShareModal = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsShareModalOpen(true);
    setShareAsEditable(false);
    setShareLoading(true);
    try {
      const [chatRes, statusRes, accessRes] = await Promise.all([
        fetch('/chat_api.php?action=list_chats'),
        fetch(`/setlists_api.php?action=get_share_status&setlist_id=${id}`),
        fetch(`/setlists_api.php?action=list_setlist_access&setlist_id=${id}`)
      ]);
      
      const chatData = await chatRes.json();
      if (chatData.ok) setShareChats(chatData.chats || []);
      
      const statusData = await statusRes.json();
      if (statusData.ok && statusData.share_url) {
        setPublicShareUrl(statusData.share_url);
      } else {
        setPublicShareUrl(null);
      }

      const accessData = await accessRes.json();
      if (Array.isArray(accessData)) {
        setSharedUsers(accessData);
      } else if (accessData.ok) {
        setSharedUsers(accessData.access || accessData.users || []);
      }
    } catch (err) {
      console.error(err);
    }
    setShareLoading(false);
  };

  const handleGeneratePublicLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await fetch('/setlists_api.php?action=generate_share_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id }),
      });
      const data = await res.json();
      if (data.ok && data.share_url) {
        setPublicShareUrl(data.share_url);
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
    setGeneratingLink(false);
  };

  const handleCopyPublicLink = () => {
    if (!publicShareUrl) return;
    const fullUrl = window.location.origin + publicShareUrl;
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert(t('songView.linkCopied', 'Հղումը պատճենվեց'));
    }).catch(() => {
      alert('Failed to copy');
    });
  };

  const handleShareToChat = async (chatId) => {
    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: '', setlist_id: id, can_edit: shareAsEditable }),
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

  const openTeamModal = async (e) => {
    e.stopPropagation();
    setIsTeamModalOpen(true);
    try {
       const res = await fetch(`/setlists_api.php?action=get_setlist_team&setlist_id=${id}`);
       const data = await res.json();
       if (data.ok) setTeam(data.team || []);
    } catch (err) {
       console.error(err);
    }
  };

  const handleUserSearch = async (e) => {
    e.preventDefault();
    if (!userSearchQuery.trim()) return;
    try {
      const res = await fetch(`/friends_api.php?action=search_users&q=${encodeURIComponent(userSearchQuery)}`);
      const data = await res.json();
      if (data.ok) setUserSearchResults(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addTeamMember = (u) => {
    if (team.find(t => t.user_id === u.id)) return;
    setTeam([...team, { user_id: u.id, user_name: u.name, role_name: 'Վոկալ' }]);
    setUserSearchResults([]);
    setUserSearchQuery('');
  };

  const removeTeamMember = (userId) => {
    setTeam(team.filter(t => t.user_id !== userId));
  };

  const updateTeamRole = (userId, role) => {
    setTeam(team.map(t => t.user_id === userId ? { ...t, role_name: role } : t));
  };

  const handleSaveTeam = async () => {
    try {
      const res = await fetch('/setlists_api.php?action=manage_setlist_team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, team })
      });
      const data = await res.json();
      if (data.ok) {
        setIsTeamModalOpen(false);
        if (data.new_users && data.new_users.length > 0) {
            for (const userId of data.new_users) {
               const chatRes = await fetch('/chat_api.php?action=get_direct_chat', {
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target_user_id: userId })
               });
               const chatData = await chatRes.json();
               if (chatData.ok) {
                   await fetch('/chat_api.php?action=send_message', {
                       method: 'POST', 
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                           chat_id: chatData.chat.id,
                           message: `🔔 Դուք նշանակված եք ծառայության այս երգացանկում՝ ${setlistData.name}:`,
                           setlist_id: id
                       })
                   });
               }
            }
        }
      }
    } catch (err) {
      console.error(err);
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

  const persistReorder = async (nextItems) => {
    const payload = nextItems.map((item, idx) => ({ id: item.id, position: idx + 1 }));
    await fetch('/setlists_api.php?action=reorder_setlist_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setlist_id: id, items: payload })
    });
  };

  const reorderByItemId = async (sourceId, targetId) => {
    if (!canEdit || !sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = items.findIndex(item => String(item.id) === String(sourceId));
    const targetIndex = items.findIndex(item => String(item.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, moved);
    setItems(nextItems);
    try {
      await persistReorder(nextItems);
    } catch (err) {
      console.error(err);
      fetchSetlist();
    }
  };

  const addSection = async () => {
    const title = window.prompt(t('setlists.sectionTitlePrompt', 'Մուտքագրեք բաժնի անվանումը (օր.՝ Սկիզբ, Քարոզ)'));
    if (!title) return;
    try {
      const res = await fetch('/setlists_api.php?action=add_section_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, title: title })
      });
      const data = await res.json();
      if (data.ok) {
        fetchSetlist();
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

    try {
      await persistReorder(newItems);
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
    if (!editName.trim() || editSaving) return;
    setEditSaving(true);
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
        closeEditModal();
        fetchSetlist();
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
      alert(t('setlists.networkError', 'Network error'));
    } finally {
      setEditSaving(false);
    }
  };
  
  const prepareEditModal = () => {
    if (!setlistData || !canEdit) return;
    setEditName(setlistData.name || '');
    setEditDate(String(setlistData.service_date || '').slice(0, 10));
    setEditDesc(setlistData.description || '');
    setIsEditingSettings(true);
  };

  const closeEditModal = () => {
    setIsEditingSettings(false);
    if (isEditRoute) {
      navigate(`/setlists/${id}`, { replace: true });
    }
  };

  useEffect(() => {
    if (!isEditRoute) {
      setIsEditingSettings(false);
      return;
    }
    if (!setlistData) return;
    if (!canEdit) {
      navigate(`/setlists/${id}`, { replace: true });
      return;
    }
    setEditName(setlistData.name || '');
    setEditDate(String(setlistData.service_date || '').slice(0, 10));
    setEditDesc(setlistData.description || '');
    setIsEditingSettings(true);
  }, [canEdit, id, isEditRoute, navigate, setlistData]);

  useEffect(() => {
    if (!isEditingSettings) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isEditingSettings]);

  useEffect(() => {
    if (isPWA) return undefined;
    const openPrintStudio = () => setIsPrintOpen(true);
    window.addEventListener('worship:open-print-studio', openPrintStudio);
    return () => window.removeEventListener('worship:open-print-studio', openPrintStudio);
  }, [isPWA]);

  useEffect(() => {
    if (isPWA || !isQuickDrawerOpen) return undefined;
    window.clearTimeout(quickSearchTimerRef.current);
    const query = quickQuery.trim();
    if (!query) {
      return undefined;
    }

    quickSearchTimerRef.current = window.setTimeout(() => {
      setQuickLoading(true);
      fetch(`/setlists_api.php?action=search_songs&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setQuickResults(Array.isArray(data) ? data.slice(0, 10) : []))
        .catch(err => console.error(err))
        .finally(() => setQuickLoading(false));
    }, 220);

    return () => window.clearTimeout(quickSearchTimerRef.current);
  }, [isPWA, isQuickDrawerOpen, quickQuery]);

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
    <div className={`setlists-page animate-fade-in ${!isPWA ? 'setlist-editor-pro' : ''}`}>
      {/* Editor Header */}
      <div className="sle-header">
        <div className="sle-top-row">
          <button className="sle-back-btn" onClick={() => navigate('/setlists')} title="Գնալ հետ">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="sle-title-block">
            <div className="sle-title-row">
              <h2 className="sle-title-text">{setlistData.name}</h2>
              <div className="sle-actions-group">
                {canEdit && (
                  <Link to={`/setlists/${id}/edit`} className="sle-icon-btn" onClick={prepareEditModal} aria-label={t('setlists.edit')} title={t('setlists.edit')}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </Link>
                )}
                <button type="button" className="sle-icon-btn sle-icon-btn--live" onClick={() => navigate(`/setlists/${id}/live`)} title="Live Ռեժիմ">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button type="button" className="sle-icon-btn" onClick={openShareModal} title={t('setlists.share', 'Կիսվել երգացանկով')}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
                <button type="button" className="sle-icon-btn" onClick={() => isPWA ? window.print() : setIsPrintOpen(true)} title="Տպել (Print)">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </button>
              </div>
            </div>
            
            <div className="sle-meta-row">
              {setlistData.service_date && (
                <span className="sle-date-text">
                  📅 {setlistData.service_date}
                </span>
              )}
              {totalDuration > 0 && (
                <span className="sle-duration-chip">
                  ⏱ {totalDuration} րոպե
                </span>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="sle-controls-row">
            <button className="btn btn-secondary sle-btn" onClick={openTeamModal}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Թիմ
            </button>
            <button className="btn btn-secondary sle-btn" onClick={addSection}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M4 6h16M4 18h16"></path></svg>
              Ավելացնել Բաժին
            </button>
            {!isPWA && (
              <button className="btn btn-secondary sle-btn" type="button" onClick={() => setIsQuickDrawerOpen(true)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h7"></path><path d="M18 15v6M15 18h6"></path></svg>
                Արագ ավելացում
              </button>
            )}
            <button className="btn btn-primary sle-btn sle-btn--add-song" onClick={() => setIsSearching(!isSearching)}>
              {isSearching ? (
                <><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> {t('setlists.closeSearch', 'Փակել')}</>
              ) : (
                <><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> {t('setlists.addSong', 'Ավելացնել Երգ')}</>
              )}
            </button>
          </div>
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
                {song.last_played_date && (
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                    📅 Վերջին անգամ՝ {song.last_played_date}
                  </span>
                )}
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

      {/* Edit Item Modal */}
      {editingItem && createPortal(
        <div className="sl-modal-overlay" onClick={closeItemEdit}>
          <div className="sl-modal" onClick={e => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{editingItem.item_type === 'section' ? 'Խմբագրել բաժինը' : 'Խմբագրել երգը'}</h2>
              <button type="button" className="sl-modal-close" onClick={closeItemEdit}>✕</button>
            </div>
            
            <form onSubmit={handleItemEditSubmit}>
              {editingItem.item_type === 'section' && (
                <div className="sl-form-group">
                  <label>Անվանում</label>
                  <input type="text" className="sl-input" value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} required />
                </div>
              )}
              
              <div className="sl-form-group">
                <label>Տևողություն (րոպե)</label>
                <input type="number" className="sl-input" value={itemForm.duration} onChange={e => setItemForm({...itemForm, duration: e.target.value})} min="0" placeholder="Օր.՝ 5" />
              </div>

              {editingItem.item_type === 'song' && (
                <>
                  <div className="sl-form-group">
                    <label>BPM</label>
                    <input type="number" className="sl-input" value={itemForm.bpm} onChange={e => setItemForm({...itemForm, bpm: e.target.value})} placeholder="Օր. 120" />
                  </div>
                  <div className="sl-form-group">
                    <label>Անցում հաջորդին (Transition)</label>
                    <select className="sl-input" value={itemForm.transition_type} onChange={e => setItemForm({...itemForm, transition_type: e.target.value})}>
                      <option value="">(Առանց նշումի)</option>
                      <option value="crossfade">🔄 Սահուն անցում (Crossfade)</option>
                      <option value="stop">🛑 Դադար (Stop)</option>
                      <option value="talk">💬 Խոսք / Աղոթք (Talk/Pray)</option>
                    </select>
                  </div>
                  <div className="sl-form-group">
                    <label>Տոնայնություն (Target Key)</label>
                    <input type="text" className="sl-input" value={itemForm.target_key} onChange={e => setItemForm({...itemForm, target_key: e.target.value})} placeholder="Օր.՝ G" />
                  </div>
                </>
              )}
              
              <div className="sl-form-group">
                <label>Նշումներ (Notes)</label>
                <textarea className="sl-input" value={itemForm.notes} onChange={e => setItemForm({...itemForm, notes: e.target.value})} rows="3" placeholder="Կարևոր նշումներ..."></textarea>
              </div>

              <div className="sl-modal-actions">
                <button type="button" className="sl-btn sl-btn-secondary" onClick={closeItemEdit}>{t('setlists.cancelBtn')}</button>
                <button type="submit" className="sl-btn sl-btn-primary">{t('setlists.saveBtn')}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Setlist Items */}
      <div className="track-list sle-pro-list">
        {items.length === 0 ? (
          <div className="list-placeholder empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <p>{t('setlists.emptySetlist', 'Երգացանկը դատարկ է')}</p>
          </div>
        ) : (
          (() => {
            let songCount = 0;
            return items.map((item, idx) => {
              if (item.item_type === 'section') {
              return (
                <div
                  key={item.id}
                  className={`track-item section-header sle-pro-item ${draggingItemId === item.id ? 'is-dragging' : ''} ${dropTargetItemId === item.id ? 'is-drop-target' : ''}`}
                  draggable={!isPWA && canEdit}
                  onDragStart={() => setDraggingItemId(item.id)}
                  onDragOver={event => { if (!isPWA && canEdit) { event.preventDefault(); setDropTargetItemId(item.id); } }}
                  onDragLeave={() => setDropTargetItemId(null)}
                  onDrop={event => { event.preventDefault(); reorderByItemId(draggingItemId, item.id); setDraggingItemId(null); setDropTargetItemId(null); }}
                  onDragEnd={() => { setDraggingItemId(null); setDropTargetItemId(null); }}
                  style={{ background: 'var(--color-surface)', marginTop: '16px', borderLeft: '4px solid var(--color-primary)' }}
                >
                  {!isPWA && canEdit && <span className="sle-drag-handle" aria-hidden="true">⋮⋮</span>}
                  <div className="track-info" style={{ width: '100%', paddingLeft: '8px' }}>
                    <span className="track-title" style={{ fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>{item.title}</span>
                  </div>
                  {canEdit && (
                    <div className="sl-actions-wrap" onClick={(e) => e.stopPropagation()}>
                      <div className="sl-reorder-group">
                        <button className="sl-reorder-btn" onClick={(e) => moveItem(idx, 'up', e)} disabled={idx === 0} title="Վերև">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                        <button className="sl-reorder-btn" onClick={(e) => moveItem(idx, 'down', e)} disabled={idx === items.length - 1} title="Ներքև">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>
                      <button className="sl-edit-btn" onClick={(e) => openItemEdit(item, e)} title="Խմբագրել" style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button 
                        className="sl-delete-btn"
                        onClick={(e) => removeItem(item.id, e)}
                        title={t('setlists.remove')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            songCount++;
            return (
              <React.Fragment key={item.id}>
              <div
                className={`track-item sle-pro-item ${draggingItemId === item.id ? 'is-dragging' : ''} ${dropTargetItemId === item.id ? 'is-drop-target' : ''}`}
                draggable={!isPWA && canEdit}
                onClick={() => navigate(`/song/${item.song_id}`)}
                onDragStart={() => setDraggingItemId(item.id)}
                onDragOver={event => { if (!isPWA && canEdit) { event.preventDefault(); setDropTargetItemId(item.id); } }}
                onDragLeave={() => setDropTargetItemId(null)}
                onDrop={event => { event.preventDefault(); reorderByItemId(draggingItemId, item.id); setDraggingItemId(null); setDropTargetItemId(null); }}
                onDragEnd={() => { setDraggingItemId(null); setDropTargetItemId(null); }}
              >
                {!isPWA && canEdit && <span className="sle-drag-handle" aria-hidden="true">⋮⋮</span>}
                <div className="track-number dim">
                  {songCount.toString().padStart(2, '0')}
                </div>

                <div
                  className="track-cover"
                  style={getSongCoverStyle(item.song_id || idx, item.title || item.song_title || item.song_key || '')}
                >
                  {(item.title || item.song_title || '')?.charAt(0)?.toUpperCase()}
                </div>

                <div className="track-info">
                  <span className="track-title">{getLocalizedTitle(item, language)}</span>
                  <span className="track-artist">
                    {item.artist || item.song_artist || t('songs.unknownArtist')}
                    {item.duration ? ` • ⏱ ${item.duration}ր` : ''}
                    {Number.parseInt(item.bpm, 10) > 0 ? ` • 🎵 ${item.bpm} BPM` : ''}
                  </span>
                </div>

                <div className="track-meta">
                  {item.song_key && <span className="track-key-badge">{item.song_key}</span>}
                </div>

                {canEdit && (
                  <div className="sl-actions-wrap" onClick={(e) => e.stopPropagation()}>
                    <div className="sl-reorder-group">
                      <button className="sl-reorder-btn" onClick={(e) => moveItem(idx, 'up', e)} disabled={idx === 0} title="Վերև">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                      <button className="sl-reorder-btn" onClick={(e) => moveItem(idx, 'down', e)} disabled={idx === items.length - 1} title="Ներքև">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>
                    <button className="sl-edit-btn" onClick={(e) => openItemEdit(item, e)} title="Խմբագրել" style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button 
                      className="sl-delete-btn"
                      onClick={(e) => removeItem(item.id, e)}
                      title={t('setlists.remove')}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {item.transition_type && idx < items.length - 1 && (
                <div style={{ textAlign: 'center', margin: '4px 0 16px 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                  {item.transition_type === 'crossfade' ? '🔄 Սահուն անցում' : item.transition_type === 'stop' ? '🛑 Դադար' : '💬 Խոսք / Աղոթք'}
                </div>
              )}
              </React.Fragment>
            );
          });
        })()
      )}
      </div>

      {/* Edit Settings Modal */}
      {isEditingSettings && createPortal(
        <div className="sl-modal-overlay" onClick={closeEditModal}>
          <div className="sl-modal" onClick={e => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{t('setlists.editSetlist')}</h2>
              <button type="button" className="sl-modal-close" onClick={closeEditModal} aria-label={t('setlists.cancelBtn')}>✕</button>
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
                <div className="sl-modal-actions-main">
                  <button type="button" className="btn btn-ghost" onClick={closeEditModal}>
                    {t('setlists.cancelBtn')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editSaving}>
                    {editSaving ? t('setlists.savingBtn', 'Պահպանվում է...') : t('setlists.saveBtn')}
                  </button>
                </div>
                {canDelete && (
                  <button type="button" className="sl-modal-delete-btn" onClick={handleDeleteSetlist}>
                    🗑️ {t('setlists.deleteBtn', 'Ջնջել երգացանկը')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Team Modal */}
      {isTeamModalOpen && createPortal(
        <div className="sl-modal-overlay" onClick={() => setIsTeamModalOpen(false)}>
          <div className="sl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="sl-modal-header">
              <h3 className="sl-modal-title">Երգացանկի Թիմ</h3>
              <button className="sl-modal-close" onClick={() => setIsTeamModalOpen(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="sl-input" value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} placeholder="Որոնել օգտատեր..." />
                  <button type="submit" className="sl-btn sl-btn-primary" style={{ padding: '0 16px' }}>Որոնել</button>
                </form>
                {userSearchResults.length > 0 && (
                  <div style={{ background: 'var(--color-surface-hover)', borderRadius: '8px', marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                    {userSearchResults.map(u => (
                       <div key={u.id} style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-surface)' }}>
                         <span>{u.name}</span>
                         <button className="sl-btn sl-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => addTeamMember(u)}>Ավելացնել</button>
                       </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--color-text-secondary)' }}>Ներկայիս Թիմը</h4>
                {team.length === 0 ? (
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>Դեռ թիմի անդամներ չկան:</div>
                ) : (
                  team.map(t => (
                    <div key={t.user_id} style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ flex: 1, fontWeight: '500' }}>{t.user_name}</div>
                       <select className="sl-input" value={t.role_name} onChange={e => updateTeamRole(t.user_id, e.target.value)} style={{ width: '120px', padding: '6px', fontSize: '0.85rem' }}>
                         <option value="Առաջնորդ">Առաջնորդ</option>
                         <option value="Վոկալ">Վոկալ</option>
                         <option value="Կիթառ">Կիթառ</option>
                         <option value="Բաս">Բաս</option>
                         <option value="Ստեղնաշարային">Ստեղնաշարային</option>
                         <option value="Հարվածային">Հարվածային</option>
                         <option value="Այլ">Այլ</option>
                       </select>
                       <button onClick={() => removeTeamMember(t.user_id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                         <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                       </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="sl-modal-actions">
              <button className="sl-btn sl-btn-secondary" onClick={() => setIsTeamModalOpen(false)}>Չեղարկել</button>
              <button className="sl-btn sl-btn-primary" onClick={handleSaveTeam}>Պահպանել</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isShareModalOpen && createPortal(
        <div className="sl-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <style>{`
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
          <div className="sl-modal" onClick={e => e.stopPropagation()}>
            <div className="sl-modal-header">
              <h2>{t('setlists.share', 'Կիսվել երգացանկով')}</h2>
              <button type="button" className="sl-modal-close" onClick={() => setIsShareModalOpen(false)} aria-label="Close">✕</button>
            </div>
            
            <div style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Ուղարկել ծրագրում (Չաթով)</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input 
                  type="checkbox" 
                  checked={shareAsEditable} 
                  onChange={e => setShareAsEditable(e.target.checked)} 
                />
                Թույլատրել խմբագրել
              </label>
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

            {sharedUsers && sharedUsers.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Ում է հասանելի</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {sharedUsers.filter(u => u.status === 'active').map(user => (
                    <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          {user.grantee_name ? user.grantee_name.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <span style={{ fontSize: '13px', color: '#fff' }}>{user.grantee_name || user.email}</span>
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: user.can_edit ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.1)', color: user.can_edit ? '#2ecc71' : 'var(--text-muted)' }}>
                        {user.can_edit ? 'Խմբագրող' : 'Դիտող'}
                      </span>
                    </div>
                  ))}
                  {sharedUsers.filter(u => u.status === 'active').length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Դեռ ոչ ոքի չի ուղարկվել</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#fff' }}>Հանրային հղում</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                Այս հղումով ցանկացած մարդ կկարողանա տեսնել այս երգացանկը, անգամ եթե գրանցված չէ ծրագրում:
              </p>
              {publicShareUrl ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={window.location.origin + publicShareUrl} 
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '13px', outline: 'none' }}
                    onClick={(e) => e.target.select()}
                  />
                  <button type="button" className="sle-btn sle-btn-primary" onClick={handleCopyPublicLink} style={{ padding: '10px 16px', borderRadius: '8px', height: '40px' }}>
                    Պատճենել
                  </button>
                </div>
              ) : (
                <button type="button" className="sle-btn sle-btn-primary" onClick={handleGeneratePublicLink} disabled={generatingLink} style={{ width: '100%', padding: '10px', borderRadius: '8px', justifyContent: 'center', height: '40px' }}>
                  {generatingLink ? 'Ստեղծվում է...' : 'Ստեղծել հանրային հղում'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {!isPWA && (
        <PrintStudio
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          documents={printDocuments}
          documentTitle={setlistData.name}
          defaultShowChords
        />
      )}

      {!isPWA && isQuickDrawerOpen && createPortal(
        <div className="quick-song-drawer-backdrop" onMouseDown={() => setIsQuickDrawerOpen(false)}>
          <aside className="quick-song-drawer" onMouseDown={event => event.stopPropagation()} aria-label="Արագ երգ ավելացնել">
            <header>
              <div>
                <span>QUICK SONG DRAWER</span>
                <h2>Արագ ավելացում</h2>
              </div>
              <button type="button" onClick={() => setIsQuickDrawerOpen(false)} aria-label="Փակել">×</button>
            </header>
            <div className="quick-song-search">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={quickQuery}
                onChange={event => {
                  setQuickQuery(event.target.value);
                  if (!event.target.value.trim()) {
                    setQuickResults([]);
                    setQuickLoading(false);
                  }
                }}
                placeholder="Որոնել երգ..."
                autoFocus
              />
            </div>
            <div className="quick-song-results">
              {quickLoading ? (
                <div className="quick-song-empty">Որոնվում է...</div>
              ) : quickResults.length ? (
                quickResults.map(song => (
                  <button
                    type="button"
                    key={song.id}
                    className="quick-song-result"
                    onClick={() => addSong(song.id)}
                  >
                    <span className="quick-song-check">+</span>
                    <span className="quick-song-copy">
                      <strong>{getLocalizedTitle(song, language)}</strong>
                      <small>{song.artist || t('songs.unknownArtist')}</small>
                    </span>
                    <span className="quick-song-meta">
                      {song.song_key ? <b>{song.song_key}</b> : null}
                      {Number(song.bpm) > 0 ? <small>{song.bpm} BPM</small> : null}
                    </span>
                  </button>
                ))
              ) : (
                <div className="quick-song-empty">{quickQuery.trim() ? 'Արդյունք չկա' : 'Սկսեք որոնել երգը'}</div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}

    </div>
  );
}
