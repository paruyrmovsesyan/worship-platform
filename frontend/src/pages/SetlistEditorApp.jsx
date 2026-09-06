import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { getSongCoverStyle } from '../utils/songCover';
import { usePageReady } from '../hooks/usePageReady';
import { renderWithChords } from '../utils/chordTransposer';
import PrintStudio from '../components/PrintStudio';
import './Setlists.css';
import './SongsApp.css';
import './SetlistEditorApp.css';

const SECTION_PRESETS = [
  '🌟 Սկիզբ / Ողջույն',
  '🎸 Երկրպագություն',
  '📖 Քարոզ',
  '🙏 Աղոթք',
  '🍞 Հաղորդություն',
  '✨ Ավարտ / Օրհնություն'
];

const TEAM_ROLES = [
  'Առաջնորդ',
  'Վոկալ',
  'Ակուստիկ կիթառ',
  'Էլեկտրական կիթառ',
  'Բաս',
  'Ստեղնաշարային',
  'Հարվածային',
  'Ձայնային օպերատոր',
  'Պրոյեկցիա / Մեդիա',
  'Այլ'
];

export default function SetlistEditorApp() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [setlistData, setSetlistData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  usePageReady(loading || authLoading);
  const [error, setError] = useState(null);

  // Quick Song Drawer
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickResults, setQuickResults] = useState([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const quickSearchTimerRef = useRef(null);

  // In-App Add Section Modal
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareAsEditable, setShareAsEditable] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [shareChats, setShareChats] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Team Modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [team, setTeam] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [teamSaving, setTeamSaving] = useState(false);

  // Edit Setlist Settings
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Item Edit Modal (song / section)
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    duration: '',
    bpm: '',
    capo: '',
    target_key: '',
    notes: '',
    transition_type: ''
  });

  // Print Studio
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Drag & drop reorder
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [dropTargetItemId, setDropTargetItemId] = useState(null);

  const canEdit = setlistData?.can_edit === true || Number(setlistData?.can_edit) === 1;
  const canDelete = setlistData?.access_role === 'owner';
  const isEditRoute = location.pathname.endsWith('/edit');

  const songItems = useMemo(() => items.filter(i => i.item_type !== 'section'), [items]);
  const totalDuration = useMemo(
    () => items.reduce((sum, item) => sum + (parseInt(item.duration, 10) || 0), 0),
    [items]
  );

  // Fetch setlist data
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

  // Fetch team count for header badge
  useEffect(() => {
    if (!id) return;
    fetch(`/setlists_api.php?action=get_setlist_team&setlist_id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setTeam(data.team || []);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchSetlist();
    } else {
      setLoading(false);
    }
  }, [id, user, authLoading]);

  // Handle /edit route
  useEffect(() => {
    if (!isEditRoute) return;
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

  // Hide MobileNav & lock body scroll whenever ANY modal or drawer is open
  const isAnyModalOpen = Boolean(
    isQuickDrawerOpen ||
    isAddSectionOpen ||
    isTeamModalOpen ||
    isShareModalOpen ||
    editingItem ||
    isEditingSettings ||
    isPrintOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('sl-modal-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('sl-modal-open');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('sl-modal-open');
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Quick Song Drawer Search
  useEffect(() => {
    if (!isQuickDrawerOpen) return undefined;
    window.clearTimeout(quickSearchTimerRef.current);
    const query = quickQuery.trim();

    quickSearchTimerRef.current = window.setTimeout(() => {
      setQuickLoading(true);
      fetch(`/setlists_api.php?action=search_songs&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setQuickResults(Array.isArray(data) ? data.slice(0, 25) : []))
        .catch(err => console.error(err))
        .finally(() => setQuickLoading(false));
    }, query ? 200 : 0);

    return () => window.clearTimeout(quickSearchTimerRef.current);
  }, [isQuickDrawerOpen, quickQuery]);

  // Add Song
  const handleAddSong = async (songId) => {
    try {
      const res = await fetch('/setlists_api.php?action=add_song_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, song_id: songId })
      });
      const data = await res.json();
      if (data.ok) {
        setAddedIds(prev => ({ ...prev, [songId]: true }));
        fetchSetlist();
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Section
  const handleCreateSection = async (titleToAdd) => {
    const finalTitle = (titleToAdd || sectionTitle).trim();
    if (!finalTitle || sectionSaving) return;
    setSectionSaving(true);
    try {
      const res = await fetch('/setlists_api.php?action=add_section_to_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlist_id: id, title: finalTitle })
      });
      const data = await res.json();
      if (data.ok) {
        setIsAddSectionOpen(false);
        setSectionTitle('');
        fetchSetlist();
      } else {
        alert(data.error || t('setlists.errorOccurred'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSectionSaving(false);
    }
  };

  // Reordering
  const persistReorder = async (nextItems) => {
    const payload = nextItems.map((item, idx) => ({ id: item.id, position: idx + 1 }));
    await fetch('/setlists_api.php?action=reorder_setlist_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setlist_id: id, items: payload })
    });
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
      fetchSetlist();
    }
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

  // Remove Item
  const removeItem = async (itemId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t('setlists.confirmRemove', 'Հեռացնե՞լ այս երգը երգացանկից:'))) return;
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

  // Item Edit
  const openItemEdit = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    const validBpm = (item.bpm && parseInt(item.bpm, 10) > 0)
      ? item.bpm
      : (item.original_bpm && parseInt(item.original_bpm, 10) > 0 ? item.original_bpm : '');

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

  const handleItemEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/setlists_api.php?action=update_setlist_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: editingItem.id, ...itemForm })
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

  // Edit Settings Modal
  const openEditSettings = () => {
    if (!setlistData || !canEdit) return;
    setEditName(setlistData.name || '');
    setEditDate(String(setlistData.service_date || '').slice(0, 10));
    setEditDesc(setlistData.description || '');
    setIsEditingSettings(true);
  };

  const closeEditSettings = () => {
    setIsEditingSettings(false);
    if (isEditRoute) {
      navigate(`/setlists/${id}`, { replace: true });
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
        closeEditSettings();
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

  const handleDeleteSetlist = async () => {
    if (!window.confirm(t('setlists.confirmDelete', 'Վստա՞հ եք, որ ցանկանում եք ջնջել այս երգացանկը:'))) return;
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

  // Team Modal Handlers
  const openTeamModal = async () => {
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
    if (team.find(tItem => tItem.user_id === u.id)) return;
    setTeam([...team, { user_id: u.id, user_name: u.name, role_name: 'Վոկալ' }]);
    setUserSearchResults([]);
    setUserSearchQuery('');
  };

  const removeTeamMember = (userId) => {
    setTeam(team.filter(tItem => tItem.user_id !== userId));
  };

  const updateTeamRole = (userId, role) => {
    setTeam(team.map(tItem => tItem.user_id === userId ? { ...tItem, role_name: role } : tItem));
  };

  const handleSaveTeam = async () => {
    setTeamSaving(true);
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
    } finally {
      setTeamSaving(false);
    }
  };

  // Share Modal Handlers
  const openShareModal = async () => {
    setIsShareModalOpen(true);
    setShareAsEditable(false);
    setShareLoading(true);
    setCopySuccess(false);
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
    } finally {
      setShareLoading(false);
    }
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
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (!publicShareUrl) return;
    const fullUrl = window.location.origin + publicShareUrl;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(() => {
      alert('Failed to copy');
    });
  };

  const handleNativeShare = async () => {
    let fullUrl = window.location.href;
    if (publicShareUrl) {
      fullUrl = window.location.origin + publicShareUrl;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: setlistData?.name || 'Երգացանկ',
          text: `🎵 Երգացանկ՝ ${setlistData?.name || ''}`,
          url: fullUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      handleCopyPublicLink();
    }
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
        alert(t('chat.sent', 'Ուղարկված է չաթում'));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  // Print documents
  const printDocuments = useMemo(() => {
    return items
      .reduce((state, item, index) => {
        if (item.item_type === 'section') {
          return { sectionTitle: item.title || '', documents: state.documents };
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

  if (authLoading || loading) {
    return null;
  }

  if (error || !setlistData) {
    return (
      <div className="sla-page animate-fade-in">
        <div className="sla-empty-state">
          <p style={{ color: '#ff6b81' }}>{error}</p>
          <button className="sla-btn-ghost" onClick={() => navigate('/setlists')} style={{ marginTop: '16px' }}>
            {t('setlists.goBack', 'Գնալ Հետ')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sla-page animate-fade-in">
      {/* ── Top Navigation Bar ── */}
      <div className="sla-nav-bar">
        <button className="sla-back-btn" onClick={() => navigate('/setlists')} aria-label="Գնալ հետ" title="Գնալ հետ">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="sla-nav-actions">
          <button
            type="button"
            className="sla-action-btn sla-action-btn--live"
            onClick={() => navigate(`/setlists/${id}/live`)}
            title="Բացել Live Ռեժիմ"
          >
            <span className="sla-live-dot" />
            <span>Live</span>
          </button>

          <button
            type="button"
            className="sla-action-btn sla-action-btn--icon-only"
            onClick={openShareModal}
            title="Կիսվել"
            aria-label="Կիսվել"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>

          <button
            type="button"
            className="sla-action-btn sla-action-btn--icon-only"
            onClick={() => setIsPrintOpen(true)}
            title="Տպել / PDF"
            aria-label="Տպել"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
          </button>

          {canEdit && (
            <button
              type="button"
              className="sla-action-btn sla-action-btn--icon-only"
              onClick={openEditSettings}
              title="Կարգավորումներ"
              aria-label="Կարգավորումներ"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Setlist Hero Header ── */}
      <div className="sla-hero">
        <h1 className="sla-title">{setlistData.name}</h1>
        <div className="sla-meta-chips">
          {setlistData.service_date && (
            <span className="sla-chip sla-chip--date">
              📅 {setlistData.service_date}
            </span>
          )}
          {totalDuration > 0 && (
            <span className="sla-chip sla-chip--duration">
              ⏱ {totalDuration} րոպե
            </span>
          )}
          <span className="sla-chip">
            🎵 {songItems.length} երգ
          </span>
          {team.length > 0 && (
            <span className="sla-chip sla-chip--team" onClick={openTeamModal} title="Տեսնել թիմը">
              👥 {team.length} անդամ
            </span>
          )}
        </div>
        {setlistData.description && (
          <div className="sla-desc-card">
            {setlistData.description}
          </div>
        )}
      </div>

      {/* ── Main Action Controls ── */}
      {canEdit && (
        <div className="sla-actions-panel">
          <button
            type="button"
            className="sla-hero-add-btn"
            onClick={() => {
              setQuickQuery('');
              setIsQuickDrawerOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Ավելացնել երգ</span>
          </button>

          <div className="sla-sub-actions-grid">
            <button type="button" className="sla-sub-btn" onClick={openTeamModal}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Թիմ</span>
              {team.length > 0 && <span className="sla-sub-badge">{team.length}</span>}
            </button>

            <button type="button" className="sla-sub-btn" onClick={() => setIsAddSectionOpen(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="18" x2="14" y2="18"></line>
              </svg>
              <span>Բաժին</span>
            </button>

            <button type="button" className="sla-sub-btn" onClick={openEditSettings}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Կարգավ.</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Setlist Items List ── */}
      <div className="sla-item-list">
        {items.length === 0 ? (
          <div className="sla-empty-state animate-fade-in">
            <div className="sla-empty-icon">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <h3 className="sla-empty-title">{t('setlists.emptySetlist', 'Երգացանկը դատարկ է')}</h3>
            <p className="sla-empty-subtitle">Ավելացրեք երգեր կամ բաժիններ ծառայությունը կազմակերպելու համար</p>
            {canEdit && (
              <button
                type="button"
                className="sla-empty-btn"
                onClick={() => {
                  setQuickQuery('');
                  setIsQuickDrawerOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Ավելացնել երգ</span>
              </button>
            )}
          </div>
        ) : (
          (() => {
            let songCount = 0;
            return items.map((item, idx) => {
              if (item.item_type === 'section') {
                return (
                  <div
                    key={item.id}
                    className={`sla-section-card ${draggingItemId === item.id ? 'is-dragging' : ''} ${dropTargetItemId === item.id ? 'is-drop-target' : ''}`}
                    draggable={canEdit}
                    onDragStart={() => setDraggingItemId(item.id)}
                    onDragOver={e => { if (canEdit) { e.preventDefault(); setDropTargetItemId(item.id); } }}
                    onDragLeave={() => setDropTargetItemId(null)}
                    onDrop={e => { e.preventDefault(); reorderByItemId(draggingItemId, item.id); setDraggingItemId(null); setDropTargetItemId(null); }}
                    onDragEnd={() => { setDraggingItemId(null); setDropTargetItemId(null); }}
                  >
                    {canEdit && <span className="sla-drag-handle" aria-hidden="true">⋮⋮</span>}
                    <div className="sla-section-info">
                      <span className="sla-section-icon">📌</span>
                      <h4 className="sla-section-title">{item.title}</h4>
                    </div>

                    {canEdit && (
                      <div className="sla-item-actions" onClick={e => e.stopPropagation()}>
                        <div className="sla-reorder-pair">
                          <button
                            type="button"
                            className="sla-reorder-btn"
                            onClick={e => moveItem(idx, 'up', e)}
                            disabled={idx === 0}
                            title="Վերև"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="sla-reorder-btn"
                            onClick={e => moveItem(idx, 'down', e)}
                            disabled={idx === items.length - 1}
                            title="Ներքև"
                          >
                            ▼
                          </button>
                        </div>
                        <button
                          type="button"
                          className="sla-icon-action-btn"
                          onClick={e => openItemEdit(item, e)}
                          title="Խմբագրել բաժինը"
                        >
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="sla-icon-action-btn sla-icon-action-btn--delete"
                          onClick={e => removeItem(item.id, e)}
                          title="Հեռացնել"
                        >
                          ✕
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
                    className={`sla-song-card ${draggingItemId === item.id ? 'is-dragging' : ''} ${dropTargetItemId === item.id ? 'is-drop-target' : ''}`}
                    draggable={canEdit}
                    onClick={() => navigate(`/song/${item.song_id}`)}
                    onDragStart={() => setDraggingItemId(item.id)}
                    onDragOver={e => { if (canEdit) { e.preventDefault(); setDropTargetItemId(item.id); } }}
                    onDragLeave={() => setDropTargetItemId(null)}
                    onDrop={e => { e.preventDefault(); reorderByItemId(draggingItemId, item.id); setDraggingItemId(null); setDropTargetItemId(null); }}
                    onDragEnd={() => { setDraggingItemId(null); setDropTargetItemId(null); }}
                  >
                    {canEdit && <span className="sla-drag-handle" aria-hidden="true">⋮⋮</span>}
                    <span className="sla-song-num">{String(songCount).padStart(2, '0')}</span>

                    <div
                      className="sla-song-cover"
                      style={getSongCoverStyle(item.song_id || idx, item.title || item.song_title || item.song_key || '')}
                    >
                      {(item.title || item.song_title || '')?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="sla-song-info">
                      <span className="sla-song-title">{getLocalizedTitle(item, language)}</span>
                      <div className="sla-song-subtitle">
                        <span className="sla-song-artist">
                          {item.artist || item.song_artist || t('songs.unknownArtist')}
                        </span>
                        <div className="sla-badges-row">
                          {(item.target_key || item.song_key) && (
                            <span className="sla-key-pill">{item.target_key || item.song_key}</span>
                          )}
                          {Number.parseInt(item.bpm, 10) > 0 && (
                            <span className="sla-bpm-pill">{item.bpm} BPM</span>
                          )}
                          {item.capo && (
                            <span className="sla-capo-pill">Capo {item.capo}</span>
                          )}
                          {item.duration ? (
                            <span className="sla-bpm-pill">⏱ {item.duration}ր</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="sla-item-actions" onClick={e => e.stopPropagation()}>
                        <div className="sla-reorder-pair">
                          <button
                            type="button"
                            className="sla-reorder-btn"
                            onClick={e => moveItem(idx, 'up', e)}
                            disabled={idx === 0}
                            title="Վերև"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="sla-reorder-btn"
                            onClick={e => moveItem(idx, 'down', e)}
                            disabled={idx === items.length - 1}
                            title="Ներքև"
                          >
                            ▼
                          </button>
                        </div>
                        <button
                          type="button"
                          className="sla-icon-action-btn"
                          onClick={e => openItemEdit(item, e)}
                          title="Խմբագրել երգը"
                        >
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="sla-icon-action-btn sla-icon-action-btn--delete"
                          onClick={e => removeItem(item.id, e)}
                          title="Հեռացնել"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {item.transition_type && idx < items.length - 1 && (
                    <div className="sla-transition-wrap">
                      <span className="sla-transition-chip">
                        {item.transition_type === 'crossfade'
                          ? '🔄 Սահուն անցում (Crossfade)'
                          : item.transition_type === 'stop'
                          ? '🛑 Դադար (Stop)'
                          : '💬 Խոսք / Աղոթք (Talk)'}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            });
          })()
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          PORTALED MODALS & DRAWERS
          ══════════════════════════════════════════════════════════ */}

      {/* 1. Quick Song Search Drawer */}
      {isQuickDrawerOpen && createPortal(
        <div className="sla-modal-overlay" onClick={() => setIsQuickDrawerOpen(false)}>
          <div className="sla-sheet sla-sheet--song-search" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>Ավելացնել երգ</h3>
              <button type="button" className="sla-sheet-close" onClick={() => setIsQuickDrawerOpen(false)}>✕</button>
            </div>
            <div className="sla-sheet-body">
              <div className="sla-drawer-search-wrap">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="sla-drawer-search-input"
                  placeholder="Որոնել երգ..."
                  value={quickQuery}
                  onChange={e => setQuickQuery(e.target.value)}
                />
                {quickQuery && (
                  <button type="button" className="sla-drawer-search-clear" onClick={() => setQuickQuery('')}>
                    ✕
                  </button>
                )}
              </div>

              <div className="sla-drawer-list">
                {quickLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#8fa0b5' }}>
                    Որոնվում է...
                  </div>
                ) : quickResults.length > 0 ? (
                  quickResults.map((song, sIdx) => {
                    const isAdded = Boolean(addedIds[song.id]);
                    return (
                      <div key={song.id} className="sla-drawer-item">
                        <div className="sla-drawer-item-left">
                          <div
                            className="sla-song-cover"
                            style={{
                              width: '38px',
                              height: '38px',
                              fontSize: '0.95rem',
                              ...getSongCoverStyle(song.id || sIdx, song.title || song.song_key || '')
                            }}
                          >
                            {song.title?.charAt(0)?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="sla-drawer-item-title">
                              {getLocalizedTitle(song, language)}
                            </div>
                            <div className="sla-drawer-item-sub">
                              {song.artist || t('songs.unknownArtist')}
                              {song.song_key && ` • ${song.song_key}`}
                              {song.bpm ? ` • ${song.bpm} BPM` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`sla-drawer-add-btn ${isAdded ? 'is-added' : ''}`}
                          onClick={() => handleAddSong(song.id)}
                        >
                          {isAdded ? '✓ Ավելացված է' : '+ Ավելացնել'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#8fa0b5' }}>
                    {quickQuery.trim() ? 'Երգեր չեն գտնվել' : 'Սկսեք մուտքագրել երգի անվանումը'}
                  </div>
                )}
              </div>
            </div>
            <div className="sla-sheet-footer">
              <button type="button" className="sla-btn-primary" onClick={() => setIsQuickDrawerOpen(false)}>
                Ավարտել
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. In-App Add Section Modal */}
      {isAddSectionOpen && createPortal(
        <div className="sla-modal-overlay" onClick={() => setIsAddSectionOpen(false)}>
          <div className="sla-sheet" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>Ավելացնել Բաժին</h3>
              <button type="button" className="sla-sheet-close" onClick={() => setIsAddSectionOpen(false)}>✕</button>
            </div>
            <div className="sla-sheet-body">
              <div className="sla-form-group">
                <label className="sla-form-label">Բաժնի անվանումը</label>
                <input
                  type="text"
                  className="sla-input"
                  placeholder="Օր.՝ Երկրպագություն, Քարոզ..."
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="sla-preset-title">Արագ ընտրություն (մեկ հպումով)</div>
              <div className="sla-presets-grid">
                {SECTION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className="sla-preset-tag"
                    onClick={() => {
                      setSectionTitle(preset);
                      handleCreateSection(preset);
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="sla-sheet-footer">
              <button type="button" className="sla-btn-ghost" onClick={() => setIsAddSectionOpen(false)}>
                Չեղարկել
              </button>
              <button
                type="button"
                className="sla-btn-primary"
                disabled={!sectionTitle.trim() || sectionSaving}
                onClick={() => handleCreateSection(sectionTitle)}
              >
                {sectionSaving ? 'Ավելացվում է...' : 'Ավելացնել'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Team Modal */}
      {isTeamModalOpen && createPortal(
        <div className="sla-modal-overlay" onClick={() => setIsTeamModalOpen(false)}>
          <div className="sla-sheet" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>Երգացանկի Թիմ</h3>
              <button type="button" className="sla-sheet-close" onClick={() => setIsTeamModalOpen(false)}>✕</button>
            </div>
            <div className="sla-sheet-body">
              {/* User search bar */}
              <form onSubmit={handleUserSearch} className="sla-team-search-bar">
                <input
                  type="text"
                  className="sla-input"
                  placeholder="Փնտրել մասնակից..."
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                />
                <button type="submit" className="sla-btn-ghost" style={{ padding: '0 18px' }}>
                  Որոնել
                </button>
              </form>

              {userSearchResults.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#8fa0b5', padding: '4px 8px 8px' }}>Գտնված օգտատերեր՝</div>
                  {userSearchResults.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{u.name}</span>
                      <button
                        type="button"
                        className="sla-btn-ghost"
                        style={{ height: '32px', padding: '0 12px', fontSize: '0.8rem', color: '#00d4ff' }}
                        onClick={() => addTeamMember(u)}
                      >
                        + Ավելացնել
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Current team */}
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#8fa0b5', marginBottom: '10px' }}>
                Ներկայիս անդամները ({team.length})
              </div>

              {team.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#68778d' }}>
                  Դեռևս ոչ մի մասնակից ավելացված չէ: Որոնեք և նշանակեք թիմի անդամներին:
                </div>
              ) : (
                team.map(tMember => (
                  <div key={tMember.user_id} className="sla-team-member-card">
                    <div className="sla-team-avatar">
                      {tMember.user_name?.charAt(0)?.toUpperCase() || '👤'}
                    </div>
                    <span className="sla-team-name">{tMember.user_name}</span>
                    <select
                      className="sla-team-role-select"
                      value={tMember.role_name}
                      onChange={e => updateTeamRole(tMember.user_id, e.target.value)}
                    >
                      {TEAM_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="sla-icon-action-btn sla-icon-action-btn--delete"
                      onClick={() => removeTeamMember(tMember.user_id)}
                      title="Հեռացնել"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}

              <div style={{ fontSize: '0.78rem', color: '#718096', marginTop: '12px', lineHeight: 1.4 }}>
                💡 Թիմի նոր անդամները կստանան ավտոմատ ծանուցում անձնական չաթում:
              </div>
            </div>
            <div className="sla-sheet-footer">
              <button type="button" className="sla-btn-ghost" onClick={() => setIsTeamModalOpen(false)}>
                Չեղարկել
              </button>
              <button
                type="button"
                className="sla-btn-primary"
                disabled={teamSaving}
                onClick={handleSaveTeam}
              >
                {teamSaving ? 'Պահպանվում է...' : 'Պահպանել թիմը'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Share Modal */}
      {isShareModalOpen && createPortal(
        <div className="sla-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="sla-sheet" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>Կիսվել երգացանկով</h3>
              <button type="button" className="sla-sheet-close" onClick={() => setIsShareModalOpen(false)}>✕</button>
            </div>
            <div className="sla-sheet-body">
              {/* Native Mobile Share Button */}
              {navigator.share && (
                <button type="button" className="sla-share-native-btn" onClick={handleNativeShare}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                  <span>Կիսվել (WhatsApp, Telegram...)</span>
                </button>
              )}

              {/* Public Link Section */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                  Հանրային հղում
                </div>
                <div style={{ fontSize: '0.78rem', color: '#8fa0b5', marginBottom: '8px' }}>
                  Այս հղումով ցանկացած մարդ կարող է դիտել երգացանկը:
                </div>
                {publicShareUrl ? (
                  <div className="sla-share-link-box">
                    <input
                      type="text"
                      className="sla-share-link-input"
                      readOnly
                      value={window.location.origin + publicShareUrl}
                      onClick={e => e.target.select()}
                    />
                    <button
                      type="button"
                      className="sla-btn-ghost"
                      style={{ padding: '0 14px', height: '40px', color: copySuccess ? '#2ecc71' : '#00d4ff' }}
                      onClick={handleCopyPublicLink}
                    >
                      {copySuccess ? '✓ Պատճենվեց' : 'Պատճենել'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="sla-btn-ghost"
                    style={{ width: '100%', height: '42px', color: '#00d4ff' }}
                    onClick={handleGeneratePublicLink}
                    disabled={generatingLink}
                  >
                    {generatingLink ? 'Ստեղծվում է...' : 'Ստեղծել հանրային հղում'}
                  </button>
                )}
              </div>

              {/* Chat sharing */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Ուղարկել չաթով</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#8fa0b5' }}>
                    <input
                      type="checkbox"
                      checked={shareAsEditable}
                      onChange={e => setShareAsEditable(e.target.checked)}
                    />
                    Թույլատրել խմբագրել
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {shareLoading ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#8fa0b5' }}>Բեռնվում է...</div>
                  ) : shareChats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#68778d' }}>Չաթեր չկան</div>
                  ) : (
                    shareChats.map(c => (
                      <div
                        key={c.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', cursor: 'pointer' }}
                        onClick={() => handleShareToChat(c.id)}
                      >
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {c.type === 'group' ? '👥' : (c.participant_names ? c.participant_names.charAt(0).toUpperCase() : '👤')}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>
                          {c.type === 'group' ? c.name : c.participant_names}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#00d4ff' }}>Ուղարկել ➔</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="sla-sheet-footer">
              <button type="button" className="sla-btn-primary" onClick={() => setIsShareModalOpen(false)}>
                Փակել
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Item Edit Modal */}
      {editingItem && createPortal(
        <div className="sla-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="sla-sheet" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>{editingItem.item_type === 'section' ? 'Խմբագրել բաժինը' : 'Խմբագրել երգը'}</h3>
              <button type="button" className="sla-sheet-close" onClick={() => setEditingItem(null)}>✕</button>
            </div>
            <form onSubmit={handleItemEditSubmit}>
              <div className="sla-sheet-body">
                {editingItem.item_type === 'section' ? (
                  <div className="sla-form-group">
                    <label className="sla-form-label">Բաժնի անվանում</label>
                    <input
                      type="text"
                      className="sla-input"
                      value={itemForm.title}
                      onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="sla-form-group">
                      <label className="sla-form-label">Տոնայնություն (Target Key)</label>
                      <input
                        type="text"
                        className="sla-input"
                        placeholder="Օր.՝ G, Em, Bb"
                        value={itemForm.target_key}
                        onChange={e => setItemForm({ ...itemForm, target_key: e.target.value })}
                      />
                    </div>
                    <div className="sla-form-group">
                      <label className="sla-form-label">BPM (տեմպ)</label>
                      <input
                        type="number"
                        className="sla-input"
                        placeholder="Օր.՝ 120"
                        value={itemForm.bpm}
                        onChange={e => setItemForm({ ...itemForm, bpm: e.target.value })}
                      />
                    </div>
                    <div className="sla-form-group">
                      <label className="sla-form-label">Կապո (Capo)</label>
                      <input
                        type="text"
                        className="sla-input"
                        placeholder="Օր.՝ 2"
                        value={itemForm.capo}
                        onChange={e => setItemForm({ ...itemForm, capo: e.target.value })}
                      />
                    </div>
                    <div className="sla-form-group">
                      <label className="sla-form-label">Անցում հաջորդին (Transition)</label>
                      <select
                        className="sla-select"
                        value={itemForm.transition_type}
                        onChange={e => setItemForm({ ...itemForm, transition_type: e.target.value })}
                      >
                        <option value="">(Առանց նշումի)</option>
                        <option value="crossfade">🔄 Սահուն անցում (Crossfade)</option>
                        <option value="stop">🛑 Դադար (Stop)</option>
                        <option value="talk">💬 Խոսք / Աղոթք (Talk/Pray)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="sla-form-group">
                  <label className="sla-form-label">Տևողություն (րոպե)</label>
                  <input
                    type="number"
                    className="sla-input"
                    placeholder="Օր.՝ 4"
                    value={itemForm.duration}
                    onChange={e => setItemForm({ ...itemForm, duration: e.target.value })}
                    min="0"
                  />
                </div>

                <div className="sla-form-group">
                  <label className="sla-form-label">Նշումներ (Notes)</label>
                  <textarea
                    className="sla-textarea"
                    rows="3"
                    placeholder="Նշումներ թիմի համար..."
                    value={itemForm.notes}
                    onChange={e => setItemForm({ ...itemForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="sla-sheet-footer">
                <button type="button" className="sla-btn-ghost" onClick={() => setEditingItem(null)}>
                  Չեղարկել
                </button>
                <button type="submit" className="sla-btn-primary">
                  Պահպանել
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 6. Edit Setlist Settings Modal */}
      {isEditingSettings && createPortal(
        <div className="sla-modal-overlay" onClick={closeEditSettings}>
          <div className="sla-sheet" onClick={e => e.stopPropagation()}>
            <div className="sla-sheet-header">
              <h3>Խմբագրել երգացանկը</h3>
              <button type="button" className="sla-sheet-close" onClick={closeEditSettings}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="sla-sheet-body">
                <div className="sla-form-group">
                  <label className="sla-form-label">{t('setlists.nameField', 'Անվանում')}</label>
                  <input
                    type="text"
                    className="sla-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="sla-form-group">
                  <label className="sla-form-label">{t('setlists.dateField', 'Ծառայության ամսաթիվ')}</label>
                  <input
                    type="date"
                    className="sla-input"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                  />
                </div>

                <div className="sla-form-group">
                  <label className="sla-form-label">{t('setlists.descField', 'Նկարագրություն')}</label>
                  <textarea
                    className="sla-textarea"
                    rows="3"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Ծառայության նկարագրություն կամ թեմա..."
                  />
                </div>

                {canDelete && (
                  <button type="button" className="sla-btn-danger" onClick={handleDeleteSetlist}>
                    🗑️ {t('setlists.deleteBtn', 'Ջնջել երգացանկը')}
                  </button>
                )}
              </div>

              <div className="sla-sheet-footer">
                <button type="button" className="sla-btn-ghost" onClick={closeEditSettings}>
                  Չեղարկել
                </button>
                <button type="submit" className="sla-btn-primary" disabled={editSaving}>
                  {editSaving ? 'Պահպանվում է...' : 'Պահպանել'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 7. Print Studio */}
      <PrintStudio
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        documents={printDocuments}
        documentTitle={setlistData.name}
        defaultShowChords
      />
    </div>
  );
}
