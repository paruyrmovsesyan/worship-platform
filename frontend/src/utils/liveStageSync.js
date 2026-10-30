/**
 * Live Stage Sync & Band Follower Client + Offline P2P Mesh Discovery
 * Supports real-time BroadcastChannel (multi-tab / offline mesh), localStorage sync, and HTTP polling.
 */

const MESH_REGISTRY_KEY = 'wp_mesh_sessions_registry';

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
    this.discoverySubscribers = new Set();

    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel('wp_live_stage_mesh');
          this.channel.onmessage = (event) => {
            const msg = event.data;
            if (!msg) return;

            if (msg.type === 'DISCOVER_REQUEST' && this.isLeader && this.sessionId) {
              this.announceMeshPresence();
              return;
            }

            if (msg.type === 'SESSION_ANNOUNCE' && msg.session) {
              this.saveMeshSessionToRegistry(msg.session);
              this.notifyDiscovery();
              return;
            }

            if (msg.session_id && msg.session_id === this.sessionId && msg.state) {
              this.handleIncomingState(msg.state);
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel not supported in this context', e);
        }
      }

      // Cross-tab fallback via storage event
      window.addEventListener('storage', (e) => {
        if (e.key === MESH_REGISTRY_KEY) {
          this.notifyDiscovery();
        }
        if (e.key === `wp_stage_state_${this.sessionId}` && e.newValue) {
          try {
            const state = JSON.parse(e.newValue);
            this.handleIncomingState(state);
          } catch {
            // ignore
          }
        }
      });
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

  saveMeshSessionToRegistry(sessInfo) {
    if (!sessInfo || !sessInfo.session_id) return;
    try {
      const raw = localStorage.getItem(MESH_REGISTRY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[sessInfo.session_id] = {
        ...sessInfo,
        updated_at: Math.floor(Date.now() / 1000),
        mesh_local: true,
      };
      // Prune entries older than 2 hours
      const cutoff = Math.floor(Date.now() / 1000) - 7200;
      Object.keys(map).forEach((k) => {
        if ((map[k]?.updated_at || 0) < cutoff) delete map[k];
      });
      localStorage.setItem(MESH_REGISTRY_KEY, JSON.stringify(map));
    } catch {
      // ignore storage errors
    }
  }

  removeMeshSessionFromRegistry(sessionId) {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(MESH_REGISTRY_KEY);
      if (!raw) return;
      const map = JSON.parse(raw);
      delete map[sessionId];
      localStorage.setItem(MESH_REGISTRY_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  getLocalMeshSessions() {
    try {
      const raw = localStorage.getItem(MESH_REGISTRY_KEY);
      if (!raw) return [];
      const map = JSON.parse(raw);
      const cutoff = Math.floor(Date.now() / 1000) - 3600;
      return Object.values(map).filter((s) => (s?.updated_at || 0) >= cutoff);
    } catch {
      return [];
    }
  }

  announceMeshPresence() {
    if (!this.sessionId || !this.isLeader) return;
    const info = {
      session_id: this.sessionId,
      leader_name: this.leaderName,
      song_id: this.currentState?.song_id || null,
      song_title: this.currentState?.song_title || '',
      target_key: this.currentState?.target_key || '',
      updated_at: Math.floor(Date.now() / 1000),
      mesh_local: true,
    };
    this.saveMeshSessionToRegistry(info);
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'SESSION_ANNOUNCE', session: info });
      } catch {
        // ignore
      }
    }
  }

  notifyDiscovery() {
    const local = this.getLocalMeshSessions();
    this.discoverySubscribers.forEach((cb) => {
      try {
        cb(local);
      } catch {
        // ignore
      }
    });
  }

  async discoverActiveSessions() {
    // 1. Ping local P2P mesh
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'DISCOVER_REQUEST' });
      } catch {
        // ignore
      }
    }

    const merged = new Map();
    for (const s of this.getLocalMeshSessions()) {
      if (s?.session_id) merged.set(s.session_id, s);
    }

    // 2. Query server API for remote band sessions
    try {
      const res = await fetch('/live_stage_api.php?action=list_active_sessions');
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.sessions)) {
          for (const s of data.sessions) {
            if (s?.session_id) {
              const existing = merged.get(s.session_id);
              merged.set(s.session_id, {
                ...s,
                mesh_local: Boolean(existing?.mesh_local),
              });
            }
          }
        }
      }
    } catch {
      // Offline mode: local P2P mesh sessions still work
    }

    return Array.from(merged.values()).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  // Leader starts or updates stage session
  startSession(sessionId, leaderName = 'Worship Leader', initialState = {}) {
    this.sessionId = sessionId;
    this.isLeader = true;
    this.leaderName = leaderName || 'Worship Leader';
    this.stopPolling();
    try {
      localStorage.setItem('wp_active_stage_session', sessionId);
      localStorage.setItem('wp_active_stage_role', 'leader');
    } catch {
      // ignore
    }
    this.broadcastState(initialState);
  }

  // Follower joins stage session
  joinSession(sessionId) {
    this.sessionId = sessionId;
    this.isLeader = false;
    try {
      localStorage.setItem('wp_active_stage_session', sessionId);
      localStorage.setItem('wp_active_stage_role', 'follower');
      // Immediately check local mesh state if available
      const cachedState = localStorage.getItem(`wp_stage_state_${sessionId}`);
      if (cachedState) {
        this.handleIncomingState(JSON.parse(cachedState));
      }
    } catch {
      // ignore
    }
    this.startPolling();
  }

  leaveSession() {
    if (this.isLeader && this.sessionId) {
      this.removeMeshSessionFromRegistry(this.sessionId);
    }
    this.stopPolling();
    this.sessionId = null;
    this.isLeader = false;
    this.currentState = null;
    try {
      localStorage.removeItem('wp_active_stage_session');
      localStorage.removeItem('wp_active_stage_role');
    } catch {
      // ignore
    }
    this.emit(null);
  }

  // Broadcast state change (called by Leader)
  async broadcastState(stateUpdate = {}) {
    if (!this.sessionId) return;

    const payload = {
      ...(this.currentState || {}),
      session_id: this.sessionId,
      leader_name: this.leaderName,
      ...stateUpdate,
      version: Date.now(),
    };

    try {
      localStorage.setItem(`wp_stage_state_${this.sessionId}`, JSON.stringify(payload));
    } catch {
      // ignore
    }

    // 1. Broadcast locally (0ms latency to all local tabs & projection screens)
    if (this.channel) {
      try {
        this.channel.postMessage({
          session_id: this.sessionId,
          state: payload,
        });
      } catch {
        // ignore
      }
    }

    this.handleIncomingState(payload);
    this.announceMeshPresence();

    // 2. Push to server for remote band members
    try {
      await fetch('/live_stage_api.php?action=broadcast_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback: mesh communication continues via local broadcast
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
      } catch {
        // Silent network failure — fallback to local mesh state
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
