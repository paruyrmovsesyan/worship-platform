import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './AudioCallModal.css';

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export default function AudioCallModal({
  callState,
  callInfo,
  callDisplayName,
  callAvatarGradient,
  isMuted,
  callDurationSec,
  connectionQuality,
  callError,
  audioOutputs,
  selectedOutputId,
  remoteAudioBlocked,
  remoteAudioRef,
  acceptCall,
  declineCall,
  endCall,
  retryConnection,
  toggleMute,
  selectAudioOutput,
  resumeRemoteAudio,
  dismissCall,
}) {
  const { t } = useLanguage();
  const [minimizedCallId, setMinimizedCallId] = useState(0);
  const statusText = callState === 'connected'
    ? formatDuration(callDurationSec)
    : t(`call.${callState}`, t('call.failed'));

  if (callState === 'idle') return null;

  const displayName = callDisplayName || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const canMinimize = ['connected', 'connecting', 'reconnecting'].includes(callState);
  const minimized = canMinimize && minimizedCallId === Number(callInfo?.id || 0);
  const canRetry = callState === 'failed' && Number(callInfo?.id || 0) > 0;
  const errorText = callError ? t(`call.errors.${callError}`, t('call.errors.default')) : '';
  const qualityText = connectionQuality === 'good'
    ? t('call.qualityGood')
    : connectionQuality === 'fair'
      ? t('call.qualityFair')
      : connectionQuality === 'poor'
        ? t('call.qualityPoor')
        : '';

  const avatarStyle = callAvatarGradient ? { background: callAvatarGradient } : undefined;

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="audio-call-remote-audio" />

      {minimized ? (
        <div className="audio-call-compact" role="status" aria-live="polite">
          <button type="button" className="audio-call-compact-main" onClick={() => setMinimizedCallId(0)} aria-label={t('call.expand')}>
            <span className="audio-call-compact-avatar" style={avatarStyle}>{initial}</span>
            <span className="audio-call-compact-copy">
              <strong>{displayName}</strong>
              <small>{statusText}</small>
            </span>
          </button>
          <button type="button" className={`audio-call-icon-button mute ${isMuted ? 'active' : ''}`} onClick={toggleMute} aria-label={isMuted ? t('call.unmute') : t('call.mute')}>
            {isMuted ? <MicOffIcon /> : <MicIcon />}
          </button>
          <button type="button" className="audio-call-icon-button end" onClick={endCall} aria-label={t('call.end')}>
            <EndCallIcon />
          </button>
        </div>
      ) : (
        <div className="audio-call-overlay" role="dialog" aria-modal="true" aria-label={statusText}>
          <div className="audio-call-card">
            {canMinimize ? (
              <button type="button" className="audio-call-minimize" onClick={() => setMinimizedCallId(Number(callInfo?.id || 0))} aria-label={t('call.minimize')}>
                <ChevronDownIcon />
              </button>
            ) : null}

            <div className="audio-call-avatar-wrap">
              <div className="audio-call-avatar" style={avatarStyle}>{initial}</div>
              {['calling', 'ringing', 'connecting', 'reconnecting'].includes(callState) ? <div className="audio-call-pulse" /> : null}
            </div>

            <div className="audio-call-title">{displayName}</div>
            <div className={`audio-call-status state-${callState}`}>{statusText}</div>

            {qualityText && callState === 'connected' ? (
              <div className={`audio-call-quality quality-${connectionQuality}`}>
                <span />{qualityText}
              </div>
            ) : null}

            {errorText ? <div className="audio-call-error" role="alert">{errorText}</div> : null}

            {remoteAudioBlocked ? (
              <button type="button" className="audio-call-resume" onClick={resumeRemoteAudio}>
                <SpeakerIcon /> {t('call.resumeAudio')}
              </button>
            ) : null}

            {audioOutputs.length > 1 ? (
              <label className="audio-call-output">
                <span>{t('call.audioOutput')}</span>
                <select value={selectedOutputId} onChange={(event) => selectAudioOutput(event.target.value)}>
                  <option value="">{t('call.defaultOutput')}</option>
                  {audioOutputs.map((device, index) => (
                    <option key={device.deviceId || `output-${index}`} value={device.deviceId}>
                      {device.label || `${t('call.defaultOutput')} ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="audio-call-actions">
              {callState === 'ringing' ? (
                <>
                  <CallActionButton kind="end" label={t('call.decline')} onClick={declineCall}><EndCallIcon /></CallActionButton>
                  <CallActionButton kind="accept" label={t('call.accept')} onClick={acceptCall}><PhoneIcon /></CallActionButton>
                </>
              ) : callState === 'failed' ? (
                <>
                  <CallActionButton kind="secondary" label={t('call.close')} onClick={canRetry ? endCall : dismissCall}><CloseIcon /></CallActionButton>
                  {canRetry ? <CallActionButton kind="retry" label={t('call.retry')} onClick={retryConnection}><RetryIcon /></CallActionButton> : null}
                </>
              ) : callState === 'ended' ? null : (
                <>
                  <CallActionButton kind={`mute ${isMuted ? 'active' : ''}`} label={isMuted ? t('call.unmute') : t('call.mute')} onClick={toggleMute}>
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                  </CallActionButton>
                  <CallActionButton kind="end" label={t('call.end')} onClick={endCall}><EndCallIcon /></CallActionButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CallActionButton({ kind, label, onClick, children }) {
  return (
    <div className="audio-call-action-wrap">
      <button type="button" className={`btn-call-action ${kind}`} onClick={onClick} aria-label={label}>{children}</button>
      <span>{label}</span>
    </div>
  );
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
}

function EndCallIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 15.5c4.8-4 10.2-4 15 0" /><path d="M6.5 14 4 17l2.5 2.5M17.5 14 20 17l-2.5 2.5" /></svg>;
}

function MicIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg>;
}

function MicOffIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6M17 17A7 7 0 0 1 5 12v-2M19 10v2c0 .5-.1 1-.2 1.5M12 19v3M8 22h8" /></svg>;
}

function RetryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.6-2.6L20 11M4 13l2.3 4.6A7 7 0 0 0 18 15" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function SpeakerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" /></svg>;
}
