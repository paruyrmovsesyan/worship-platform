import React, { useState, useEffect, useRef } from 'react';
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

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);

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
      const offsetTop = viewport ? viewport.offsetTop : 0;

      root.style.setProperty('--chat-vh', `${Math.round(height)}px`);
      root.style.setProperty('--chat-vv-top', `${Math.round(offsetTop)}px`);
    };

    applyChatViewport();
    window.visualViewport?.addEventListener('resize', applyChatViewport);
    window.visualViewport?.addEventListener('scroll', applyChatViewport);
    window.addEventListener('resize', applyChatViewport);
    window.addEventListener('orientationchange', applyChatViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', applyChatViewport);
      window.visualViewport?.removeEventListener('scroll', applyChatViewport);
      window.removeEventListener('resize', applyChatViewport);
      window.removeEventListener('orientationchange', applyChatViewport);
      root.style.removeProperty('--chat-vh');
      root.style.removeProperty('--chat-vv-top');
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
  const canShowSeenState = (chatInfo?.type === 'direct' || !chatInfo?.type) && otherLastReadMessageId >= 0;

  return (
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
            <h2 className="chat-header-name">{chatInfo ? (chatInfo.display_name || t('chat.friendFallback')) : t('chat.chatFallback')}</h2>
            {renderStatus()}
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
                // Fix Safari invalid date parsing by replacing space with T or dashes with slashes
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

              const isMe = String(m.user_id) === String(user.id);
              const isLastOwnMessage = isMe && lastOwnMessageId !== null && String(m.id) === lastOwnMessageId;
              const isSeen = isLastOwnMessage && !String(m.id).startsWith('temp-') && otherLastReadMessageId >= Number(m.id);
              
              return (
                <React.Fragment key={m.id || index}>
                  {showDateSeparator && (
                    <div className="chat-date-separator">
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <div className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
                    <div className="chat-message-stack">
                      <div className="chat-bubble">
                        {!isMe && chatInfo?.type === 'group' && <div className="chat-sender-name">{m.user_name}</div>}
                        <div className="chat-text">{m.message}</div>
                        <div className="chat-meta-row">
                          <div className="chat-time">{new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      {canShowSeenState && isLastOwnMessage && (
                        <div className={`chat-seen-state ${isSeen ? 'seen' : ''}`}>
                          {isSeen ? t('chat.seen') : t('chat.sent')}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="chat-input-area">
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
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 250);
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

    </div>
  );
}
