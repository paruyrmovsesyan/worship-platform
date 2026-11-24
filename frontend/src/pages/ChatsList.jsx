import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { usePageReady } from '../hooks/usePageReady';
import { triggerHaptic } from '../utils/nativeFeatures';
import { ChatsListSkeleton } from '../components/NativeSkeletons';
import './ChatsList.css';

export default function ChatsList({ isEmbedded = false }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isPWA = useIsAppMode();
  const isNativeApp = useIsNativeApp();

  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [acceptingRequestId, setAcceptingRequestId] = useState(0);
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

  // Website UI & PWA search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'direct', 'groups', 'unread'
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  usePageReady(loading || authLoading);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/chat_api.php?action=list_chats');
      const data = await res.json();
      if (data.ok) setChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/friends_api.php?action=list');
      const data = await res.json();
      if (data.ok) {
        const relationships = data.friends || [];
        setFriends(relationships.filter(friend => friend.status === 'accepted'));
        setIncomingRequests(relationships.filter(friend => (
          friend.status === 'pending' && Number(friend.requester_id) !== Number(user?.id)
        )));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
      return;
    }
    if (user) {
      const initialFetch = window.setTimeout(() => {
        fetchChats();
        fetchFriends();
      }, 0);
      const handleNativeRefresh = (event) => {
        const path = event?.detail?.pathname;
        if (!path || path === '/chats') {
          fetchChats();
          fetchFriends();
        }
      };
      window.addEventListener('wp-native-refresh', handleNativeRefresh);
      let tickCount = 0;
      const interval = setInterval(() => {
        if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
        tickCount += 1;
        fetchChats();
        if (tickCount % 3 === 0) {
          fetchFriends();
        }
      }, 6000);
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && navigator.onLine !== false) {
          fetchChats();
          fetchFriends();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        window.clearTimeout(initialFetch);
        window.removeEventListener('wp-native-refresh', handleNativeRefresh);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(interval);
      };
    }
  }, [user, authLoading, navigate, fetchChats, fetchFriends]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/friends_api.php?action=search_users&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.ok) {
          setSearchResults(data.users || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingUsers(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchQueryChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchingUsers(false);
    }
  };

  const addFriend = async (userId) => {
    try {
      const res = await fetch('/friends_api.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        console.warn('addFriend error:', data.error);
      }
      fetchFriends();
      const q = searchQuery.trim();
      if (q.length >= 2) {
        const resSearch = await fetch(`/friends_api.php?action=search_users&q=${encodeURIComponent(q)}`);
        const dataSearch = await resSearch.json();
        if (dataSearch.ok) setSearchResults(dataSearch.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const acceptFriend = async (userId) => {
    setAcceptingRequestId(Number(userId));
    setRequestError('');
    try {
      const res = await fetch('/friends_api.php?action=accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t('friends.acceptError', 'Չհաջողվեց ընդունել հարցումը'));
      }
      setIncomingRequests(current => current.filter(request => Number(request.friend_id) !== Number(userId)));
      await Promise.all([fetchFriends(), fetchChats()]);
      window.dispatchEvent(new CustomEvent('wp-friendship-updated'));
      const q = searchQuery.trim();
      if (q.length >= 2) {
        const resSearch = await fetch(`/friends_api.php?action=search_users&q=${encodeURIComponent(q)}`);
        const dataSearch = await resSearch.json();
        if (dataSearch.ok) setSearchResults(dataSearch.users || []);
      }
    } catch (e) {
      console.error(e);
      setRequestError(e.message || t('friends.acceptError', 'Չհաջողվեց ընդունել հարցումը'));
    } finally {
      setAcceptingRequestId(0);
    }
  };

  const startDirectChatWithFriend = async (friendId) => {
    try {
      const res = await fetch('/chat_api.php?action=get_direct_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: friendId })
      });
      const data = await res.json();
      if (data.ok && data.chat_id) {
        navigate(`/chat/${data.chat_id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFriendSelection = (id) => {
    if (selectedFriends.includes(id)) {
      setSelectedFriends(selectedFriends.filter(f => f !== id));
    } else {
      setSelectedFriends([...selectedFriends, id]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) return;
    try {
      const res = await fetch('/chat_api.php?action=create_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, friend_ids: selectedFriends })
      });
      const data = await res.json();
      if (data.ok && data.chat_id) {
        setIsCreatingGroup(false);
        setGroupName('');
        setSelectedFriends([]);
        navigate(`/chat/${data.chat_id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || authLoading) {
    return isNativeApp ? <ChatsListSkeleton /> : null;
  }

  const formatChatDate = (value) => {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };

  const getChatAvatar = (chat) => {
    return chat.type === 'group' ? '👥' : (chat.participant_names ? chat.participant_names.charAt(0).toUpperCase() : '👤');
  };

  const getPreviewText = (chat) => {
    if (!chat.last_message) {
      return chat.type === 'group'
        ? '✉️ ' + t('chat.emptyTitle', 'Սկսեք զրույցը')
        : t('chat.emptySubtitle', 'Գրեք առաջին հաղորդագրությունը...');
    }
    if (chat.last_message.startsWith('CALL:')) {
      const parts = chat.last_message.split(':');
      const status = parts[1];
      if (status === 'missed') return '📞 ' + t('chat.missedCall', 'Բաց թողնված աուդիոզանգ');
      if (status === 'declined') return '📞 ' + t('chat.declinedCall', 'Մերժված աուդիոզանգ');
      if (status === 'ended') {
        const sec = parseInt(parts[2], 10) || 0;
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const dur = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `📞 ${t('chat.audioCall', 'Աուդիոզանգ')} (${dur})`;
      }
      return '📞 ' + t('chat.audioCall', 'Աուդիոզանգ');
    }
    const songMatch = chat.last_message.match(/^\[SONG\|id:\d+\|key:[+-]?\d+\|capo:\d+\|title:([^\]]*)/);
    if (songMatch) {
      return `🎵 ${songMatch[1].replace(/\.\.\.$/, '')}...`;
    }
    if (/^(https?:\/\/|www\.)/i.test(chat.last_message.trim())) {
      return `🔗 ${chat.last_message}`;
    }
    return chat.last_message;
  };

  // Filter chats based on tab and search
  const filteredChats = chats.filter(chat => {
    const title = (chat.type === 'group' ? chat.name : chat.participant_names) || '';
    const preview = chat.last_message || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          preview.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'direct') return chat.type !== 'group';
    if (filterTab === 'groups') return chat.type === 'group';
    if (filterTab === 'unread') return Number(chat.unread_count || 0) > 0;
    return true;
  });

  const onlineFriends = friends.filter(f => Number(f.is_online) === 1);

  const friendRequestsPanel = incomingRequests.length > 0 ? (
    <section className="chat-friend-requests" aria-label={t('friends.incomingTitle', 'Նոր հարցումներ')}>
      <div className="chat-friend-requests-heading">
        <span className="chat-friend-requests-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
        </span>
        <div>
          <strong>{t('friends.incomingTitle', 'Նոր ընկերության հարցումներ')}</strong>
          <small>{incomingRequests.length}</small>
        </div>
        <button type="button" className="chat-friend-requests-all" onClick={() => navigate('/friends')}>
          {t('common.viewAll', 'Տեսնել բոլորը')}
        </button>
      </div>
      <div className="chat-friend-request-list">
        {incomingRequests.map(request => (
          <div className="chat-friend-request-row" key={request.friend_id}>
            <span className="chat-friend-request-avatar">{(request.name || 'U').charAt(0).toUpperCase()}</span>
            <span className="chat-friend-request-copy">
              <strong>{request.name || request.email}</strong>
              <small>{request.email}</small>
            </span>
            <button
              type="button"
              className="chat-friend-request-accept"
              disabled={acceptingRequestId === Number(request.friend_id)}
              onClick={() => acceptFriend(request.friend_id)}
            >
              {acceptingRequestId === Number(request.friend_id)
                ? t('common.loading', '...')
                : t('friends.accept', 'Ընդունել')}
            </button>
          </div>
        ))}
      </div>
      {requestError && <p className="chat-friend-request-error" role="alert">{requestError}</p>}
    </section>
  ) : null;

  // ════════════════════════════════════════════════════════════════
  // WEBSITE MODE DISPLAY (!isPWA && !isEmbedded)
  // ════════════════════════════════════════════════════════════════
  if (!isPWA && !isEmbedded) {
    return (
      <div className="website-chats-wrapper">
        
        {/* HERO BANNER */}
        <div className="website-chats-hero">
          <div className="website-chats-hero-glow" />
          <div className="website-chats-hero-top">
            <div>
              <span className="website-chats-badge">💬 {t('chats.chats', 'ԶՐՈՒՅՑՆԵՐ & ՉԱԹԵՐ')}</span>
              <h1>{t('friends.tabs.chats', 'Զրույցներ և Թիմային Չաթեր')}</h1>
              <p>{t('chats.heroSubtitle', 'Կապվեք Ձեր երաժիշտների, պաշտամունքի թիմի և ընկերների հետ իրական ժամանակում:')}</p>
            </div>
            <div className="website-chats-hero-actions">
              <button className="btn-hero-action primary" onClick={() => setIsCreatingGroup(true)}>
                <span>+ {t('chat.group', 'Ստեղծել Խումբ')}</span>
              </button>
              <button className="btn-hero-action secondary" onClick={() => navigate('/friends')}>
                <span>👥 {t('nav.friends', 'Ընկերներ')}</span>
              </button>
            </div>
          </div>

          {/* FRIENDS QUICK STRIP */}
          <div className="website-friends-strip">
            <div className="friends-strip-title">
              <span>{t('friends.activeFriends', 'Ակտիվ Ընկերներ')} ({onlineFriends.length})</span>
            </div>
            {onlineFriends.length === 0 ? (
              <div className="friends-strip-empty" style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.45)', padding: '4px 0' }}>
                Այս պահին ակտիվ ընկերներ չկան
              </div>
            ) : (
              <div className="friends-strip-list">
                {onlineFriends.map(f => (
                  <div key={f.friend_id} className="friend-strip-chip" onClick={() => startDirectChatWithFriend(f.friend_id)}>
                    <div className="friend-strip-avatar" style={f.avatar_gradient ? { background: f.avatar_gradient } : undefined}>
                      {(f.name || 'U').charAt(0).toUpperCase()}
                      <span className="online-dot" />
                    </div>
                    <span className="friend-strip-name">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {friendRequestsPanel}

        {/* TOOLBAR & TABS */}
        <div className="website-chats-controls">
          <div className="website-chats-tabs">
            <button 
              className={`chats-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              ✨ {t('common.all', 'Բոլորը')} ({chats.length})
            </button>
            <button 
              className={`chats-tab-btn ${filterTab === 'direct' ? 'active' : ''}`}
              onClick={() => setFilterTab('direct')}
            >
              👤 {t('chats.direct', 'Անձնական')}
            </button>
            <button 
              className={`chats-tab-btn ${filterTab === 'groups' ? 'active' : ''}`}
              onClick={() => setFilterTab('groups')}
            >
              👥 {t('chats.groups', 'Խմբեր')}
            </button>
            <button 
              className={`chats-tab-btn ${filterTab === 'unread' ? 'active' : ''}`}
              onClick={() => setFilterTab('unread')}
            >
              🔴 {t('chats.unread', 'Չկարդացված')}
            </button>
          </div>

          <div className="website-chats-search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder={t('chats.searchPlaceholder', 'Փնտրել զրույցներ, թիմեր...')}
              value={searchQuery}
              onChange={handleSearchQueryChange}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        {/* CHAT CARDS LIST */}
        {filteredChats.length === 0 ? (
          <div className="website-chats-empty">
            <div className="website-chats-empty-icon">💬</div>
            <h3>{searchQuery ? 'Զրույց չի գտնվել' : t('chat.emptyTitle', 'Զրույցներ դեռ չկան')}</h3>
            <p>{searchQuery ? `«${searchQuery}» որոնմամբ արդյունք չկա:` : t('chat.emptySubtitle', 'Սկսեք նոր զրույց Ձեր ընկերների հետ կամ ստեղծեք թիմային խումբ:')}</p>
            {!searchQuery && (
              <button className="btn-hero-action primary" onClick={() => setIsCreatingGroup(true)}>
                + {t('chat.group', 'Ստեղծել Խումբ')}
              </button>
            )}
          </div>
        ) : (
          <div className="website-chat-list">
            {filteredChats.map(chat => {
              const unreadCount = Number(chat.unread_count || 0);
              const hasUnread = unreadCount > 0;
              const chatTitle = chat.type === 'group' ? chat.name : chat.participant_names;

              return (
                <div 
                  key={chat.id} 
                  className={`website-chat-card ${hasUnread ? 'unread' : ''}`}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  <div className={`website-chat-avatar ${chat.type === 'group' ? 'group' : ''}`} style={chat.type !== 'group' && chat.avatar_gradient ? { background: chat.avatar_gradient } : undefined}>
                    {getChatAvatar(chat)}
                    {hasUnread && <span className="unread-dot-badge" />}
                  </div>

                  <div className="website-chat-info">
                    <div className="website-chat-top">
                      <strong className={`website-chat-name ${hasUnread ? 'unread' : ''}`}>
                        {chatTitle}
                      </strong>
                      <div className="website-chat-meta">
                        {chat.last_message_at && (
                          <span className={`website-chat-date ${hasUnread ? 'unread' : ''}`}>
                            {formatChatDate(chat.last_message_at)}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="website-chat-count">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`website-chat-snippet ${hasUnread ? 'unread' : ''}`}>
                      {getPreviewText(chat)}
                    </div>
                  </div>

                  <svg className="website-chat-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE GROUP MODAL */}
        {isCreatingGroup && createPortal(
          <div className="website-group-modal-overlay" onClick={() => setIsCreatingGroup(false)}>
            <div className="website-group-modal" onClick={e => e.stopPropagation()}>
              <h3>👥 {t('chat.group', 'Ստեղծել Խումբ')}</h3>
              <input 
                type="text" 
                placeholder={`${t('chat.group', 'Խմբի անվանումը')}...`} 
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
              <p className="dim" style={{ fontSize: '0.86rem', marginBottom: '12px' }}>
                {t('friends.findDesc', 'Ընտրեք անդամներին Ձեր ընկերների ցանկից:')}
              </p>
              <div className="website-group-friends-list">
                {friends.length === 0 && <span className="dim">{t('friends.emptyFriends', 'Ընկերներ չունեք')}</span>}
                {friends.map(f => (
                  <label key={f.friend_id} className="website-group-friend-option">
                    <input 
                      type="checkbox" 
                      checked={selectedFriends.includes(f.friend_id)}
                      onChange={() => toggleFriendSelection(f.friend_id)}
                    />
                    <span>{f.name}</span>
                  </label>
                ))}
              </div>
              <div className="website-group-actions">
                <button className="btn-hero-action secondary" onClick={() => setIsCreatingGroup(false)}>
                  {t('friends.cancel', 'Չեղարկել')}
                </button>
                <button 
                  className="btn-hero-action primary" 
                  onClick={createGroup} 
                  disabled={!groupName.trim() || selectedFriends.length === 0}
                >
                  {t('chat.group', 'Ստեղծել')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // APP & EMBEDDED MODE DISPLAY
  // ════════════════════════════════════════════════════════════════
  const directCount = chats.filter((c) => c.type !== 'group').length;
  const groupCount = chats.filter((c) => c.type === 'group').length;
  const unreadChatsCount = chats.filter((c) => Number(c.unread_count || 0) > 0).length;
  const totalUnreadMessages = chats.reduce((sum, c) => sum + Number(c.unread_count || 0), 0);

  const renderAppAvatar = (chat) => {
    if (chat.type === 'group') {
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    const letter = (chat.participant_names || '').trim().charAt(0).toUpperCase();
    if (letter) return letter;
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  };

  const renderAppPreview = (chat) => {
    if (!chat.last_message) {
      return chat.type === 'group'
        ? t('chat.emptyTitle', 'Սկսեք զրույցը')
        : t('chat.emptySubtitle', 'Գրեք առաջին հաղորդագրությունը...');
    }
    if (chat.last_message.startsWith('CALL:')) {
      const parts = chat.last_message.split(':');
      const status = parts[1];
      let callLabel = t('chat.audioCall', 'Աուդիոզանգ');
      if (status === 'missed') callLabel = t('chat.missedCall', 'Բաց թողնված աուդիոզանգ');
      else if (status === 'declined') callLabel = t('chat.declinedCall', 'Մերժված աուդիոզանգ');
      else if (status === 'ended') {
        const sec = parseInt(parts[2], 10) || 0;
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        callLabel = `${callLabel} (${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`;
      }
      return (
        <span className="chat-preview-inline">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>{callLabel}</span>
        </span>
      );
    }
    const songMatch = chat.last_message.match(/^\[SONG\|id:\d+\|key:[+-]?\d+\|capo:\d+\|title:([^\]]*)/);
    if (songMatch) {
      return (
        <span className="chat-preview-inline">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{songMatch[1].replace(/\.\.\.$/, '')}</span>
        </span>
      );
    }
    if (/^(https?:\/\/|www\.)/i.test(chat.last_message.trim())) {
      return (
        <span className="chat-preview-inline">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>{chat.last_message}</span>
        </span>
      );
    }
    return chat.last_message;
  };

  const containerProps = isEmbedded
    ? { className: 'embedded-chats' }
    : { className: 'page-container animate-fade-in chats-list-page' };

  return (
    <div {...containerProps}>
      {!isEmbedded && (
        <header className="pwa-chats-header">
          <div className="pwa-chats-heading">
            <h1 className="pwa-chats-title">{t('friends.tabs.chats', 'Չաթեր')}</h1>
            {totalUnreadMessages > 0 && (
              <span className="pwa-chats-unread-pill">
                {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
              </span>
            )}
          </div>
          {!isCreatingGroup && (
            <div className="pwa-chats-header-actions">
              <button
                type="button"
                className="pwa-chats-icon-btn"
                onClick={() => {
                  triggerHaptic('light');
                  navigate('/friends');
                }}
                aria-label={t('nav.friends', 'Ընկերներ')}
                title={t('nav.friends', 'Ընկերներ')}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {incomingRequests.length > 0 && <span className="pwa-chats-req-dot" />}
              </button>
              <button
                type="button"
                className="pwa-chats-new-group-btn"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCreatingGroup(true);
                }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t('chat.group', 'Խումբ')}</span>
              </button>
            </div>
          )}
        </header>
      )}

      {isEmbedded && !isCreatingGroup && (
        <div className="embedded-chats-toolbar">
          <button
            type="button"
            className="pwa-chats-new-group-btn"
            onClick={() => {
              triggerHaptic('light');
              setIsCreatingGroup(true);
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t('chat.group', 'Խումբ')}</span>
          </button>
        </div>
      )}

      {!isCreatingGroup && friendRequestsPanel}

      {!isEmbedded && !isCreatingGroup && onlineFriends.length > 0 && (
        <div className="pwa-active-friends-strip">
          <div className="pwa-active-friends-title">
            <span className="pwa-active-friends-dot" />
            <span>{t('friends.activeFriends', 'Ակտիվ Ընկերներ')} ({onlineFriends.length})</span>
          </div>
          <div className="pwa-active-friends-row">
            {onlineFriends.map((f) => (
              <button
                type="button"
                key={f.friend_id}
                className="pwa-active-friend-item"
                onClick={() => {
                  triggerHaptic('light');
                  startDirectChatWithFriend(f.friend_id);
                }}
              >
                <div className="pwa-active-friend-avatar" style={f.avatar_gradient ? { background: f.avatar_gradient } : undefined}>
                  {(f.name || 'U').charAt(0).toUpperCase()}
                  <span className="pwa-active-friend-badge" />
                </div>
                <span className="pwa-active-friend-name">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isCreatingGroup && (
        <>
          <div className="pwa-chats-search-bar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" className="pwa-chats-search-ico">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t('chats.searchPlaceholder', 'Փնտրել զրույցներ, թիմեր, օգտատերեր...')}
              value={searchQuery}
              onChange={handleSearchQueryChange}
            />
            {searchQuery && (
              <button
                type="button"
                className="pwa-chats-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchingUsers(false);
                }}
                aria-label="Մաքրել"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="pwa-chats-filter-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'all'}
              className={`pwa-chats-filter-pill ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterTab('all');
              }}
            >
              <span>{t('common.all', 'Բոլորը')}</span>
              <em>{chats.length}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'direct'}
              className={`pwa-chats-filter-pill ${filterTab === 'direct' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterTab('direct');
              }}
            >
              <span>{t('chats.direct', 'Անձնական')}</span>
              <em>{directCount}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'groups'}
              className={`pwa-chats-filter-pill ${filterTab === 'groups' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterTab('groups');
              }}
            >
              <span>{t('chats.groups', 'Խմբեր')}</span>
              <em>{groupCount}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'unread'}
              className={`pwa-chats-filter-pill ${filterTab === 'unread' ? 'active' : ''} ${unreadChatsCount > 0 ? 'has-unread' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterTab('unread');
              }}
            >
              <span>{t('chats.unread', 'Չկարդացված')}</span>
              <em>{unreadChatsCount}</em>
            </button>
          </div>
        </>
      )}

      {/* App User Search Results (Add Friend / Chat) */}
      {!isCreatingGroup && searchQuery.trim().length >= 2 && (
        <div className="pwa-user-search-results">
          <div className="pwa-user-search-header">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>{t('friends.findTitle', 'Գտնել և Ավելացնել Ընկերներ')}</span>
          </div>

          {searchingUsers ? (
            <div className="pwa-user-search-loading">{t('common.searching', 'Որոնվում է...')}</div>
          ) : searchResults.length === 0 ? (
            <div className="pwa-user-search-empty">{t('friends.noUsersFound', 'Օգտատերեր չեն գտնվել')}</div>
          ) : (
            <div className="pwa-user-search-list">
              {searchResults.map((u) => {
                const isAccepted = u.friend_status === 'accepted';
                const isPendingSent =
                  u.friend_status === 'pending_sent' ||
                  (u.friend_status === 'pending' && Boolean(u.is_requester));
                const isPendingReceived =
                  u.friend_status === 'pending_received' ||
                  (u.friend_status === 'pending' && !u.is_requester);

                return (
                  <div key={u.id} className="pwa-user-search-card">
                    <div className="pwa-user-search-avatar" style={u.avatar_gradient ? { background: u.avatar_gradient } : undefined}>
                      {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="pwa-user-search-info">
                      <strong>{u.name || u.username}</strong>
                      <small>{u.email || u.username}</small>
                    </div>
                    <div className="pwa-user-search-action">
                      {isAccepted ? (
                        <button
                          type="button"
                          className="btn-pwa-user-action chat"
                          onClick={() => startDirectChatWithFriend(u.id)}
                        >
                          {t('friends.tabs.chats', 'Չաթ')}
                        </button>
                      ) : isPendingSent ? (
                        <span className="pwa-user-status-badge pending">
                          {t('friends.requestSent', 'Հարցված')}
                        </span>
                      ) : isPendingReceived ? (
                        <button
                          type="button"
                          className="btn-pwa-user-action accept"
                          onClick={() => acceptFriend(u.id)}
                        >
                          {t('friends.accept', 'Ընդունել')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-pwa-user-action add"
                          onClick={() => addFriend(u.id)}
                        >
                          + {t('friends.add', 'Ավելացնել')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isCreatingGroup ? (
        <div className="chat-group-builder">
          <div className="chat-group-builder-head">
            <div>
              <h3>{t('chat.group', 'Ստեղծել խումբ')}</h3>
              <p className="chat-group-builder-copy">{t('friends.findDesc', 'Ընտրեք անդամներին Ձեր ընկերների ցանկից')}</p>
            </div>
            <button
              type="button"
              className="chat-group-close-btn"
              onClick={() => setIsCreatingGroup(false)}
              aria-label={t('friends.cancel', 'Փակել')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <input
            type="text"
            className="chat-group-name-input"
            placeholder={`${t('chat.group', 'Խմբի անվանումը')}...`}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <div className="chat-group-selected-bar">
            <span>{t('nav.friends', 'Ընկերներ')}</span>
            <em>{selectedFriends.length}</em>
          </div>

          <div className="chat-group-builder-list">
            {friends.length === 0 ? (
              <span className="chat-group-empty">{t('friends.emptyFriends', 'Ընկերներ դեռ չունեք')}</span>
            ) : (
              friends.map((f) => {
                const isChecked = selectedFriends.includes(f.friend_id);
                return (
                  <button
                    type="button"
                    key={f.friend_id}
                    className={`chat-group-builder-option ${isChecked ? 'is-selected' : ''}`}
                    onClick={() => {
                      triggerHaptic('light');
                      toggleFriendSelection(f.friend_id);
                    }}
                  >
                    <span
                      className="chat-group-option-avatar"
                      style={f.avatar_gradient ? { background: f.avatar_gradient } : undefined}
                    >
                      {(f.name || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="chat-group-option-name">{f.name}</span>
                    <span className={`chat-group-check ${isChecked ? 'is-checked' : ''}`}>
                      {isChecked && (
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="chat-group-builder-actions">
            <button
              type="button"
              className="chat-group-btn-cancel"
              onClick={() => setIsCreatingGroup(false)}
            >
              {t('friends.cancel', 'Չեղարկել')}
            </button>
            <button
              type="button"
              className="chat-group-btn-submit"
              onClick={createGroup}
              disabled={!groupName.trim() || selectedFriends.length === 0}
            >
              {t('chat.group', 'Ստեղծել խումբ')}
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-list-items">
          {filteredChats.length === 0 ? (
            <div className="pwa-chats-empty">
              <span className="pwa-chats-empty-ico">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <h3>
                {searchQuery
                  ? 'Զրույց չի գտնվել'
                  : filterTab !== 'all'
                  ? 'Այս բաժնում զրույցներ չկան'
                  : t('chat.emptyTitle', 'Զրույցներ դեռ չկան')}
              </h3>
              <p>
                {searchQuery
                  ? `«${searchQuery}» որոնմամբ արդյունք չկա`
                  : t('chat.emptySubtitle', 'Սկսեք նոր զրույց Ձեր ընկերների հետ կամ ստեղծեք թիմային խումբ')}
              </p>
              {!searchQuery && filterTab === 'all' && (
                <div className="pwa-chats-empty-actions">
                  <button
                    type="button"
                    className="pwa-chats-new-group-btn"
                    onClick={() => setIsCreatingGroup(true)}
                  >
                    + {t('chat.group', 'Ստեղծել խումբ')}
                  </button>
                  <button
                    type="button"
                    className="pwa-chats-empty-secondary"
                    onClick={() => navigate('/friends')}
                  >
                    {t('nav.friends', 'Ընկերներ')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const unreadCount = Number(chat.unread_count || 0);
              const hasUnread = unreadCount > 0;
              const chatTitle = chat.type === 'group' ? chat.name : chat.participant_names;

              return (
                <button
                  type="button"
                  key={chat.id}
                  className={`chat-list-card ${hasUnread ? 'unread' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    navigate(`/chat/${chat.id}`);
                  }}
                >
                  <div
                    className={`chat-list-avatar ${chat.type === 'group' ? 'group' : ''}`}
                    style={chat.type !== 'group' && chat.avatar_gradient ? { background: chat.avatar_gradient } : undefined}
                  >
                    {renderAppAvatar(chat)}
                    {hasUnread && <span className="chat-list-dot" aria-hidden="true" />}
                  </div>
                  <div className="chat-list-main">
                    <div className="chat-list-topline">
                      <strong className={`chat-list-title ${hasUnread ? 'unread' : ''}`}>
                        {chatTitle}
                      </strong>
                      <div className="chat-list-meta">
                        {chat.last_message_at && (
                          <span className={`chat-list-time ${hasUnread ? 'unread' : ''}`}>
                            {formatChatDate(chat.last_message_at)}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="chat-list-count-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`chat-list-preview ${hasUnread ? 'unread' : ''}`}>
                      {renderAppPreview(chat)}
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="chat-list-chevron" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
