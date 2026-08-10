import { useCallback, useEffect, useRef, useState } from 'react';

const FALLBACK_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];
const TERMINAL_CALL_STATES = new Set(['ended', 'declined', 'missed']);
const MAX_RECONNECT_ATTEMPTS = 3;

let callConfigPromise = null;
let ringtoneCtx = null;
let ringtoneInterval = null;

async function loadCallConfig() {
  if (!callConfigPromise) {
    callConfigPromise = fetch('/chat_api.php?action=call_config', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Call config failed (${response.status})`);
        const data = await response.json();
        return {
          iceServers: Array.isArray(data.ice_servers) && data.ice_servers.length > 0
            ? data.ice_servers
            : FALLBACK_ICE_SERVERS,
          pollIntervalMs: Math.max(800, Number(data.poll_interval_ms) || 1200),
        };
      })
      .catch((error) => {
        console.warn('Using fallback WebRTC configuration', error);
        callConfigPromise = null;
        return { iceServers: FALLBACK_ICE_SERVERS, pollIntervalMs: 1200 };
      });
  }
  return callConfigPromise;
}

async function callApi(action, body, options = {}) {
  const response = await fetch(`/chat_api.php?action=${encodeURIComponent(action)}`, {
    method: options.method || 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false || data.error) {
    const error = new Error(data.error || `Call request failed (${response.status})`);
    error.code = data.code || `http_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return data;
}

function parseServerDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function closeCallNotifications(callId) {
  if (!callId || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag: `worship-call-${callId}` });
    notifications.forEach((notification) => notification.close());
  } catch { /* notification enumeration is not available everywhere */ }
}

function playPhoneRingtone(type = 'incoming') {
  stopPhoneRingtone();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ringtoneCtx = new AudioCtx();

    const ring = () => {
      if (!ringtoneCtx || ringtoneCtx.state === 'closed') return;
      if (ringtoneCtx.state === 'suspended') ringtoneCtx.resume().catch(() => {});

      const startAt = ringtoneCtx.currentTime;
      const first = ringtoneCtx.createOscillator();
      const second = ringtoneCtx.createOscillator();
      const gain = ringtoneCtx.createGain();
      first.frequency.setValueAtTime(440, startAt);
      second.frequency.setValueAtTime(480, startAt);
      first.type = 'sine';
      second.type = 'sine';

      const duration = type === 'incoming' ? 1.6 : 1.2;
      const maxGain = type === 'incoming' ? 0.3 : 0.15;
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(maxGain, startAt + 0.05);
      gain.gain.setValueAtTime(maxGain, startAt + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0.001, startAt + duration);
      first.connect(gain);
      second.connect(gain);
      gain.connect(ringtoneCtx.destination);
      first.start(startAt);
      second.start(startAt);
      first.stop(startAt + duration);
      second.stop(startAt + duration);

      if (type === 'incoming' && navigator.vibrate) {
        try { navigator.vibrate([500, 250, 500, 250, 500]); } catch { /* unsupported */ }
      }
    };

    ring();
    ringtoneInterval = window.setInterval(ring, type === 'incoming' ? 3000 : 3600);
  } catch (error) {
    console.warn('Foreground ringtone could not start', error);
  }
}

function stopPhoneRingtone() {
  if (ringtoneInterval) {
    window.clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneCtx) {
    try { ringtoneCtx.close(); } catch { /* already closed */ }
    ringtoneCtx = null;
  }
  if (navigator.vibrate) {
    try { navigator.vibrate(0); } catch { /* unsupported */ }
  }
}

export function useWebRtcAudioCall(chatId, currentUserId) {
  const [callState, setCallState] = useState('idle');
  const [callInfo, setCallInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [callError, setCallError] = useState(null);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  let callDisplayName = 'Օգտատեր';
  let callAvatarGradient = '';
  if (callInfo) {
    const isCaller = Number(callInfo.caller_id) === Number(currentUserId);
    callDisplayName = isCaller
      ? (callInfo.target_name || callInfo.target_email || 'Օգտատեր')
      : (callInfo.caller_name || callInfo.caller_email || 'Օգտատեր');
    callAvatarGradient = isCaller
      ? (callInfo.target_avatar_gradient || '')
      : (callInfo.caller_avatar_gradient || '');
  }

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callStateRef = useRef('idle');
  const callInfoRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const pendingStartRef = useRef(false);
  const cancelPendingStartRef = useRef(false);
  const offerInFlightRef = useRef(false);
  const pollAbortRef = useRef(null);
  const pollWakeRef = useRef(null);
  const durationTimerRef = useRef(null);
  const qualityTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const lastHeartbeatAtRef = useRef(0);
  const wakeLockRef = useRef(null);
  const resetTimerRef = useRef(null);
  const restartConnectionRef = useRef(null);

  const setCallStateStable = useCallback((nextState) => {
    callStateRef.current = nextState;
    setCallState(nextState);
  }, []);

  const setCallInfoStable = useCallback((nextValue) => {
    if (typeof nextValue === 'function') {
      setCallInfo((previous) => {
        const next = nextValue(previous);
        callInfoRef.current = next;
        return next;
      });
      return;
    }
    callInfoRef.current = nextValue;
    setCallInfo(nextValue);
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
    } catch { /* optional capability */ }
  }, []);

  const stopConnectionTimers = useCallback(() => {
    if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
    if (qualityTimerRef.current) window.clearInterval(qualityTimerRef.current);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    durationTimerRef.current = null;
    qualityTimerRef.current = null;
    reconnectTimerRef.current = null;
    releaseWakeLock();
  }, [releaseWakeLock]);

  const isSpeakerOnRef = useRef(true);
  const audioOutputsRef = useRef([]);
  const selectedOutputIdRef = useRef('');

  useEffect(() => {
    audioOutputsRef.current = audioOutputs;
  }, [audioOutputs]);

  useEffect(() => {
    selectedOutputIdRef.current = selectedOutputId;
  }, [selectedOutputId]);

  const applySpeakerRouting = useCallback((isSpeaker) => {
    const audio = remoteAudioRef.current;
    if (audio) {
      audio.volume = isSpeaker ? 1.0 : 0.35;
      if (typeof audio.setSinkId === 'function') {
        if (isSpeaker) {
          const speakerDevice = (audioOutputsRef.current || []).find((d) => {
            const label = (d.label || '').toLowerCase();
            return label.includes('speaker') || label.includes('loudspeaker') || label.includes('динамик') || label.includes('громկ') || label.includes('բարձրախոս');
          });
          audio.setSinkId(speakerDevice ? speakerDevice.deviceId : (selectedOutputIdRef.current || '')).catch(() => {});
        } else {
          const earpieceDevice = (audioOutputsRef.current || []).find((d) => {
            const label = (d.label || '').toLowerCase();
            return label.includes('earpiece') || label.includes('phone') || label.includes('телефон') || label.includes('наուշնիկ') || label.includes('headset');
          });
          audio.setSinkId(earpieceDevice ? earpieceDevice.deviceId : '').catch(() => {});
        }
      }
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      try { pc.close(); } catch { /* already closed */ }
      pcRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    offerInFlightRef.current = false;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  const stopLocalStream = useCallback((forceStop = false) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    if (forceStop) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    } else {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    setIsMuted(false);
  }, []);

  const cleanupWebRtc = useCallback((forceStopMic = false) => {
    stopConnectionTimers();
    closePeerConnection();
    stopLocalStream(forceStopMic);
    reconnectAttemptsRef.current = 0;
    setConnectionQuality('unknown');
    setRemoteAudioBlocked(false);
  }, [closePeerConnection, stopConnectionTimers, stopLocalStream]);

  const resetCall = useCallback(() => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    cleanupWebRtc(false);
    pendingStartRef.current = false;
    cancelPendingStartRef.current = false;
    lastHeartbeatAtRef.current = 0;
    setCallInfoStable(null);
    setCallStateStable('idle');
    setCallDurationSec(0);
    setCallError(null);
  }, [cleanupWebRtc, setCallInfoStable, setCallStateStable]);

  const scheduleReset = useCallback((delay = 1000) => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(resetCall, delay);
  }, [resetCall]);

  const refreshAudioOutputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioOutputs(devices.filter((device) => device.kind === 'audiooutput'));
    } catch { /* output selection is optional */ }
  }, []);

  const ensureLocalStream = useCallback(async () => {
    const existing = localStreamRef.current;
    if (existing?.getAudioTracks().some((track) => track.readyState === 'live')) {
      existing.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsMuted(false);
      return existing;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const error = new Error('Microphone is not supported');
      error.code = 'microphone_unsupported';
      throw error;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      localStreamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          if (['connected', 'connecting', 'reconnecting'].includes(callStateRef.current)) {
            setCallError('microphone_lost');
            setCallStateStable('failed');
          }
        };
      }
      refreshAudioOutputs();
      return stream;
    } catch (error) {
      const microphoneError = new Error(error?.message || 'Microphone failed', { cause: error });
      microphoneError.code = error?.name === 'NotAllowedError' ? 'microphone_denied' : 'microphone_failed';
      throw microphoneError;
    }
  }, [refreshAudioOutputs, setCallStateStable]);

  const startDurationTimer = useCallback((startedAt) => {
    if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
    const serverStart = parseServerDate(startedAt) || new Date();
    const update = () => setCallDurationSec(Math.max(0, Math.floor((Date.now() - serverStart.getTime()) / 1000)));
    update();
    durationTimerRef.current = window.setInterval(update, 1000);
  }, []);

  const startQualityMonitor = useCallback((pc) => {
    if (qualityTimerRef.current) window.clearInterval(qualityTimerRef.current);
    if (!pc?.getStats) return;

    const update = async () => {
      try {
        const reports = await pc.getStats();
        let lossPercent = 0;
        let jitter = 0;
        let roundTripTime = 0;
        reports.forEach((report) => {
          if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
            const received = Number(report.packetsReceived || 0);
            const lost = Number(report.packetsLost || 0);
            lossPercent = received + lost > 0 ? (lost / (received + lost)) * 100 : 0;
            jitter = Number(report.jitter || 0);
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && (report.nominated || report.selected)) {
            roundTripTime = Number(report.currentRoundTripTime || 0);
          }
        });

        if (lossPercent >= 8 || jitter >= 0.1 || roundTripTime >= 0.8) setConnectionQuality('poor');
        else if (lossPercent >= 2 || jitter >= 0.04 || roundTripTime >= 0.3) setConnectionQuality('fair');
        else setConnectionQuality('good');
      } catch { setConnectionQuality('unknown'); }
    };
    update();
    qualityTimerRef.current = window.setInterval(update, 3000);
  }, []);

  const markConnected = useCallback((startedAt) => {
    reconnectAttemptsRef.current = 0;
    setCallError(null);
    if (callStateRef.current !== 'connected') {
      setCallStateStable('connected');
      startDurationTimer(startedAt || callInfoRef.current?.started_at);
      startQualityMonitor(pcRef.current);
    }
    requestWakeLock();
  }, [requestWakeLock, setCallStateStable, startDurationTimer, startQualityMonitor]);

  const sendSignal = useCallback(async (callId, receiverId, type, payload) => {
    await callApi('send_call_signal', {
      call_id: callId,
      receiver_id: receiverId,
      type,
      payload: JSON.stringify(payload),
    });
  }, []);

  const scheduleReconnect = useCallback((delay = 1200) => {
    if (reconnectTimerRef.current || !['connected', 'connecting', 'reconnecting'].includes(callStateRef.current)) return;
    setCallStateStable('reconnecting');
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      restartConnectionRef.current?.();
    }, delay);
  }, [setCallStateStable]);

  const createPeerConnection = useCallback(async (targetId, currentCallId) => {
    closePeerConnection();
    const [{ iceServers }, localStream] = await Promise.all([loadCallConfig(), ensureLocalStream()]);
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });
    pcRef.current = pc;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal(currentCallId, targetId, 'ice', event.candidate.toJSON?.() || event.candidate)
        .catch((error) => console.error('ICE candidate send failed', error));
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!remoteAudioRef.current || !stream) return;
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play()
        .then(() => {
          setRemoteAudioBlocked(false);
          applySpeakerRouting(isSpeakerOnRef.current);
        })
        .catch(() => setRemoteAudioBlocked(true));
    };

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      if (pc.connectionState === 'connected') markConnected(callInfoRef.current?.started_at);
      else if (pc.connectionState === 'disconnected') scheduleReconnect(1800);
      else if (pc.connectionState === 'failed') scheduleReconnect(0);
    };

    pc.oniceconnectionstatechange = () => {
      if (pcRef.current === pc && pc.iceConnectionState === 'failed') scheduleReconnect(0);
    };
    return pc;
  }, [closePeerConnection, ensureLocalStream, markConnected, scheduleReconnect, sendSignal]);

  const flushPendingCandidates = useCallback(async (pc) => {
    const queued = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try { await pc.addIceCandidate(candidate); } catch (error) { console.warn('Queued ICE candidate failed', error); }
    }
  }, []);

  const processSignal = useCallback(async (signal, activeCall, otherUserId) => {
    let payload;
    try {
      payload = typeof signal.payload === 'string' ? JSON.parse(signal.payload) : signal.payload;
    } catch {
      throw new Error('Invalid WebRTC signal payload');
    }

    let pc = pcRef.current;
    if (signal.type === 'offer') {
      if (!pc || pc.connectionState === 'closed') pc = await createPeerConnection(otherUserId, activeCall.id);
      if (pc.signalingState === 'have-local-offer') {
        const isPolitePeer = Number(activeCall.target_id) === Number(currentUserId);
        if (!isPolitePeer) return;
        await pc.setLocalDescription({ type: 'rollback' });
      }
      await pc.setRemoteDescription(payload);
      await flushPendingCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(activeCall.id, otherUserId, 'answer', answer);
      return;
    }

    if (signal.type === 'answer') {
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(payload);
        await flushPendingCandidates(pc);
      }
      return;
    }

    if (signal.type === 'ice') {
      const candidate = new RTCIceCandidate(payload);
      if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
      else pendingIceCandidatesRef.current.push(candidate);
    }
  }, [createPeerConnection, currentUserId, flushPendingCandidates, sendSignal]);

  const createAndSendOffer = useCallback(async (iceRestart = false) => {
    const info = callInfoRef.current;
    if (!info?.id || offerInFlightRef.current) return;
    const callerId = Number(info.caller_id);
    const otherUserId = callerId === Number(currentUserId)
      ? Number(info.target_id)
      : callerId;

    offerInFlightRef.current = true;
    try {
      let pc = pcRef.current;
      if (!pc || pc.connectionState === 'closed') pc = await createPeerConnection(otherUserId, info.id);
      if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' });
      const offer = await pc.createOffer({ iceRestart });
      await pc.setLocalDescription(offer);
      await sendSignal(info.id, otherUserId, 'offer', offer);
    } finally {
      offerInFlightRef.current = false;
    }
  }, [createPeerConnection, currentUserId, sendSignal]);

  const restartConnection = useCallback(async () => {
    const info = callInfoRef.current;
    if (!info?.id || callStateRef.current === 'idle') return;
    if (!navigator.onLine) {
      setCallError('offline');
      setCallStateStable('reconnecting');
      return;
    }
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setCallError('connection_failed');
      setCallStateStable('failed');
      return;
    }
    reconnectAttemptsRef.current += 1;
    setCallError(null);
    setCallStateStable('reconnecting');
    try {
      await createAndSendOffer(true);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (pcRef.current?.connectionState !== 'connected') restartConnectionRef.current?.();
      }, 4500);
    } catch (error) {
      console.warn('WebRTC reconnect failed', error);
      scheduleReconnect(1200);
    }
  }, [createAndSendOffer, scheduleReconnect, setCallStateStable]);

  useEffect(() => { restartConnectionRef.current = restartConnection; }, [restartConnection]);

  const acknowledgeSignals = useCallback(async (callId, signalIds) => {
    if (!signalIds.length) return;
    await callApi('ack_call_signals', { call_id: callId, signal_ids: signalIds });
  }, []);

  useEffect(() => {
    if (callState === 'ringing') playPhoneRingtone('incoming');
    else if (callState === 'calling') playPhoneRingtone('outgoing');
    else stopPhoneRingtone();
    return stopPhoneRingtone;
  }, [callState]);

  useEffect(() => {
    const uid = Number(currentUserId || 0);
    if (!uid) return undefined;
    let stopped = false;
    let timer = null;
    let inFlight = false;

    const schedule = (delay) => {
      if (stopped) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      if (stopped || inFlight || pendingStartRef.current) {
        schedule(500);
        return;
      }
      inFlight = true;
      const info = callInfoRef.current;
      const callId = Number(info?.id || 0);
      const activeChatId = Number(info?.chat_id || chatId || 0);
      pollAbortRef.current?.abort();
      pollAbortRef.current = new AbortController();

      try {
        const response = await fetch(
          `/chat_api.php?action=poll_call_status&chat_id=${activeChatId}&call_id=${callId}&last_signal_id=0`,
          { cache: 'no-store', credentials: 'same-origin', signal: pollAbortRef.current.signal },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || `Poll failed (${response.status})`);

        const currentCall = data.call;
        if (!currentCall || TERMINAL_CALL_STATES.has(currentCall.status)) {
          if (callStateRef.current !== 'idle') {
            closeCallNotifications(callInfoRef.current?.id);
            setCallStateStable('ended');
            scheduleReset(1200);
          }
          return;
        }

        setCallInfoStable(currentCall);
        const callerId = Number(currentCall.caller_id);
        const otherUserId = callerId === uid ? Number(currentCall.target_id) : callerId;

        if (currentCall.status === 'calling') {
          setCallStateStable(callerId === uid ? 'calling' : 'ringing');
          if (callerId !== uid && window.location.search.includes('auto_accept=1')) {
            window.history.replaceState(null, '', window.location.href.replace(/([?&])auto_accept=1(&?)/, (_, lead, tail) => tail ? lead : '').replace(/[?&]$/, ''));
            window.setTimeout(() => pollWakeRef.current?.('accept'), 100);
          }
        } else if (currentCall.status === 'active') {
          if (Date.now() - lastHeartbeatAtRef.current >= 15000) {
            lastHeartbeatAtRef.current = Date.now();
            callApi('heartbeat_call', { call_id: currentCall.id })
              .catch((error) => console.warn('Call heartbeat failed', error));
          }
          if (!pcRef.current) {
            setCallStateStable('connecting');
            if (callerId === uid) await createAndSendOffer(false);
          }
          if (pcRef.current?.connectionState === 'connected') markConnected(currentCall.started_at);
        }

        const acknowledged = [];
        for (const signal of Array.isArray(data.signals) ? data.signals : []) {
          try {
            await processSignal(signal, currentCall, otherUserId);
            acknowledged.push(Number(signal.id));
          } catch (error) {
            console.warn('WebRTC signal will be retried', signal.id, error);
            break;
          }
        }
        if (acknowledged.length) {
          acknowledgeSignals(currentCall.id, acknowledged)
            .catch((error) => console.warn('Signal acknowledgement will retry', error));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Call polling failed', error);
          if (['connected', 'connecting'].includes(callStateRef.current)) {
            setCallError(navigator.onLine ? 'connection_unstable' : 'offline');
            setCallStateStable('reconnecting');
          }
        }
      } finally {
        inFlight = false;
        const config = await loadCallConfig();
        schedule(document.visibilityState === 'visible' ? config.pollIntervalMs : 4000);
      }
    };

    const wakePoll = () => schedule(0);
    pollWakeRef.current = (action) => {
      if (action === 'accept') window.dispatchEvent(new CustomEvent('wp-call-auto-accept'));
      wakePoll();
    };
    window.addEventListener('online', wakePoll);
    document.addEventListener('visibilitychange', wakePoll);
    poll();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      pollWakeRef.current = null;
      window.removeEventListener('online', wakePoll);
      document.removeEventListener('visibilitychange', wakePoll);
    };
  }, [acknowledgeSignals, chatId, createAndSendOffer, currentUserId, markConnected, processSignal, scheduleReset, setCallInfoStable, setCallStateStable]);

  const startCall = useCallback(async (targetUserId = 0, defaultDisplayName = '', customChatId = 0) => {
    if (callStateRef.current !== 'idle') return;
    const activeChatId = Number(customChatId || chatId || 0);
    const targetId = Number(targetUserId || 0);
    cancelPendingStartRef.current = false;
    pendingStartRef.current = true;
    setCallError(null);
    setCallStateStable('preparing');
    setCallInfoStable({
      id: 0,
      chat_id: activeChatId,
      caller_id: currentUserId,
      target_id: targetId,
      target_name: defaultDisplayName,
      status: 'calling',
    });

    try {
      await ensureLocalStream();
      const data = await callApi('start_call', { chat_id: activeChatId, target_id: targetId });
      if (cancelPendingStartRef.current) {
        await callApi('end_call', { call_id: data.call_id }).catch(() => {});
        resetCall();
        return;
      }
      setCallInfoStable((previous) => ({
        ...(previous || {}),
        id: data.call_id,
        target_id: data.target_id,
        chat_id: data.chat_id || activeChatId,
      }));
      setCallStateStable('calling');
      pollWakeRef.current?.();
    } catch (error) {
      console.error('Call start failed', error);
      setCallError(error.code || 'call_start_failed');
      setCallStateStable('failed');
      stopLocalStream();
    } finally {
      pendingStartRef.current = false;
    }
  }, [chatId, currentUserId, ensureLocalStream, resetCall, setCallInfoStable, setCallStateStable, stopLocalStream]);

  const endCall = useCallback(async () => {
    const info = callInfoRef.current;
    if (pendingStartRef.current && !info?.id) {
      cancelPendingStartRef.current = true;
      cleanupWebRtc();
      setCallInfoStable(null);
      setCallStateStable('idle');
      setCallDurationSec(0);
      setCallError(null);
      return;
    }
    if (!info?.id) {
      resetCall();
      return;
    }
    try { await callApi('end_call', { call_id: info.id }); }
    catch (error) { console.warn('Call end could not reach server', error); }
    closeCallNotifications(info.id);
    setCallStateStable('ended');
    cleanupWebRtc();
    scheduleReset(900);
  }, [cleanupWebRtc, resetCall, scheduleReset, setCallInfoStable, setCallStateStable]);

  const acceptCall = useCallback(async () => {
    const info = callInfoRef.current;
    if (!info?.id || callStateRef.current !== 'ringing') return;
    setCallStateStable('connecting');
    setCallError(null);
    try {
      const otherUserId = Number(info.caller_id) === Number(currentUserId) ? Number(info.target_id) : Number(info.caller_id);
      await createPeerConnection(otherUserId, info.id);
      const data = await callApi('respond_call', { call_id: info.id, response: 'accept' });
      closeCallNotifications(info.id);
      setCallInfoStable((previous) => ({ ...(previous || {}), status: 'active', started_at: data.started_at }));
      startDurationTimer(data.started_at);
      pollWakeRef.current?.();
    } catch (error) {
      console.error('Call accept failed', error);
      setCallError(error.code || 'microphone_failed');
      setCallStateStable('failed');
      closePeerConnection();
      stopLocalStream();
    }
  }, [closePeerConnection, createPeerConnection, currentUserId, setCallInfoStable, setCallStateStable, startDurationTimer, stopLocalStream]);

  const declineCall = useCallback(async () => {
    const info = callInfoRef.current;
    if (!info?.id) return resetCall();
    try { await callApi('respond_call', { call_id: info.id, response: 'decline' }); }
    catch (error) { console.warn('Call decline failed', error); }
    setCallStateStable('ended');
    closeCallNotifications(info.id);
    cleanupWebRtc();
    scheduleReset(700);
  }, [cleanupWebRtc, resetCall, scheduleReset, setCallStateStable]);

  useEffect(() => {
    const handleAutoAccept = () => acceptCall();
    window.addEventListener('wp-call-auto-accept', handleAutoAccept);
    return () => window.removeEventListener('wp-call-auto-accept', handleAutoAccept);
  }, [acceptCall]);

  const retryConnection = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setCallError(null);
    restartConnectionRef.current?.();
  }, []);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    setIsMuted((muted) => {
      track.enabled = muted;
      return !muted;
    });
  }, []);

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prevSpeaker) => {
      const nextSpeaker = !prevSpeaker;
      isSpeakerOnRef.current = nextSpeaker;
      applySpeakerRouting(nextSpeaker);
      return nextSpeaker;
    });
  }, [applySpeakerRouting]);

  const selectAudioOutput = useCallback(async (deviceId) => {
    const audio = remoteAudioRef.current;
    if (!audio || typeof audio.setSinkId !== 'function') return false;
    try {
      await audio.setSinkId(deviceId);
      setSelectedOutputId(deviceId);
      return true;
    } catch (error) {
      console.warn('Audio output selection failed', error);
      return false;
    }
  }, []);

  const resumeRemoteAudio = useCallback(async () => {
    if (!remoteAudioRef.current) return;
    try {
      await remoteAudioRef.current.play();
      setRemoteAudioBlocked(false);
    } catch { setRemoteAudioBlocked(true); }
  }, []);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return undefined;
    mediaDevices.addEventListener('devicechange', refreshAudioOutputs);
    return () => mediaDevices.removeEventListener('devicechange', refreshAudioOutputs);
  }, [refreshAudioOutputs]);

  const isMutedRef = useRef(false);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (callState === 'connected' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: callDisplayName || 'Աուդիոզանգ',
          artist: 'Worship Platform',
          album: 'Live Call',
        });
        navigator.mediaSession.setActionHandler('hangup', () => endCall());
      } catch (e) {
        console.warn('MediaSession setup failed', e);
      }
    }
  }, [callState, callDisplayName, endCall]);

  useEffect(() => {
    const handleOnline = () => {
      if (callStateRef.current === 'reconnecting') retryConnection();
    };
    const handleOffline = () => {
      if (['connected', 'connecting'].includes(callStateRef.current)) {
        setCallError('offline');
        setCallStateStable('reconnecting');
      }
    };
    const handleVisibility = () => {
      if (['connected', 'connecting'].includes(callStateRef.current)) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            if (track.readyState === 'live') {
              track.enabled = !isMutedRef.current;
            }
          });
        }
        if (remoteAudioRef.current && remoteAudioRef.current.paused) {
          remoteAudioRef.current.play().catch(() => setRemoteAudioBlocked(true));
        }
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleVisibility);
    };
  }, [requestWakeLock, retryConnection, setCallStateStable]);

  useEffect(() => () => cleanupWebRtc(true), [cleanupWebRtc]);

  useEffect(() => {
    if (!Number(currentUserId || 0) && callStateRef.current !== 'idle') resetCall();
  }, [currentUserId, resetCall]);

  return {
    callState,
    callInfo,
    callDisplayName,
    callAvatarGradient,
    isMuted,
    isSpeakerOn,
    callDurationSec,
    connectionQuality,
    callError,
    audioOutputs,
    selectedOutputId,
    remoteAudioBlocked,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    retryConnection,
    toggleMute,
    toggleSpeaker,
    selectAudioOutput,
    resumeRemoteAudio,
    dismissCall: resetCall,
  };
}
