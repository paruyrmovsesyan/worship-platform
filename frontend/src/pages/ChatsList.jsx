import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useIsPWA } from '../hooks/useIsPWA';
import { usePageReady } from '../hooks/usePageReady';
import './ChatsList.css';

export default function ChatsList({ isEmbedded = false }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isPWA = useIsPWA();

  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
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

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchChats();
      fetchFriends();
      const interval = setInterval(fetchChats, 5000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    const timer = setTimeout(async () => {
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
    try {
      await fetch('/friends_api.php?action=accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
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

  const fetchChats = async () => {
    try {
      const res = await fetch('/chat_api.php?action=list_chats');
      const data = await res.json();
      if (data.ok) setChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch('/friends_api.php?action=list');
      const data = await res.json();
      if (data.ok) {
        setFriends((data.friends || []).filter(friend => friend.status === 'accepted'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startDirectChatWithFriend = async (friendId) => {
    try {
      const res = await fetch('/chat_api.php?action=get_direct_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: friendId })
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

  if (loading || authLoading) return null;

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
                    <div className="friend-strip-avatar">
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
              onChange={e => setSearchQuery(e.target.value)}
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
                  <div className={`website-chat-avatar ${chat.type === 'group' ? 'group' : ''}`}>
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
  // PWA & EMBEDDED MODE DISPLAY (100% UNTOUCHED ORIGINAL LAYOUT)
  // ════════════════════════════════════════════════════════════════
  const containerProps = isEmbedded ? { className: "embedded-chats" } : { className: "page-container animate-fade-in", style: { padding: '24px 16px', paddingBottom: '100px' } };

  return (
    <div {...containerProps}>
      {!isEmbedded && (
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title" style={{ margin: 0 }}>{t('friends.tabs.chats')}</h1>
          {!isCreatingGroup && (
            <button className="btn btn-primary btn-small" onClick={() => setIsCreatingGroup(true)}>
              + {t('chat.group')}
            </button>
          )}
        </div>
      )}
      
      {isEmbedded && !isCreatingGroup && (
        <div className="embedded-chats-toolbar">
          <button className="btn btn-primary btn-small" onClick={() => setIsCreatingGroup(true)}>
            + {t('chat.group')}
          </button>
        </div>
      )}

      {!isEmbedded && !isCreatingGroup && onlineFriends.length > 0 && (
        <div className="pwa-active-friends-strip">
          <div className="pwa-active-friends-title">
            <span className="pwa-active-friends-dot" />
            <span>{t('friends.activeFriends', 'Ակտիվ Ընկերներ')} ({onlineFriends.length})</span>
          </div>
          <div className="pwa-active-friends-row">
            {onlineFriends.map(f => (
              <div key={f.friend_id} className="pwa-active-friend-item" onClick={() => startDirectChatWithFriend(f.friend_id)}>
                <div className="pwa-active-friend-avatar">
                  {(f.name || 'U').charAt(0).toUpperCase()}
                  <span className="pwa-active-friend-badge" />
                </div>
                <span className="pwa-active-friend-name">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isCreatingGroup && (
        <div className="pwa-chats-search-bar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={t('chats.searchPlaceholder', 'Փնտրել զրույցներ, թիմեր, օգտատերեր...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="pwa-chats-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* PWA User Search Results (Add Friend / Chat) */}
      {!isCreatingGroup && searchQuery.trim().length >= 2 && (
        <div className="pwa-user-search-results">
          <div className="pwa-user-search-header">
            <span>👥 {t('friends.findTitle', 'Գտնել & Ավելացնել Ընկերներ')}</span>
          </div>

          {searchingUsers ? (
            <div className="pwa-user-search-loading">{t('common.searching', 'Որոնվում է...')}</div>
          ) : searchResults.length === 0 ? (
            <div className="pwa-user-search-empty">{t('friends.noUsersFound', 'Օգտատերեր չեն գտնվել')}</div>
          ) : (
            <div className="pwa-user-search-list">
              {searchResults.map(u => {
                const isAccepted = u.friend_status === 'accepted';
                const isPendingSent = (u.friend_status === 'pending_sent' || (u.friend_status === 'pending' && Boolean(u.is_requester)));
                const isPendingReceived = (u.friend_status === 'pending_received' || (u.friend_status === 'pending' && !u.is_requester));

                return (
                  <div key={u.id} className="pwa-user-search-card">
                    <div className="pwa-user-search-avatar">
                      {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="pwa-user-search-info">
                      <strong>{u.name || u.username}</strong>
                      <small>{u.email || u.username}</small>
                    </div>
                    <div className="pwa-user-search-action">
                      {isAccepted ? (
                        <button
                          className="btn-pwa-user-action chat"
                          onClick={() => startDirectChatWithFriend(u.id)}
                        >
                          💬 {t('friends.tabs.chats', 'Չաթ')}
                        </button>
                      ) : isPendingSent ? (
                        <span className="pwa-user-status-badge pending">
                          ⏳ {t('friends.requestSent', 'Հարցված')}
                        </span>
                      ) : isPendingReceived ? (
                        <button
                          className="btn-pwa-user-action accept"
                          onClick={() => acceptFriend(u.id)}
                        >
                          ✅ {t('friends.accept', 'Ընդունել')}
                        </button>
                      ) : (
                        <button
                          className="btn-pwa-user-action add"
                          onClick={() => addFriend(u.id)}
                        >
                          ➕ {t('friends.add', 'Ավելացնել')}
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
          <h3>{t('chat.group')}</h3>
          <input 
            type="text" 
            className="form-control" 
            placeholder={`${t('chat.group')}...`} 
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            style={{ marginBottom: '16px' }}
          />
          <p className="chat-group-builder-copy">{t('friends.findDesc')}</p>
          <div className="chat-group-builder-list">
            {friends.length === 0 && <span className="dim">{t('friends.emptyFriends')}</span>}
            {friends.map(f => (
              <label key={f.friend_id} className="chat-group-builder-option">
                <input 
                  type="checkbox" 
                  checked={selectedFriends.includes(f.friend_id)}
                  onChange={() => toggleFriendSelection(f.friend_id)}
                />
                {f.name}
              </label>
            ))}
          </div>
          <div className="chat-group-builder-actions">
            <button className="btn btn-secondary" onClick={() => setIsCreatingGroup(false)}>{t('friends.cancel')}</button>
            <button className="btn btn-primary" onClick={createGroup} disabled={!groupName.trim() || selectedFriends.length === 0}>{t('chat.group')}</button>
          </div>
        </div>
      ) : (
        <div className="chat-list-items">
          {filteredChats.length === 0 ? (
            <div className="empty-state glass-panel">
              <p className="dim">{searchQuery ? `«${searchQuery}» որոնմամբ զրույց չի գտնվել` : t('chat.emptySubtitle')}</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const unreadCount = Number(chat.unread_count || 0);
              const hasUnread = unreadCount > 0;
              const chatTitle = chat.type === 'group' ? chat.name : chat.participant_names;

              return (
                <div 
                  key={chat.id} 
                  className={`glass-panel chat-list-card ${hasUnread ? 'unread' : ''}`}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  <div className={`chat-list-avatar ${chat.type === 'group' ? 'group' : ''}`}>
                    {getChatAvatar(chat)}
                    {hasUnread && <span className="chat-list-dot" aria-hidden="true"></span>}
                  </div>
                  <div className="chat-list-main">
                    <div className="chat-list-topline">
                      <strong className={`chat-list-title ${hasUnread ? 'unread' : ''}`}>
                        {chatTitle}
                      </strong>
                      <div className="chat-list-meta">
                        {chat.last_message_at && (
                          <span className={`chat-list-time ${hasUnread ? 'unread' : 'dim'}`}>
                            {formatChatDate(chat.last_message_at)}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="chat-list-count-badge">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`chat-list-preview ${hasUnread ? 'unread' : 'dim'}`}>
                      {getPreviewText(chat)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
