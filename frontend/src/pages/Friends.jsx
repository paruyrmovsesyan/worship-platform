import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Friends.css';

export default function Friends() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
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

  const removeFriend = async (userId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await fetch('/friends_api.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      fetchFriends();
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

  const pendingRequests = friends.filter(f => f.status === 'pending' && f.requester_id !== user.id);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="page-header">
        <h1 className="page-title">{t('nav.friends', 'Ընկերներ / Չաթ')}</h1>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <input 
          type="text" 
          className="form-control" 
          placeholder="Որոնել ընկերներ անունով կամ էլ. փոստով..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {searchResults.length > 0 && (
          <div className="search-results" style={{ marginTop: '16px' }}>
            {searchResults.map(u => (
              <div key={u.id} className="friend-row">
                <div className="friend-info">
                  <strong>{u.name}</strong>
                  <span className="dim" style={{ fontSize: '0.85rem' }}>{u.email}</span>
                </div>
                <div className="friend-actions">
                  {u.friend_status === 'accepted' ? (
                    <button className="btn btn-secondary btn-small" onClick={() => openChat(u.id)}>Chat</button>
                  ) : u.friend_status === 'pending' ? (
                    u.is_requester ? (
                      <button className="btn btn-primary btn-small" onClick={() => acceptFriend(u.id)}>Ընդունել</button>
                    ) : (
                      <span className="dim">Հարցումն ուղարկված է</span>
                    )
                  ) : (
                    <button className="btn btn-primary btn-small" onClick={() => addFriend(u.id)}>+ Ավելացնել</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3>Նոր հարցումներ ({pendingRequests.length})</h3>
          <div className="friends-grid">
            {pendingRequests.map(f => (
              <div key={f.friend_id} className="glass-panel friend-card">
                <h4>{f.name}</h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-primary btn-small" onClick={() => acceptFriend(f.friend_id)}>Ընդունել</button>
                  <button className="btn btn-secondary btn-small" onClick={() => removeFriend(f.friend_id)}>Մերժել</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3>Իմ ընկերները ({acceptedFriends.length})</h3>
        {acceptedFriends.length === 0 ? (
          <p className="dim">Դուք դեռ ընկերներ չունեք: Օգտագործեք վերևի որոնման դաշտը ընկերներ գտնելու համար:</p>
        ) : (
          <div className="friends-grid">
            {acceptedFriends.map(f => (
              <div key={f.friend_id} className="glass-panel friend-card">
                <h4>{f.name}</h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-primary btn-small" onClick={() => openChat(f.friend_id)}>Չաթ</button>
                  <button className="btn btn-secondary btn-small" onClick={() => removeFriend(f.friend_id)}>Հեռացնել</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
