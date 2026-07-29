import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Chat.css';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isClosingGroupInfo, setIsClosingGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupFriends, setGroupFriends] = useState([]);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const groupPanelRef = useRef(null);
  const groupOverlayRef = useRef(null);
  const dragStartY = useRef(null);
  const dragCurrentY = useRef(0);

  const getLastOwnMessageId = () => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (String(message.user_id) === String(user?.id) && !String(message.id).startsWith('temp-')) {
        return String(message.id);
      }
    }
    return null;
  };

  usePageReady(loading || authLoading);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const closeGroupInfo = () => {
    setIsClosingGroupInfo(true);
    setEditingGroupName(false);
    setTimeout(() => {
      setShowGroupInfo(false);
      setIsClosingGroupInfo(false);
    }, 250); // Matches animation duration
  };

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (!groupPanelRef.current || !groupPanelRef.current.contains(e.target)) return;

      // Allow dragging if we touched the header directly
      const isHeader = e.target.closest('.group-info-header-drag');
      // Or if we touched the scrollable area, but it's at the very top
      const scrollArea = e.target.closest('.group-info-scroll');
      
      if (isHeader || !scrollArea || (scrollArea && scrollArea.scrollTop <= 0)) {
         dragStartY.current = e.touches[0].clientY;
         dragCurrentY.current = 0;
         groupPanelRef.current.style.transition = 'none';
      }
    };

    const handleTouchMove = (e) => {
      if (dragStartY.current === null || !groupPanelRef.current) return;
      const y = e.touches[0].clientY;
      const deltaY = y - dragStartY.current;
      if (deltaY > 0) {
        dragCurrentY.current = deltaY;
        groupPanelRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (dragStartY.current === null || !groupPanelRef.current) return;
      if (dragCurrentY.current > 100) {
        // swipe to close
        closeGroupInfo();
      } else {
        // snap back
        groupPanelRef.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        groupPanelRef.current.style.transform = '';
      }
      dragStartY.current = null;
      dragCurrentY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = '0px';
    const nextHeight = Math.min(input.scrollHeight, 120);
    input.style.height = `${Math.max(nextHeight, 24)}px`;
  }, [inputText]);

  useEffect(() => {
    const root = document.documentElement;

    const applyChatViewport = () => {
      const viewport = window.visualViewport;
      const height = viewport ? viewport.height : window.innerHeight;

      root.style.setProperty('--chat-vh', `${Math.round(height)}px`);
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    applyChatViewport();
    window.visualViewport?.addEventListener('resize', applyChatViewport);
    window.visualViewport?.addEventListener('scroll', applyChatViewport);
    window.addEventListener('resize', applyChatViewport);
    window.addEventListener('orientationchange', applyChatViewport);
    window.addEventListener('scroll', applyChatViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', applyChatViewport);
      window.visualViewport?.removeEventListener('scroll', applyChatViewport);
      window.removeEventListener('resize', applyChatViewport);
      window.removeEventListener('orientationchange', applyChatViewport);
      window.removeEventListener('scroll', applyChatViewport);
      root.style.removeProperty('--chat-vh');
    };
  }, []);

  // Ultimate iOS Pull-to-refresh blocker
  useEffect(() => {
    document.body.classList.add('chat-active');
    document.documentElement.classList.add('chat-active');
    
    const blockTouchMove = (e) => {
      const container = document.querySelector('.chat-messages-container');
      
      if (!container || !container.contains(e.target)) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (e.touches && e.touches.length > 0) {
        const currentY = e.touches[0].clientY;
        const startY = parseFloat(container.getAttribute('data-start-y') || currentY);
        const isPullingDown = currentY > startY;
        
        if (container.scrollTop <= 0 && isPullingDown) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const recordStart = (e) => {
      const container = document.querySelector('.chat-messages-container');
      if (container && e.touches && e.touches.length > 0) {
        container.setAttribute('data-start-y', e.touches[0].clientY);
      }
    };

    document.addEventListener('touchstart', recordStart, { passive: true });
    document.addEventListener('touchmove', blockTouchMove, { passive: false });

    return () => {
      document.body.classList.remove('chat-active');
      document.documentElement.classList.remove('chat-active');
      document.removeEventListener('touchstart', recordStart);
      document.removeEventListener('touchmove', blockTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
      return;
    }
    if (user && id) {
      fetchInitialMessages();
    }
  }, [user, authLoading, id, navigate]);

  useEffect(() => {
    if (user && id && !loading) {
      pollNewMessages();
      const interval = setInterval(pollNewMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [user, id, loading]);

  const fetchInitialMessages = async () => {
    try {
      const res = await fetch(`/chat_api.php?action=get_messages&chat_id=${id}&t=${Date.now()}`);
      const data = await res.json();
      if (data.ok) {
        const initialMessages = data.messages || [];
        messagesRef.current = initialMessages;
        setMessages(initialMessages);
        if (data.chat_info) setChatInfo(data.chat_info);
        if (data.messages && data.messages.length < 50) setHasMore(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      } else if (data.error === 'Access denied') {
        alert(t('chat.deletedOrUnavailable'));
        navigate('/friends', { replace: true });
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const pollNewMessages = async () => {
    const currentMessages = messagesRef.current;
    const lastServerMessage = [...currentMessages]
      .reverse()
      .find(m => !String(m.id).startsWith('temp-'));
    const afterId = lastServerMessage ? lastServerMessage.id : null;

    try {
      const afterParam = afterId ? `&after_id=${encodeURIComponent(afterId)}` : '';
      const res = await fetch(`/chat_api.php?action=get_messages&chat_id=${id}${afterParam}&t=${Date.now()}`);
      const data = await res.json();
      if (data.ok) {
        if (data.chat_info) setChatInfo(data.chat_info);

        const newMessages = Array.isArray(data.messages) ? data.messages : [];
        if (newMessages.length === 0) return;
        
        const container = containerRef.current;
        const isNearBottom = container && (container.scrollHeight - container.scrollTop <= container.clientHeight + 100);
        
        setMessages(prev => {
          const validPrev = prev.filter(m => !String(m.id).startsWith('temp-'));
          const seenIds = new Set(validPrev.map(m => String(m.id)));
          const uniqueMessages = newMessages.filter(m => !seenIds.has(String(m.id)));
          const nextMessages = [...validPrev, ...uniqueMessages];
          messagesRef.current = nextMessages;
          return nextMessages;
        });
        
        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOlderMessages = async () => {
    if (isLoadingOlder || !hasMore || messages.length === 0) return;
    setIsLoadingOlder(true);
    
    const beforeId = messages[0].id;
    try {
      const res = await fetch(`/chat_api.php?action=get_messages&chat_id=${id}&before_id=${beforeId}&t=${Date.now()}`);
      const data = await res.json();
      if (data.ok && data.messages) {
        if (data.messages.length < 50) setHasMore(false);
        
        if (data.messages.length > 0) {
          const container = containerRef.current;
          const oldScrollHeight = container.scrollHeight;
          const oldScrollTop = container.scrollTop;
          
          setMessages(prev => {
            const nextMessages = [...data.messages, ...prev];
            messagesRef.current = nextMessages;
            return nextMessages;
          });
          
          setTimeout(() => {
            if (containerRef.current) {
              const newScrollHeight = containerRef.current.scrollHeight;
              containerRef.current.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
            }
          }, 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoadingOlder(false);
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop <= 150) {
      fetchOlderMessages();
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    const tempId = 'temp-' + Date.now();
    setInputText('');
    inputRef.current?.focus();
    
    const optimisticMsg = {
      id: tempId,
      user_id: user.id,
      user_name: user.name,
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => {
      const nextMessages = [...prev, optimisticMsg];
      messagesRef.current = nextMessages;
      return nextMessages;
    });
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, message: textToSend })
      });
      const data = await res.json();
      if (data.ok && data.id) {
        setMessages(prev => {
          const nextMessages = prev.map(m => (
            m.id === tempId
              ? {
                  ...m,
                  id: data.id,
                  user_name: data.user_name || m.user_name,
                  created_at: data.created_at || m.created_at
                }
              : m
          ));
          messagesRef.current = nextMessages;
          return nextMessages;
        });
      }
      pollNewMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const openGroupInfo = async () => {
    if (chatInfo?.type !== 'group') return;
    setShowGroupInfo(true);
    setGroupInfoLoading(true);
    try {
      const [membersRes, friendsRes] = await Promise.all([
        fetch(`/chat_api.php?action=get_group_members&chat_id=${id}`),
        fetch('/friends_api.php?action=list')
      ]);
      const membersData = await membersRes.json();
      const friendsData = await friendsRes.json();
      if (membersData.ok) setGroupMembers(membersData.members || []);
      if (friendsData.ok) {
        const memberIds = new Set((membersData.members || []).map(m => String(m.id)));
        setGroupFriends((friendsData.friends || []).filter(f => f.status === 'accepted' && !memberIds.has(String(f.friend_id))));
      }
    } catch (e) { console.error(e); }
    setGroupInfoLoading(false);
  };

  const addMember = async (friendId) => {
    try {
      const res = await fetch('/chat_api.php?action=add_group_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, user_id: friendId })
      });
      const data = await res.json();
      if (data.ok) openGroupInfo();
      else alert(data.error || 'Error');
    } catch (e) { alert('Network error'); }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Հեռացնե՞լ անդամին:')) return;
    try {
      const res = await fetch('/chat_api.php?action=remove_group_member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, user_id: memberId })
      });
      const data = await res.json();
      if (data.ok) openGroupInfo();
      else alert(data.error || 'Error');
    } catch (e) { alert('Network error'); }
  };

  const leaveGroup = async () => {
    if (!window.confirm('Դուրս գա՞լ խմբից:')) return;
    try {
      const res = await fetch('/chat_api.php?action=leave_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id })
      });
      const data = await res.json();
      if (data.ok) navigate('/friends', { replace: true });
      else alert(data.error || 'Error');
    } catch (e) { alert('Network error'); }
  };

  const renameGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/chat_api.php?action=rename_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, name: newGroupName.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        setChatInfo(prev => ({ ...prev, display_name: newGroupName.trim(), name: newGroupName.trim() }));
        setEditingGroupName(false);
        openGroupInfo();
      } else alert(data.error || 'Error');
    } catch (e) { alert('Network error'); }
  };

  const handleDelete = async (forEveryone) => {
    try {
      await fetch('/chat_api.php?action=delete_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, for_everyone: forEveryone })
      });
      navigate('/friends', { replace: true });
    } catch (e) {
      console.error(e);
    }
  };

  const renderStatus = () => {
    if (!chatInfo) return null;
    if (chatInfo.type === 'group') return <span className="chat-header-status-text">{t('chat.group')}</span>;
    
    if (chatInfo.seconds_since_active === null || chatInfo.seconds_since_active === undefined) {
      return <span className="chat-header-status-text">{t('chat.offline')}</span>;
    }
    const isOnline = chatInfo.seconds_since_active < 90;
    if (isOnline) {
      return <span className="chat-header-status-text online">{t('chat.online')}</span>;
    }
    
    const lastActive = new Date(chatInfo.last_active_at.replace(' ', 'T'));
    const now = new Date();
    const isToday = lastActive.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = lastActive.toDateString() === yesterday.toDateString();
    
    const timeStr = lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const months = t('chat.monthsGenitive');
    const monthName = Array.isArray(months) ? months[lastActive.getMonth()] : lastActive.getMonth();
    const day = lastActive.getDate();
    let textStr = language === 'en' ? `${monthName} ${day} ${timeStr}` : `${day} ${monthName} ${timeStr}`;
    if (isToday) textStr = `${t('chat.today')} ${timeStr}`;
    else if (isYesterday) textStr = `${t('chat.yesterday')} ${timeStr}`;
    
    return <span className="chat-header-status-text">{t('chat.lastSeen')} {textStr}</span>;
  };
  if (loading || authLoading) return null;

  const lastOwnMessageId = getLastOwnMessageId();
  const otherLastReadMessageId = Number(chatInfo?.other_last_read_message_id || 0);
  const canShowSeenState = (chatInfo?.type === 'direct' || !chatInfo?.type);

  const chatNode = (
    <div className="chat-page-container">
      {/* HEADER */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="chat-btn-back" onClick={() => navigate('/friends')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="chat-header-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="chat-header-info">
            {chatInfo?.type === 'group' ? (
              <>
                <h2
                  className="chat-header-name"
                  style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}
                  onClick={openGroupInfo}
                >
                  {chatInfo.display_name || chatInfo.name || t('chat.chatFallback')}
                </h2>
                <span className="chat-header-status-text" style={{ cursor: 'pointer' }} onClick={openGroupInfo}>
                  {groupMembers.length > 0 ? `${groupMembers.length} անդամ` : t('chat.group')}
                </span>
              </>
            ) : (
              <>
                <h2 className="chat-header-name">{chatInfo ? (chatInfo.display_name || t('chat.friendFallback')) : t('chat.chatFallback')}</h2>
                {renderStatus()}
              </>
            )}
          </div>
        </div>
        <button className="chat-btn-icon" onClick={() => setShowDeleteModal(true)} title={t('chat.deleteTooltip')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      {/* MESSAGES */}
      <div className="chat-messages-container" ref={containerRef} onScroll={handleScroll}>
        {isLoadingOlder && (
          <div style={{ textAlign: 'center', padding: '10px 0', color: 'rgba(255,255,255,0.5)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rotating-icon" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <div>{t('chat.loadingOlder')}</div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h3 className="chat-empty-title">{t('chat.emptyTitle')}</h3>
            <p className="chat-empty-subtitle">{t('chat.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((m, index) => {
              const prevM = index > 0 ? messages[index - 1] : null;
              
              let showDateSeparator = false;
              let dateStr = '';
              
              if (m.created_at) {
                const safeDateStr = m.created_at.replace(' ', 'T');
                const dateObj = new Date(safeDateStr);
                
                let prevDateObj = null;
                if (prevM?.created_at) {
                  prevDateObj = new Date(prevM.created_at.replace(' ', 'T'));
                }
                
                if (!prevDateObj || 
                    dateObj.getFullYear() !== prevDateObj.getFullYear() || 
                    dateObj.getMonth() !== prevDateObj.getMonth() || 
                    dateObj.getDate() !== prevDateObj.getDate()) {
                  showDateSeparator = true;
                  
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  if (dateObj.toDateString() === today.toDateString()) {
                    dateStr = t('chat.today', 'Այսօր');
                  } else if (dateObj.toDateString() === yesterday.toDateString()) {
                    dateStr = t('chat.yesterday', 'Երեկ');
                  } else {
                    const months = t('chat.monthsGenitive');
                    const monthName = Array.isArray(months) ? months[dateObj.getMonth()] : dateObj.getMonth();
                    const day = dateObj.getDate();
                    const year = dateObj.getFullYear();
                    
                    if (year !== today.getFullYear()) {
                      dateStr = language === 'en' ? `${monthName} ${day}, ${year}` : `${day} ${monthName} ${year}`;
                    } else {
                      dateStr = language === 'en' ? `${monthName} ${day}` : `${day} ${monthName}`;
                    }
                  }
                }
              }

              const isOwn = String(m.user_id) === String(user?.id);
              const isLastOwn = canShowSeenState && String(m.id) === String(lastOwnMessageId);
              const isGroup = chatInfo?.type === 'group';

              return (
                <React.Fragment key={m.id || index}>
                  {showDateSeparator && (
                    <div className="chat-date-separator">
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <div className={`chat-message-row ${isOwn ? 'me' : 'other'}`}>
                    <div className="chat-message-stack">
                      <div className="chat-bubble">
                        {isGroup && !isOwn && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', marginBottom: '2px' }}>
                            {m.user_name || 'Անհայտ'}
                          </div>
                        )}
                        {m.message && <div className="chat-text">{m.message}</div>}
                        {m.setlist_id > 0 && (
                          <div 
                            className="chat-setlist-attachment" 
                            onClick={async () => {
                              if (window.confirm(t('chat.importSetlistPrompt', 'Ցանկանու՞մ եք պատճենել այս երգացանկը ձեր հաշվում:'))) {
                                try {
                                  const res = await fetch('/chat_api.php?action=import_shared_setlist', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ setlist_id: m.setlist_id })
                                  });
                                  const data = await res.json();
                                  if (data.ok && data.new_id) {
                                    navigate(`/setlists/${data.new_id}`);
                                  } else {
                                    alert(data.error || 'Failed to import');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              background: 'rgba(0,0,0,0.15)', padding: '10px 12px',
                              borderRadius: '10px', marginTop: m.message ? '6px' : '0',
                              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>📋</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0f0f6' }}>{t('chat.sharedSetlist', 'Կիսվել է երգացանկով')}</span>
                              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 500, marginTop: '2px' }}>{t('chat.openSetlist', 'Բացել երգացանկը')}</span>
                            </div>
                          </div>
                        )}
                        <div className="chat-time">
                          {m.created_at ? new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                      {isLastOwn && (
                        <div className="chat-seen-state">
                          {otherLastReadMessageId >= Number(m.id) ? (
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{t('chat.seen', 'Կարդացված է')}</span>
                          ) : (
                            <span>{t('chat.sent', 'Ուղարկված է')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className={`chat-input-area ${showGroupInfo ? 'hidden' : ''}`}>
        <div className="chat-input-form" role="group" aria-label={t('chat.placeholder')}>
          <textarea
            ref={inputRef}
            className="chat-input-field"
            placeholder={t('chat.placeholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onFocus={() => {
              window.scrollTo(0, 0);
              setTimeout(() => {
                window.scrollTo(0, 0);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 200);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="send"
            rows={1}
          />
          <button type="button" className="chat-send-btn" disabled={!inputText.trim()} onClick={sendMessage}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px) translateY(1px)' }}>
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="chat-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="chat-modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="chat-modal-title">{t('chat.deleteTitle')}</h3>
            <p className="chat-modal-text">{t('chat.deletePrompt')}</p>
            <button className="chat-modal-btn danger" onClick={() => handleDelete(false)}>{t('chat.deleteMine')}</button>
            <button className="chat-modal-btn danger" onClick={() => handleDelete(true)}>{t('chat.deleteEveryone')}</button>
            <button className="chat-modal-btn cancel" onClick={() => setShowDeleteModal(false)}>{t('chat.cancel')}</button>
          </div>
        </div>
      )}

      {/* GROUP INFO PANEL */}
      {showGroupInfo && (
        <div ref={groupOverlayRef} className={`group-info-overlay ${isClosingGroupInfo ? 'closing' : ''}`} style={{
          position: 'fixed', top: 0, left: 0, right: 0, 
          height: 'var(--chat-vh, 100dvh)',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end',
        }} onClick={closeGroupInfo}>
          <div ref={groupPanelRef} className="group-info-panel" style={{
            background: 'linear-gradient(180deg, #1a1f3a 0%, #16213e 100%)',
            width: '100%',
            borderRadius: '24px 24px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div className="group-info-header-drag" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', width: '100%' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header / Group Name */}
            <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {editingGroupName ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '8px' }}>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: '#fff', padding: '6px 12px', fontSize: '0.95rem' }}
                    autoFocus
                  />
                  <button onClick={saveGroupName} style={{ background: '#38bdf8', border: 'none', borderRadius: '10px', color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
                    Պահպանել
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
                    {chatInfo?.display_name || chatInfo?.name || t('chat.group')}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    {groupMembers.length} անդամ
                  </span>
                </div>
              )}

              {!editingGroupName && String(chatInfo?.created_by) === String(user?.id) && (
                <button onClick={() => { setEditingGroupName(true); setNewGroupName(chatInfo?.display_name || chatInfo?.name || ''); }} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem' }}>
                  ✏️ Խմբագրել
                </button>
              )}
            </div>

            {/* Members List Scroll */}
            <div className="group-info-scroll" style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
              {groupInfoLoading ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>Բեռնվում է...</div>
              ) : (<>
                {/* Current Members */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Անդամներ
                  </div>
                  {groupMembers.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                          {(member.name || member.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                            {member.name || member.email} {String(member.id) === String(user?.id) ? '(Դուք)' : ''}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            {member.role === 'admin' ? '👑 Ադմինիստրատոր' : 'Անդամ'}
                          </div>
                        </div>
                      </div>

                      {/* Remove Member button (Admin only, cannot remove self) */}
                      {String(chatInfo?.created_by) === String(user?.id) && String(member.id) !== String(user?.id) && (
                        <button onClick={() => removeGroupMember(member.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          Հեռացնել
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Friends Section (Admin only) */}
                {String(chatInfo?.created_by) === String(user?.id) && groupFriends.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Ավելացնել ընկերների
                    </div>
                    {groupFriends.map(friend => (
                      <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                            {(friend.name || friend.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.95rem' }}>
                            {friend.name || friend.email}
                          </span>
                        </div>
                        <button onClick={() => addGroupMember(friend.id)} style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', borderRadius: '8px', padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                          + Ավելացնել
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Danger zone actions */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Leave group — non-creator only */}
                  {String(chatInfo?.created_by) !== String(user?.id) && (
                    <button onClick={leaveGroup} style={{
                      width: '100%', padding: '12px', borderRadius: '14px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                    }}>
                      🚪 Դուրս գալ խմբից
                    </button>
                  )}

                  {/* Delete group — creator only */}
                  {String(chatInfo?.created_by) === String(user?.id) && (
                    <button onClick={() => { closeGroupInfo(); setShowDeleteModal(true); }} style={{
                      width: '100%', padding: '12px', borderRadius: '14px',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#f87171', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                    }}>
                      🗑️ Ջնջել խումբը
                    </button>
                  )}
                </div>

              </>)}
            </div>

          </div>
        </div>
      )}

    </div>
  );

  const isMobile = window.innerWidth <= 900 || document.body.classList.contains('mobile-theme');
  if (isMobile) {
    return createPortal(chatNode, document.body);
  }

  return chatNode;
}
