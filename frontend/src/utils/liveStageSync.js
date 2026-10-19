/**
 * Live Stage Sync & Band Follower Client
 * Supports real-time BroadcastChannel (multi-tab / offline mesh) and HTTP polling sync.
 */

class LiveStageSyncService {
  constructor() {
    this.sessionId = null;
    this.isLeader = false;
    this.leaderName = 'Worship Leader';
    this.channel = null;
    this.pollIntervalId = null;
    this.lastVersion = 0;
    this.currentState = null;
    this.subscribers = new Set();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('wp_live_stage_mesh');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.session_id === this.sessionId) {
            this.handleIncomingState(event.data.state);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this context', e);
      }
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    if (this.currentState) {
      callback(this.currentState);
    }
    return () => this.subscribers.delete(callback);
  }

  emit(state) {
    this.currentState = state;
    this.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.error('Stage sync subscriber error:', e);
      }
    });
  }

  handleIncomingState(state) {
    if (!state) return;
    if (state.version && state.version <= this.lastVersion) return;
    this.lastVersion = state.version || Date.now();
    this.emit(state);
  }

  // Leader starts or updates stage session
  startSession(sessionId, leaderName = 'Worship Leader') {
    this.sessionId = sessionId;
    this.isLeader = true;
    this.leaderName = leaderName;
    this.stopPolling();
    // Cache active session locally
    try {
      localStorage.setItem('wp_active_stage_session', sessionId);
    } catch (_) {}
  }

  // Follower joins stage session
  joinSession(sessionId) {
    this.sessionId = sessionId;
    this.isLeader = false;
    this.startPolling();
    try {
      localStorage.setItem('wp_active_stage_session', sessionId);
    } catch (_) {}
  }

  leaveSession() {
    this.stopPolling();
    this.sessionId = null;
    this.isLeader = false;
    this.currentState = null;
    try {
      localStorage.removeItem('wp_active_stage_session');
    } catch (_) {}
    this.emit(null);
  }

  // Broadcast state change (called by Leader)
  async broadcastState(stateUpdate) {
    if (!this.sessionId) return;

    const payload = {
      session_id: this.sessionId,
      leader_name: this.leaderName,
      ...stateUpdate,
      version: Date.now(),
    };

    // 1. Broadcast locally (0ms latency to all local tabs & projection screens)
    if (this.channel) {
      this.channel.postMessage({
        session_id: this.sessionId,
        state: payload,
      });
    }

    this.handleIncomingState(payload);

    // 2. Push to server for remote band members
    try {
      await fetch('/live_stage_api.php?action=broadcast_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Offline fallback: mesh communication continues via local broadcast
      console.warn('Live Stage server sync failed (operating in offline mesh):', err);
    }
  }

  startPolling() {
    this.stopPolling();
    const fetchState = async () => {
      if (!this.sessionId) return;
      try {
        const res = await fetch(`/live_stage_api.php?action=get_state&session_id=${encodeURIComponent(this.sessionId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.state) {
            this.handleIncomingState(json.state);
          }
        }
      } catch (_) {
        // Silent network failure
      }
    };

    fetchState();
    this.pollIntervalId = window.setInterval(fetchState, 1200);
  }

  stopPolling() {
    if (this.pollIntervalId) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }
}

export const liveStageSync = new LiveStageSyncService();
