import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import ChatsList from './ChatsList';
import './Friends.css';

export default function Friends() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'friends', 'requests'
  const searchInputRef = useRef(null);
  
  usePageReady(loading || authLoading);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login?next=/friends');
      return;
    }
    if (user) {
      fetchFriends();
    }
  }, [user, authLoading, navigate]);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/friends_api.php?action=list');
      const data = await res.json();
      if (data.ok) {
        setFriends(data.friends || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/friends_api.php?action=search_users&q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.ok) {
          setSearchResults(data.users || []);
        }
      } catch (e) {
        console.error(e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addFriend = async (userId) => {
    try {
      await fetch('/friends_api.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      fetchFriends();
      if (searchQuery.length >= 2) {
        setSearchQuery(searchQuery + ' ');
        setTimeout(() => setSearchQuery(searchQuery.trim()), 100);
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
    } catch (e) {
      console.error(e);
    }
  };

  const removeFriend = async (userId, isCancel = false) => {
    if (!isCancel && !window.confirm(t('friends.confirmRemove'))) return;
    try {
      await fetch('/friends_api.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      fetchFriends();
      if (searchQuery.length >= 2) {
        setSearchQuery(searchQuery + ' ');
        setTimeout(() => setSearchQuery(searchQuery.trim()), 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openChat = async (userId) => {
    try {
      const res = await fetch('/chat_api.php?action=get_direct_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      if (data.ok && data.chat_id) {
        navigate(`/chat/${data.chat_id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || authLoading) return null;

  const incomingRequests = friends.filter(f => f.status === 'pending' && Number(f.requester_id) !== Number(user.id));
  const outgoingRequests = friends.filter(f => f.status === 'pending' && Number(f.requester_id) === Number(user.id));
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const chatCount = acceptedFriends.length + incomingRequests.length + outgoingRequests.length;
  const totalRequests = incomingRequests.length + outgoingRequests.length;
  const isSearching = searchQuery.trim().length > 0;

  const getInitials = (name, fallback = '?') => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  };

  const renderFriendRow = (friend, actions, variant = 'default') => (
    <div key={`${variant}-${friend.friend_id}`} className={`friend-list-row ${variant === 'request' ? 'request-row' : ''}`}>
      <div className="friend-avatar" aria-hidden="true">
        {getInitials(friend.name, 'U')}
      </div>
      <div className="friend-main">
        <strong>{friend.name}</strong>
        <span>{friend.email}</span>
      </div>
      <div className="friend-row-actions">
        {actions}
      </div>
    </div>
  );

  return (
    <div className="page-container animate-fade-in friends-page">
      <div className="page-header friends-page-header">
        <div className="friends-title-row">
          <h1 className="page-title">{t('nav.friends', 'Ընկերներ')}</h1>
          <div className="friends-header-actions">
            <button
              type="button"
              className={`friends-icon-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
              aria-label={t('friends.tabs.requests')}
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 11a4 4 0 1 0-8 0"></path>
                <path d="M3 21a7 7 0 0 1 14 0"></path>
                <path d="M19 8v6"></path>
                <path d="M22 11h-6"></path>
              </svg>
              {totalRequests > 0 && <span className="friends-icon-badge">{totalRequests > 9 ? '9+' : totalRequests}</span>}
            </button>
            <button
              type="button"
              className="friends-icon-btn"
              onClick={() => searchInputRef.current?.focus()}
              aria-label={t('friends.tabs.add')}
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
              </svg>
            </button>
          </div>
        </div>
        <div className={`friends-search-pill ${isSearching ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('friends.searchPlaceholder')}
            autoComplete="off"
          />
          {isSearching && (
            <button type="button" className="friends-search-clear" onClick={() => setSearchQuery('')} aria-label={t('friends.cancel')}>
              ×
            </button>
          )}
        </div>
        {incomingRequests.length > 0 && activeTab !== 'requests' && !isSearching && (
          <button type="button" className="friends-request-banner" onClick={() => setActiveTab('requests')}>
            <span>{t('friends.incomingTitle')}</span>
            <strong>{incomingRequests.length}</strong>
          </button>
        )}
        {acceptedFriends.length > 0 && !isSearching && (
          <div className="friends-avatar-strip" aria-label={t('friends.tabs.myFriends')}>
            {acceptedFriends.slice(0, 12).map(friend => (
              <button type="button" key={friend.friend_id} className="friends-avatar-chip" onClick={() => openChat(friend.friend_id)}>
                <span className="friend-avatar" aria-hidden="true">{getInitials(friend.name, 'U')}</span>
                <small>{friend.name}</small>
              </button>
            ))}
          </div>
        )}
        <div className="friends-summary">
          <div className="friends-summary-card active">
            <span>{t('friends.tabs.chats')}</span>
            <strong>{chatCount}</strong>
          </div>
          <div className="friends-summary-card">
            <span>{t('friends.tabs.myFriends')}</span>
            <strong>{acceptedFriends.length}</strong>
          </div>
          <div className="friends-summary-card accent">
            <span>{t('friends.tabs.requests')}</span>
            <strong>{incomingRequests.length}</strong>
          </div>
        </div>
      </div>

      {!isSearching && (
      <div className="friends-view-switcher" role="tablist" aria-label={t('nav.friends', 'Ընկերներ')}>
        <button 
          className={`friends-view-btn ${activeTab === 'chats' ? 'active' : ''}`} 
          onClick={() => setActiveTab('chats')}
        >
          <span>{t('friends.tabs.chats')}</span>
          <strong>{chatCount}</strong>
        </button>
        <button 
          className={`friends-view-btn ${activeTab === 'friends' ? 'active' : ''}`} 
          onClick={() => setActiveTab('friends')}
        >
          <span>{t('friends.tabs.myFriends')}</span>
          <strong>{acceptedFriends.length}</strong>
        </button>
      </div>
      )}

      <div className="friends-tab-content friends-shell-panel">
        {activeTab === 'requests' && !isSearching && (
          <button type="button" className="friends-inline-back" onClick={() => setActiveTab('chats')}>
            {t('friends.tabs.chats')}
          </button>
        )}

        {isSearching && (
          <div className="friends-panel friends-search-panel">
            {searchQuery.trim().length < 2 ? (
              <p className="friends-search-empty">{t('friends.findDesc')}</p>
            ) : searchResults.length > 0 ? (
              <div className="friend-list search-results">
                {searchResults.map(u => (
                  <div key={u.id} className="friend-list-row search-row">
                    <div className="friend-avatar" aria-hidden="true">
                      {getInitials(u.name, 'U')}
                    </div>
                    <div className="friend-main">
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                    </div>
                    <div className="friend-row-actions">
                      {u.friend_status === 'accepted' ? (
                        <button className="btn btn-secondary btn-small" onClick={() => openChat(u.id)}>{t('friends.alreadyFriends')}</button>
                      ) : u.friend_status === 'pending' ? (
                        u.is_requester ? (
                          <button className="btn btn-secondary btn-small" onClick={() => removeFriend(u.id, true)}>{t('friends.cancelRequest')}</button>
                        ) : (
                          <button className="btn btn-primary btn-small" onClick={() => acceptFriend(u.id)}>{t('friends.acceptRequest')}</button>
                        )
                      ) : (
                        <button className="btn btn-primary btn-small" onClick={() => addFriend(u.id)}>{t('friends.addFriend')}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="friends-search-empty">{t('friends.searchEmpty').replace('{{query}}', searchQuery)}</p>
            )}
          </div>
        )}

        {/* TAB: CHATS */}
        {!isSearching && activeTab === 'chats' && (
          <ChatsList isEmbedded={true} />
        )}

        {/* TAB: FRIENDS */}
        {!isSearching && activeTab === 'friends' && (
          <div className="friends-panel">
            {acceptedFriends.length === 0 ? (
              <div className="empty-state friends-empty-card">
                <span className="icon">🤝</span>
                <p>{t('friends.emptyFriends')}</p>
              </div>
            ) : (
              <div className="friend-list">
                {acceptedFriends.map(f => renderFriendRow(
                  f,
                  <>
                    <button className="btn btn-primary btn-small" onClick={() => openChat(f.friend_id)}>{t('friends.chat')}</button>
                    <button className="btn btn-secondary btn-small" onClick={() => removeFriend(f.friend_id)}>{t('friends.remove')}</button>
                  </>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: REQUESTS */}
        {!isSearching && activeTab === 'requests' && (
          <div className="friends-request-layout">
            <div className="friends-panel">
              <h3 className="friends-section-title">
                {t('friends.incomingTitle')} ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <p className="friends-muted-message">{t('friends.noIncoming')}</p>
              ) : (
                <div className="friend-list request-list">
                  {incomingRequests.map(f => renderFriendRow(
                    f,
                    <>
                      <button className="btn btn-primary btn-small" onClick={() => acceptFriend(f.friend_id)}>{t('friends.accept')}</button>
                      <button className="btn btn-secondary btn-small" onClick={() => removeFriend(f.friend_id, true)}>{t('friends.reject')}</button>
                    </>,
                    'request'
                  ))}
                </div>
              )}
            </div>

            <div className="friends-panel">
              <h3 className="friends-section-title">
                {t('friends.outgoingTitle')} ({outgoingRequests.length})
              </h3>
              {outgoingRequests.length === 0 ? (
                <p className="friends-muted-message">{t('friends.noOutgoing')}</p>
              ) : (
                <div className="friend-list request-list">
                  {outgoingRequests.map(f => renderFriendRow(
                    f,
                    <button className="btn btn-secondary btn-small" onClick={() => removeFriend(f.friend_id, true)}>{t('friends.cancel')}</button>,
                    'request'
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
