import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';

export default function ChatsList({ isEmbedded = false }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

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

  const containerProps = isEmbedded ? { className: "embedded-chats" } : { className: "page-container animate-fade-in", style: { padding: '24px 16px', paddingBottom: '100px' } };
  const getChatAvatar = (chat) => {
    const label = chat.type === 'group' ? '👥' : (chat.participant_names ? chat.participant_names.charAt(0).toUpperCase() : '👤');
    return label;
  };

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
          {chats.length === 0 ? (
            <div className="empty-state glass-panel">
              <p className="dim">{t('chat.emptySubtitle')}</p>
            </div>
          ) : (
            chats.map(chat => {
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
                      {chat.last_message
                        ? (chat.last_message.match(/^\[SONG\|id:\d+\|key:[+-]?\d+\|capo:\d+\|title:([^\]]*)/) 
                            ? `🎵 ${chat.last_message.match(/^\[SONG\|id:\d+\|key:[+-]?\d+\|capo:\d+\|title:([^\]]*)/)[1].replace(/\.\.\.$/, '')}...` 
                            : chat.last_message)
                        : chat.type === 'group'
                          ? '✉️ ' + t('chat.emptyTitle', 'Սկսեք զրույցը')
                          : t('chat.emptySubtitle', 'Գրեք առաջին հաղորդագրությունը...')}
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
