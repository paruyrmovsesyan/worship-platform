import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';
import './Chat.css';

export default function Chat() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  usePageReady(loading || authLoading);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/login');
      return;
    }
    if (user && id) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, id, navigate]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/chat_api.php?action=get_messages&chat_id=${id}`);
      const data = await res.json();
      if (data.ok) {
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    try {
      await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, message: inputText })
      });
      setInputText('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || authLoading) return null;

  return (
    <div className="chat-page-container animate-fade-in">
      <div className="chat-header">
        <button className="btn-back" onClick={() => navigate('/friends')}>← Ընկերներ</button>
        <h2>Չաթ</h2>
      </div>
      
      <div className="chat-messages-container">
        {messages.map(m => {
          const isMe = m.user_id === user.id;
          return (
            <div key={m.id} className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
              <div className="chat-bubble">
                {!isMe && <div className="chat-sender-name">{m.user_name}</div>}
                <div className="chat-text">{m.message}</div>
                <div className="chat-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Գրեք հաղորդագրություն..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Ուղարկել</button>
        </form>
      </div>
    </div>
  );
}
