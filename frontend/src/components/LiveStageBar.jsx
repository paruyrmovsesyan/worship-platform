import { useState, useEffect } from 'react';
import { liveStageSync } from '../utils/liveStageSync';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge } from './BetaBadge';
import './LiveStageBar.css';

const QUICK_STAGE_ALERTS = [
  'Կրկներգ 2x',
  'Անցում Կամուրջին',
  'Միայն ձայներ (A cappella)',
  'Աղոթք / Pad',
  'Հանգիստ ավարտ',
];

export default function LiveStageBar({
  onFollowSongChange,
  currentSongId,
  currentSongTitle = '',
  currentKey = '',
  currentCapo = 0,
  currentSemi = 0,
  currentBpm = 0,
  leaderName = 'Worship Leader',
  isLeader = false,
  sessionId: propSessionId = null,
}) {
  const { isBeta } = useFeatureFlags();
  const [activeSession, setActiveSession] = useState(propSessionId || liveStageSync.sessionId);
  const [stageState, setStageState] = useState(liveStageSync.currentState);
  const [isFollowing, setIsFollowing] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [discoveredSessions, setDiscoveredSessions] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (propSessionId && !liveStageSync.sessionId) {
      if (isLeader) {
        liveStageSync.startSession(propSessionId, leaderName, {
          song_id: currentSongId || null,
          song_title: currentSongTitle || '',
          target_key: currentKey || '',
          capo: currentCapo || 0,
          semi: currentSemi || 0,
          bpm: currentBpm || 0,
        });
      } else {
        liveStageSync.joinSession(propSessionId);
      }
    }
  }, [propSessionId, isLeader, leaderName, currentSongId, currentSongTitle, currentKey, currentCapo, currentSemi, currentBpm]);

  // Whenever Leader changes song, key, capo, or semi, broadcast automatically
  useEffect(() => {
    if (activeSession && liveStageSync.isLeader && currentSongId) {
      liveStageSync.broadcastState({
        song_id: Number(currentSongId),
        song_title: currentSongTitle || '',
        target_key: currentKey || '',
        capo: Number(currentCapo || 0),
        semi: Number(currentSemi || 0),
        bpm: Number(currentBpm || 0),
      });
    }
  }, [activeSession, currentSongId, currentSongTitle, currentKey, currentCapo, currentSemi, currentBpm]);

  useEffect(() => {
    const unsub = liveStageSync.subscribe((state) => {
      setStageState(state);
      setActiveSession(liveStageSync.sessionId);

      if (
        !liveStageSync.isLeader &&
        isFollowing &&
        state &&
        state.song_id &&
        Number(state.song_id) !== Number(currentSongId)
      ) {
        if (onFollowSongChange) {
          onFollowSongChange(state.song_id, state);
        }
      }
    });

    return () => unsub();
  }, [currentSongId, isFollowing, onFollowSongChange]);

  const loadDiscoveredSessions = async () => {
    setDiscovering(true);
    try {
      const list = await liveStageSync.discoverActiveSessions();
      setDiscoveredSessions(list);
    } finally {
      setDiscovering(false);
    }
  };

  const handleOpenJoinModal = () => {
    setShowJoinModal(true);
    loadDiscoveredSessions();
  };

  const handleStartSession = () => {
    const code = 'STAGE-' + Math.floor(1000 + Math.random() * 9000);
    liveStageSync.startSession(code, leaderName, {
      song_id: currentSongId ? Number(currentSongId) : null,
      song_title: currentSongTitle || '',
      target_key: currentKey || '',
      capo: Number(currentCapo || 0),
      semi: Number(currentSemi || 0),
      bpm: Number(currentBpm || 0),
    });
    setActiveSession(code);
  };

  const handleJoinByCode = (codeToJoin) => {
    const clean = String(codeToJoin || '').trim().toUpperCase();
    if (!clean) return;
    liveStageSync.joinSession(clean);
    setActiveSession(clean);
    setShowJoinModal(false);
    setJoinInputCode('');
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    handleJoinByCode(joinInputCode);
  };

  const handleLeaveSession = () => {
    liveStageSync.leaveSession();
    setActiveSession(null);
    setStageState(null);
    setShowMessageInput(false);
  };

  const handleSendStageMessage = (e) => {
    e.preventDefault();
    if (broadcastMessage.trim()) {
      liveStageSync.broadcastState({ stage_message: broadcastMessage.trim() });
      setBroadcastMessage('');
      setShowMessageInput(false);
    }
  };

  const handleQuickAlert = (msg) => {
    liveStageSync.broadcastState({ stage_message: msg });
    setShowMessageInput(false);
  };

  const handleCopyCode = () => {
    if (!activeSession) return;
    navigator.clipboard?.writeText(activeSession).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  if (!activeSession) {
    return (
      <div className="live-stage-idle-bar">
        <div className="live-stage-idle-left">
          <span className="live-stage-idle-icon">📡</span>
          <span className="live-stage-idle-label">Բեմական Սինքրոնացում</span>
          {isBeta('live_stage_follower') && <BetaBadge label="BETA" />}
        </div>
        <div className="live-stage-idle-actions">
          <button
            type="button"
            onClick={handleStartSession}
            className="live-stage-pill-btn live-stage-pill-btn--start"
            title="Սկսել բեմական ուղիղ հեռարձակում խմբի համար"
          >
            <span className="live-stage-rec-dot" />
            <span>Սկսել Live Բեմ</span>
          </button>
          <button
            type="button"
            onClick={handleOpenJoinModal}
            className="live-stage-pill-btn live-stage-pill-btn--join"
            title="Միանալ Worship Leader-ի բեմական նիստին"
          >
            <span>🔗 Միանալ խմբին</span>
          </button>
        </div>

        {showJoinModal && (
          <div className="live-stage-modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="live-stage-modal" onClick={(e) => e.stopPropagation()}>
              <div className="live-stage-modal-header">
                <h3>📡 Միանալ Live Բեմին</h3>
                <button
                  type="button"
                  className="live-stage-modal-close"
                  onClick={() => setShowJoinModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Discovered Active Sessions (Server + Offline P2P Mesh) */}
              <div className="live-stage-discovered-section">
                <div className="live-stage-discovered-header">
                  <span>Ակտիվ բեմական նիստեր (Online & P2P Mesh)</span>
                  <button
                    type="button"
                    className="live-stage-refresh-btn"
                    onClick={loadDiscoveredSessions}
                    disabled={discovering}
                  >
                    {discovering ? '...' : '↻ Թարմացնել'}
                  </button>
                </div>

                {discoveredSessions.length > 0 ? (
                  <div className="live-stage-session-list">
                    {discoveredSessions.map((sess) => (
                      <div key={sess.session_id} className="live-stage-session-item">
                        <div className="live-stage-session-meta">
                          <div className="live-stage-session-code">
                            <span className="live-stage-pulse-dot" />
                            <strong>{sess.session_id}</strong>
                            {sess.mesh_local && (
                              <span className="live-stage-mesh-tag">⚡ P2P Mesh</span>
                            )}
                          </div>
                          <div className="live-stage-session-sub">
                            {sess.leader_name || 'Leader'}
                            {sess.song_title ? ` • 🎵 ${sess.song_title}` : ''}
                            {sess.target_key ? ` (${sess.target_key})` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="live-stage-join-now-btn"
                          onClick={() => handleJoinByCode(sess.session_id)}
                        >
                          Միանալ
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="live-stage-empty-sessions">
                    Ակտիվ նիստեր չգտնվեցին։ Կարող եք մուտքագրել կոդը ձեռքով․
                  </div>
                )}
              </div>

              <form onSubmit={handleJoinSession} className="live-stage-join-form">
                <label className="live-stage-input-label">Մուտքագրեք բեմի կոդը</label>
                <div className="live-stage-input-row">
                  <input
                    type="text"
                    placeholder="Օր.՝ STAGE-1234 կամ SETLIST-5"
                    value={joinInputCode}
                    onChange={(e) => setJoinInputCode(e.target.value)}
                    className="live-stage-code-input"
                    autoFocus
                  />
                  <button type="submit" className="live-stage-submit-btn">
                    Միանալ
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
    <div className="live-stage-active-wrapper">
      {stageState?.stage_message && (
        <div className="live-stage-alert-banner">
          <div className="live-stage-alert-content">
            <span className="live-stage-alert-icon">📢</span>
            <span>Բեմական Ազդանշան՝ <strong>{stageState.stage_message}</strong></span>
          </div>
          {liveStageSync.isLeader && (
            <button
              type="button"
              className="live-stage-alert-clear"
              onClick={() => liveStageSync.broadcastState({ stage_message: '' })}
              title="Մաքրել ազդանշանը"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className={`live-stage-bar ${liveStageSync.isLeader ? 'is-leader' : 'is-follower'}`}>
        <div className="live-stage-badge" onClick={handleCopyCode} title="Սեղմեք կոդը պատճենելու համար">
          <div className="live-stage-pulse-dot" />
          <span>{activeSession}</span>
          <span className="live-stage-copy-hint">{copiedCode ? '✓ Պատճենվեց' : '📋'}</span>
        </div>

        <div className="live-stage-info">
          {liveStageSync.isLeader ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              👑 Դուք ղեկավարում եք բեմը
              {isBeta('live_stage_follower') && <BetaBadge label="BETA" />}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🎸 Հետևում եք ({isFollowing ? 'Ավտո-Սինք ՄԻԱՑՎԱԾ' : 'Դադարեցված'})
              {stageState?.target_key ? ` • Տոն՝ ${stageState.target_key}` : ''}
              {isBeta('live_stage_follower') && <BetaBadge label="BETA" />}
            </span>
          )}
        </div>

        <div className="live-stage-actions">
          {liveStageSync.isLeader ? (
            <>
              <button
                type="button"
                className={`live-stage-btn ${showMessageInput ? 'active' : ''}`}
                onClick={() => setShowMessageInput(!showMessageInput)}
              >
                💬 Ազդանշան
              </button>
              <a
                href={`/projection/live/${activeSession}`}
                target="_blank"
                rel="noreferrer"
                className="live-stage-btn"
              >
                📽️ Պրոյեկտոր
              </a>
            </>
          ) : (
            <button
              type="button"
              className="live-stage-btn"
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? '⏸ Դադարեցնել սինքը' : '▶ Միացնել սինքը'}
            </button>
          )}

          <button
            type="button"
            className="live-stage-btn live-stage-btn--leave"
            onClick={handleLeaveSession}
          >
            Ելք
          </button>
        </div>
      </div>

      {showMessageInput && liveStageSync.isLeader && (
        <div className="live-stage-message-panel">
          <div className="live-stage-presets-row">
            {QUICK_STAGE_ALERTS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="live-stage-preset-chip"
                onClick={() => handleQuickAlert(preset)}
              >
                ⚡ {preset}
              </button>
            ))}
          </div>
          <form onSubmit={handleSendStageMessage} className="live-stage-msg-form">
            <input
              type="text"
              placeholder="Գրեք հաղորդագրություն խմբին (օր.՝ Կրկներգ 2x, Ավարտում ենք Կամուրջով)..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="live-stage-msg-input"
            />
            <button type="submit" className="live-stage-msg-send">
              Ուղարկել
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
