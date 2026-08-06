import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

let ringtoneCtx = null;
let ringtoneInterval = null;

function playPhoneRingtone(type = 'incoming') {
  stopPhoneRingtone();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ringtoneCtx = new AudioCtx();

    const ring = () => {
      if (!ringtoneCtx || ringtoneCtx.state === 'closed') return;
      if (ringtoneCtx.state === 'suspended') {
        ringtoneCtx.resume().catch(() => {});
      }

      const t = ringtoneCtx.currentTime;
      const osc1 = ringtoneCtx.createOscillator();
      const osc2 = ringtoneCtx.createOscillator();
      const gain = ringtoneCtx.createGain();

      osc1.frequency.setValueAtTime(440, t);
      osc2.frequency.setValueAtTime(480, t);
      osc1.type = 'sine';
      osc2.type = 'sine';

      const dur = type === 'incoming' ? 1.6 : 1.2;
      const maxGain = type === 'incoming' ? 0.3 : 0.15;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(maxGain, t + 0.05);
      gain.gain.setValueAtTime(maxGain, t + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0.001, t + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ringtoneCtx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur);
      osc2.stop(t + dur);

      if (type === 'incoming' && navigator.vibrate) {
        try {
          navigator.vibrate([500, 250, 500, 250, 500]);
        } catch (e) {}
      }
    };

    ring();
    ringtoneInterval = setInterval(ring, type === 'incoming' ? 3000 : 3600);
  } catch (e) {
    console.error('Failed to play phone ringtone', e);
  }
}

function stopPhoneRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneCtx) {
    try {
      ringtoneCtx.close();
    } catch (e) {}
    ringtoneCtx = null;
  }
  if (navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}

export function useWebRtcAudioCall(chatId, currentUserId) {
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  const [callInfo, setCallInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const lastSignalIdRef = useRef(0);
  const callPollIntervalRef = useRef(null);
  const durationTimerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  useEffect(() => {
    if (callState === 'ringing') {
      playPhoneRingtone('incoming');
    } else if (callState === 'calling') {
      playPhoneRingtone('outgoing');
    } else {
      stopPhoneRingtone();
    }

    return () => {
      stopPhoneRingtone();
    };
  }, [callState]);

  // Use refs for stable access in callbacks without triggering re-renders
  const callStateRef = useRef('idle');
  const callInfoRef = useRef(null);
  const pendingStartRef = useRef(false); // true while start_call POST is in-flight

  const setCallStateStable = useCallback((s) => {
    callStateRef.current = s;
    setCallState(s);
  }, []);

  const setCallInfoStable = useCallback((infoOrFn) => {
    if (typeof infoOrFn === 'function') {
      setCallInfo((prev) => {
        const next = infoOrFn(prev);
        callInfoRef.current = next;
        return next;
      });
    } else {
      callInfoRef.current = infoOrFn;
      setCallInfo(infoOrFn);
    }
  }, []);

  // Clean up WebRTC PeerConnection & local media stream
  const cleanupWebRtc = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setIsMuted(false);
  }, []);

  // Reset call to idle
  const resetCall = useCallback(() => {
    cleanupWebRtc();
    pendingStartRef.current = false;
    lastSignalIdRef.current = 0;
    pendingIceCandidatesRef.current = [];
    setCallInfoStable(null);
    setCallStateStable('idle');
    setCallDurationSec(0);
  }, [cleanupWebRtc, setCallStateStable, setCallInfoStable]);

  // Create RTCPeerConnection and setup local mic stream
  const initPeerConnection = useCallback(async (targetId, currentCallId) => {
    cleanupWebRtc();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (e) {
      console.error('Failed to get microphone stream', e);
      alert('Միկրոֆոնի թույլտվություն չկա: Խնդրում ենք թույլատրել միկրոֆոնը:');
      return null;
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && currentCallId) {
        fetch('/chat_api.php?action=send_call_signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            call_id: currentCallId,
            receiver_id: targetId,
            type: 'ice',
            payload: JSON.stringify(event.candidate),
          }),
        }).catch((err) => console.error('Failed to send ICE candidate', err));
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((err) => console.log('Audio autoplay error:', err));
      }
    };

    return pc;
  }, [cleanupWebRtc]);

  // Process incoming WebRTC signaling messages (Offer, Answer, ICE Candidates)
  const processSignal = useCallback(async (signal, callId, otherUserId) => {
    let payload = null;
    try {
      payload = typeof signal.payload === 'string' ? JSON.parse(signal.payload) : signal.payload;
    } catch (e) {
      console.error('Failed to parse signal payload', e);
      return;
    }

    let pc = pcRef.current;

    if (signal.type === 'offer') {
      if (!pc) {
        pc = await initPeerConnection(otherUserId, callId);
        if (!pc) {
          endCall();
          return;
        }
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      
      // Flush any queued ICE candidates now that remote description is set
      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.error('Failed to add queued ICE candidate', e);
        }
      }
      pendingIceCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch('/chat_api.php?action=send_call_signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          receiver_id: otherUserId,
          type: 'answer',
          payload: JSON.stringify(answer),
        }),
      });
    } else if (signal.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        // Flush any queued ICE candidates
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (e) {
            console.error('Failed to add queued ICE candidate', e);
          }
        }
        pendingIceCandidatesRef.current = [];
      }
    } else if (signal.type === 'ice') {
      const candidate = new RTCIceCandidate(payload);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error('Error adding ICE candidate', err);
        }
      } else {
        pendingIceCandidatesRef.current.push(candidate);
      }
    }
  }, [initPeerConnection]);

  // Single stable polling loop — started once, uses refs for state access
  useEffect(() => {
    const uidNum = Number(currentUserId || 0);
    if (!uidNum) return;

    const poll = async () => {
      try {
        const currentState = callStateRef.current;
        const currentInfo = callInfoRef.current;

        // While start_call POST is in-flight, skip polls to avoid race condition
        if (pendingStartRef.current) return;

        const activeCallId = currentInfo?.id || 0;
        const activeChatId = currentInfo?.chat_id || chatId || 0;
        const res = await fetch(
          `/chat_api.php?action=poll_call_status&chat_id=${activeChatId}&call_id=${activeCallId}&last_signal_id=${lastSignalIdRef.current}`
        );
        const data = await res.json();

        if (!data.ok) return;

        const currentCall = data.call;

        if (!currentCall || currentCall.status === 'ended' || currentCall.status === 'declined' || currentCall.status === 'missed') {
          if (currentState !== 'idle') {
            setCallStateStable('ended');
            setTimeout(resetCall, 1500);
          }
          return;
        }

        setCallInfoStable(currentCall);

        const callerId = Number(currentCall.caller_id);
        const targetId = Number(currentCall.target_id);
        const otherUserId = callerId === Number(currentUserId) ? targetId : callerId;

        if (currentCall.status === 'calling') {
          if (callerId === Number(currentUserId)) {
            if (currentState !== 'calling') setCallStateStable('calling');
          } else {
            if (currentState !== 'ringing') {
              setCallStateStable('ringing');
              if (window.location.search.includes('auto_accept=1')) {
                setTimeout(() => {
                  acceptCall();
                  const newUrl = window.location.pathname + window.location.search.replace(/[?&]auto_accept=1/, '').replace(/^&/, '?') + window.location.hash;
                  window.history.replaceState(null, '', newUrl);
                }, 300);
              }
            }
          }
        } else if (currentCall.status === 'active') {
          if (currentState !== 'connected') {
            setCallStateStable('connected');

            // If I am caller and pc not created yet, create Offer
            if (callerId === Number(currentUserId) && !pcRef.current) {
              const pc = await initPeerConnection(otherUserId, currentCall.id);
              if (pc) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                await fetch('/chat_api.php?action=send_call_signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    call_id: currentCall.id,
                    receiver_id: otherUserId,
                    type: 'offer',
                    payload: JSON.stringify(offer),
                  }),
                });
              } else {
                endCall();
              }
            }
          }

          if (!durationTimerRef.current) {
            setCallDurationSec(0);
            durationTimerRef.current = setInterval(() => {
              setCallDurationSec((prev) => prev + 1);
            }, 1000);
          }
        }

        // Process new incoming signals
        if (Array.isArray(data.signals) && data.signals.length > 0) {
          for (const sig of data.signals) {
            lastSignalIdRef.current = Math.max(lastSignalIdRef.current, Number(sig.id));
            await processSignal(sig, currentCall.id, otherUserId);
          }
        }
      } catch (e) {
        console.error('Call polling error', e);
      }
    };

    // Poll immediately, then every 1500ms — fixed interval, no restart on state changes
    poll();
    callPollIntervalRef.current = setInterval(poll, 1000);

    return () => {
      if (callPollIntervalRef.current) {
        clearInterval(callPollIntervalRef.current);
        callPollIntervalRef.current = null;
      }
    };
  }, [chatId, currentUserId, resetCall, initPeerConnection, processSignal, setCallStateStable, setCallInfoStable]);

  // Clean up component unmount completely to avoid mic remaining on
  useEffect(() => {
    return () => {
      cleanupWebRtc();
    };
  }, [cleanupWebRtc]);

  // Start outgoing call
  const startCall = async (targetUserId = 0, defaultDisplayName = '', customChatId = 0) => {
    if (callStateRef.current !== 'idle') return; // already in a call

    const activeChatId = customChatId || chatId || 0;

    pendingStartRef.current = true;
    setCallStateStable('calling');
    setCallInfoStable({
      id: 0,
      chat_id: activeChatId,
      caller_id: currentUserId,
      target_id: targetUserId,
      target_name: defaultDisplayName,
      status: 'calling',
    });

    try {
      const res = await fetch('/chat_api.php?action=start_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: activeChatId, target_id: targetUserId }),
      });
      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        console.error('startCall response JSON parse failed', rawText);
      }

      if (data && data.ok) {
        setCallInfoStable((prev) => ({
          ...(prev || {}),
          id: data.call_id,
          target_id: data.target_id,
          chat_id: data.chat_id || activeChatId,
        }));
      } else {
        alert(data?.error || 'Զանգը չհաջողվեց սկսել');
        resetCall();
        return;
      }
    } catch (e) {
      console.error('startCall exception:', e);
      alert('Զանգի սխալ: Խնդրում ենք ստուգել կապը');
      resetCall();
      return;
    } finally {
      pendingStartRef.current = false;
    }

    // Acquire microphone stream in background asynchronously (non-blocking)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (micErr) {
        console.warn('Microphone permission request warning:', micErr);
      }
    }
  };

  // End active or outgoing call
  const endCall = useCallback(async () => {
    const info = callInfoRef.current;
    if (!info) return;
    try {
      await fetch('/chat_api.php?action=end_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: info.id }),
      });
    } catch (e) {
      console.error(e);
    }
    setCallStateStable('ended');
    setTimeout(resetCall, 1000);
  }, [resetCall, setCallStateStable]);

  // Accept incoming call
  const acceptCall = async () => {
    const info = callInfoRef.current;
    if (!info) return;

    // First acquire mic stream BEFORE accepting, if we fail to acquire mic, we decline it
    let pc = pcRef.current;
    if (!pc) {
      const otherUserId = Number(info.caller_id) === Number(currentUserId) ? Number(info.target_id) : Number(info.caller_id);
      pc = await initPeerConnection(otherUserId, info.id);
      if (!pc) {
        declineCall();
        return;
      }
    }

    try {
      const res = await fetch('/chat_api.php?action=respond_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: info.id, response: 'accept' }),
      });
      const data = await res.json();
      if (data.ok) {
        setCallStateStable('connected');
      }
    } catch (e) {
      console.error(e);
      endCall();
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    const info = callInfoRef.current;
    if (!info) return;
    try {
      await fetch('/chat_api.php?action=respond_call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: info.id, response: 'decline' }),
      });
      setCallStateStable('ended');
      setTimeout(resetCall, 1000);
    } catch (e) {
      console.error(e);
      resetCall();
    }
  };



  // Toggle Mute / Unmute microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isMuted;
        audioTracks[0].enabled = !nextState;
        setIsMuted(nextState);
      }
    }
  };

  let callDisplayName = 'Անհայտ օգտատեր';
  if (callInfo) {
    if (Number(callInfo.caller_id) === Number(currentUserId)) {
      // I am the caller -> show target name
      callDisplayName = callInfo.target_name || callInfo.target_email || callInfo.caller_name || 'Օգտատեր';
    } else {
      // I am the receiver -> show caller name
      callDisplayName = callInfo.caller_name || callInfo.caller_email || 'Օգտատեր';
    }
  }

  return {
    callState,
    callInfo,
    callDisplayName,
    isMuted,
    callDurationSec,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
}
