import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import './NativeAudioCallSurface.css';

function durationLabel(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Icon({ name }) {
  const paths = {
    phone: <path d="M6.6 2.9 9 8.1 6.9 10c1.5 3 4 5.5 7.1 7.1l1.9-2.1 5.2 2.4v3.1c0 .9-.7 1.6-1.6 1.6C9.8 22.1 1.9 14.2 1.9 4.5c0-.9.7-1.6 1.6-1.6h3.1Z" />,
    end: <path d="M3 16.4 1.6 13.8C4.5 11.3 8 10 12 10s7.5 1.3 10.4 3.8L21 16.4l-4.4-1.6v-2a14 14 0 0 0-9.2 0v2L3 16.4Z" />,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    micOff: <><path d="m3 3 18 18M9.5 4.2A3 3 0 0 1 15 6v4.5M15 13.8A3 3 0 0 1 9 12V8.5M5 10v2a7 7 0 0 0 11.9 5M19 10v2c0 1-.2 2-.6 2.8M12 19v3M8 22h8" /></>,
    speaker: <><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
    earpiece: <><path d="M7 4h10M8 7h8v10H8zM7 20h10" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    retry: <path d="M20 7v5h-5M4 17v-5h5M6.1 8A7 7 0 0 1 18.5 6M17.9 16A7 7 0 0 1 5.5 18" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Control({ icon, label, tone = '', active = false, onClick, disabled = false }) {
  return (
    <button type="button" className={`native-call-control ${tone} ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled}>
      <span><Icon name={icon} /></span>
      <small>{label}</small>
    </button>
  );
}

export default function NativeAudioCallSurface(props) {
  const { t } = useLanguage();
  const [minimized, setMinimized] = useState(false);
  const {
    callState, callInfo, callDisplayName, callAvatarGradient, isMuted, isSpeakerOn,
    callDurationSec, connectionQuality, callError, remoteAudioBlocked, remoteAudioRef,
    acceptCall, declineCall, endCall, retryConnection, toggleMute, toggleSpeaker,
    resumeRemoteAudio, dismissCall,
  } = props;

  const name = callDisplayName || 'Օգտատեր';
  const connected = callState === 'connected';
  const canMinimize = ['connected', 'connecting', 'reconnecting'].includes(callState);
  const status = connected ? durationLabel(callDurationSec) : t(`call.${callState}`, t('call.failed'));
  const error = callError ? t(`call.errors.${callError}`, t('call.errors.default')) : '';
  const canRetry = callState === 'failed' && Number(callInfo?.id || 0) > 0;

  useEffect(() => {
    const handleNativeBack = () => {
      if (canMinimize) setMinimized(true);
    };
    window.addEventListener('wp-native-back-request', handleNativeBack);
    return () => window.removeEventListener('wp-native-back-request', handleNativeBack);
  }, [canMinimize]);

  if (!callState || callState === 'idle') return null;

  const content = (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="native-call-audio" />
      {minimized && canMinimize ? (
        <aside className="native-call-mini">
          <button type="button" className="native-call-mini-main" onClick={() => setMinimized(false)}>
            <span className="native-call-mini-avatar" style={callAvatarGradient ? { background: callAvatarGradient } : undefined}>{name[0]?.toUpperCase()}</span>
            <span><strong>{name}</strong><small>{status}</small></span>
          </button>
          <button type="button" className={isMuted ? 'active' : ''} onClick={toggleMute}><Icon name={isMuted ? 'micOff' : 'mic'} /></button>
          <button type="button" className="danger" onClick={endCall}><Icon name="end" /></button>
        </aside>
      ) : (
        <main className={`native-call-screen state-${callState}`} role="dialog" aria-modal="true">
          <div className="native-call-glow" />
          <header>
            <span className="native-call-secure">Worship Platform · Audio</span>
            {canMinimize ? <button type="button" onClick={() => setMinimized(true)} aria-label={t('call.minimize')}><Icon name="down" /></button> : <span />}
          </header>

          <section className="native-call-person">
            <div className="native-call-avatar-shell">
              <div className="native-call-avatar" style={callAvatarGradient ? { background: callAvatarGradient } : undefined}>{name[0]?.toUpperCase()}</div>
              {!connected && callState !== 'failed' ? <i /> : null}
            </div>
            <h1>{name}</h1>
            <p>{status}</p>
            {connected && connectionQuality !== 'unknown' ? <em className={`quality-${connectionQuality}`}>{t(`call.quality${connectionQuality[0].toUpperCase()}${connectionQuality.slice(1)}`)}</em> : null}
          </section>

          <section className="native-call-bottom">
            {error ? <div className="native-call-error">{error}</div> : null}
            {remoteAudioBlocked ? <button type="button" className="native-call-resume" onClick={resumeRemoteAudio}>{t('call.resumeAudio')}</button> : null}

            {callState === 'ringing' ? (
              <div className="native-call-incoming-actions">
                <Control icon="end" label={t('call.decline')} tone="danger" onClick={declineCall} />
                <Control icon="phone" label={t('call.accept')} tone="accept" onClick={acceptCall} />
              </div>
            ) : callState === 'failed' ? (
              <div className="native-call-incoming-actions">
                <Control icon="end" label={t('call.close')} tone="neutral" onClick={canRetry ? endCall : dismissCall} />
                {canRetry ? <Control icon="retry" label={t('call.retry')} tone="accept" onClick={retryConnection} /> : null}
              </div>
            ) : callState === 'ended' ? null : (
              <div className="native-call-controls">
                <Control icon={isMuted ? 'micOff' : 'mic'} label={isMuted ? t('call.unmute') : t('call.mute')} active={isMuted} onClick={toggleMute} />
                <Control icon={isSpeakerOn ? 'speaker' : 'earpiece'} label={isSpeakerOn ? t('call.speaker') : t('call.speakerOff')} active={isSpeakerOn} onClick={toggleSpeaker} />
                <Control icon="end" label={t('call.end')} tone="danger" onClick={endCall} />
              </div>
            )}
          </section>
        </main>
      )}
    </>
  );
  return createPortal(content, document.body);
}
