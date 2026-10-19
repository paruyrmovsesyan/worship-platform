import React, { useState, useEffect } from 'react';
import { liveStageSync } from '../utils/liveStageSync';
import './LiveStageBar.css';

export default function LiveStageBar({
  onFollowSongChange,
  currentSongId,
  isLeader = false,
  sessionId: propSessionId = null,
}) {
  const [activeSession, setActiveSession] = useState(propSessionId || liveStageSync.sessionId);
  const [stageState, setStageState] = useState(liveStageSync.currentState);
  const [isFollowing, setIsFollowing] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);

  useEffect(() => {
    const unsub = liveStageSync.subscribe((state) => {
      setStageState(state);
      setActiveSession(liveStageSync.sessionId);

      // If follower and leader changed song
      if (
        !liveStageSync.isLeader &&
        isFollowing &&
        state &&
        state.song_id &&
        state.song_id !== currentSongId
      ) {
        if (onFollowSongChange) {
          onFollowSongChange(state.song_id, state);
        }
      }
    });

    return () => unsub();
  }, [currentSongId, isFollowing, onFollowSongChange]);

  const handleStartSession = () => {
    const code = 'STAGE-' + Math.floor(1000 + Math.random() * 9000);
    liveStageSync.startSession(code, 'Worship Leader');
    setActiveSession(code);
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (joinInputCode.trim()) {
      liveStageSync.joinSession(joinInputCode.trim().toUpperCase());
      setActiveSession(joinInputCode.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinInputCode('');
    }
  };

  const handleLeaveSession = () => {
    liveStageSync.leaveSession();
    setActiveSession(null);
    setStageState(null);
  };

  const handleSendStageMessage = (e) => {
    e.preventDefault();
    if (broadcastMessage.trim()) {
      liveStageSync.broadcastState({ stage_message: broadcastMessage.trim() });
      setBroadcastMessage('');
      setShowMessageInput(false);
    }
  };

  if (!activeSession) {
    return (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={handleStartSession}
          className="live-stage-btn"
          style={{ background: '#ef4444', border: 'none', padding: '6px 12px' }}
        >
          🔴 Start Live Stage (Broadcast)
        </button>
        <button
          type="button"
          onClick={() => setShowJoinModal(true)}
          className="live-stage-btn"
          style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px' }}
        >
          📡 Join Band Session
        </button>

        {showJoinModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#1a1e2e',
                padding: '24px',
                borderRadius: '16px',
                width: '320px',
                border: '1px solid #334155',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.1rem' }}>
                Join Live Stage Session
              </h3>
              <form onSubmit={handleJoinSession}>
                <input
                  type="text"
                  placeholder="e.g. STAGE-1234"
                  value={joinInputCode}
                  onChange={(e) => setJoinInputCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    color: '#fff',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      color: '#cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#38bdf8',
                      border: 'none',
                      color: '#000',
                      fontWeight: 700,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {stageState?.stage_message && (
        <div className="live-stage-alert-banner">
          <span>📢 Stage Alert: {stageState.stage_message}</span>
          {liveStageSync.isLeader && (
            <button
              type="button"
              onClick={() => liveStageSync.broadcastState({ stage_message: '' })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="live-stage-bar">
        <div className="live-stage-badge">
          <div className="live-stage-pulse-dot" />
          <span>STAGE: {activeSession}</span>
        </div>

        <div className="live-stage-info">
          {liveStageSync.isLeader ? (
            <span>👑 You are Broadcasting</span>
          ) : (
            <span>
              Follower ({isFollowing ? 'Auto-Sync ON' : 'Paused'})
            </span>
          )}
        </div>

        <div className="live-stage-actions">
          {liveStageSync.isLeader ? (
            <>
              <button
                type="button"
                className="live-stage-btn"
                onClick={() => setShowMessageInput(!showMessageInput)}
              >
                💬 Alert
              </button>
              <a
                href={`/projection/live/${activeSession}`}
                target="_blank"
                rel="noreferrer"
                className="live-stage-btn"
              >
                📽️ Projection
              </a>
            </>
          ) : (
            <button
              type="button"
              className="live-stage-btn"
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? 'Pause Sync' : 'Resume Sync'}
            </button>
          )}

          <button
            type="button"
            className="live-stage-btn"
            onClick={handleLeaveSession}
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            Leave
          </button>
        </div>
      </div>

      {showMessageInput && (
        <form
          onSubmit={handleSendStageMessage}
          style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
        >
          <input
            type="text"
            placeholder="Alert band e.g. 'Chorus 2x', 'Ending on Bridge'"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#fff',
            }}
          />
          <button
            type="submit"
            className="live-stage-btn"
            style={{ background: '#38bdf8', color: '#000' }}
          >
            Send
          </button>
        </form>
      )}
    </>
  );
}
