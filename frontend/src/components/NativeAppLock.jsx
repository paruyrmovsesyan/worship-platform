import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { getBiometricStatus, isBiometricLoginEnabled, performBiometricLogin } from '../utils/biometricAuth';

const LOCK_AFTER_BACKGROUND_MS = 30_000;

export default function NativeAppLock() {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [label, setLabel] = useState('Biometrics');
  const [error, setError] = useState('');
  const backgroundedAtRef = useRef(0);

  const unlock = useCallback(async () => {
    if (unlocking) return;
    setUnlocking(true);
    setError('');
    try {
      await performBiometricLogin(`Բացեք Worship Platform-ը ${label}-ով`);
      setLocked(false);
      backgroundedAtRef.current = 0;
    } catch (unlockError) {
      const message = String(unlockError?.message || '');
      if (!/cancel|userCancel/i.test(message)) {
        setError('Չհաջողվեց հաստատել ինքնությունը։ Փորձեք կրկին։');
      }
    } finally {
      setUnlocking(false);
    }
  }, [label, unlocking]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return undefined;

    let cancelled = false;
    let appStateHandle;

    const configure = async () => {
      const [status, enabled] = await Promise.all([
        getBiometricStatus(),
        isBiometricLoginEnabled(),
      ]);
      if (cancelled || !status.available || !enabled) return;
      setLabel(status.label || 'Biometrics');

      appStateHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          backgroundedAtRef.current = Date.now();
          return;
        }

        if (backgroundedAtRef.current > 0 && Date.now() - backgroundedAtRef.current >= LOCK_AFTER_BACKGROUND_MS) {
          setLocked(true);
        }
      });
    };

    configure().catch(() => {});
    return () => {
      cancelled = true;
      appStateHandle?.remove?.();
    };
  }, [user]);

  if (!Capacitor.isNativePlatform() || !user || !locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Հավելվածը կողպված է"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#05050A',
        color: '#fff',
      }}
    >
      <div style={{ width: 'min(100%, 370px)', textAlign: 'center' }}>
        <div style={{
          width: 108, height: 108, margin: '0 auto -22px', borderRadius: 34,
          display: 'grid', placeItems: 'center',
          background: 'radial-gradient(circle at 50% 35%,rgba(0,240,255,.22),rgba(78,63,255,.14) 55%,rgba(255,255,255,.025))',
          border: '1px solid rgba(73,226,255,.28)', boxShadow: '0 0 45px rgba(0,212,255,.14)',
        }} aria-hidden="true">
          <svg viewBox="0 0 64 64" width="58" height="58" fill="none" stroke="#55eaff" strokeWidth="2.6" strokeLinecap="round">
            <path d="M19 8H12a4 4 0 0 0-4 4v7M45 8h7a4 4 0 0 1 4 4v7M56 45v7a4 4 0 0 1-4 4h-7M19 56h-7a4 4 0 0 1-4-4v-7" />
            <path d="M23 27h.01M41 27h.01M24 40c5 4 11 4 16 0" />
          </svg>
        </div>
        <div style={{
          position: 'relative', width: 54, height: 54, margin: '0 auto 18px', borderRadius: '50%',
          display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#5a43ff,#00caed)',
          border: '4px solid #05050a', fontSize: 20, fontWeight: 800,
        }}>
          {String(user?.name || user?.email || 'W').trim().charAt(0).toUpperCase()}
        </div>
        <span style={{ color: '#62eaff', fontSize: 10, fontWeight: 800, letterSpacing: '.18em' }}>ՊՐՈՖԻԼԻ ՊԱՇՏՊԱՆՈՒԹՅՈՒՆ</span>
        <h2 style={{ margin: '10px 0 8px', fontSize: 29 }}>Հաստատեք ինքնությունը</h2>
        <p style={{ color: 'rgba(226,228,247,.68)', lineHeight: 1.55, fontSize: 14, margin: '0 0 20px' }}>
          Շարունակելու և ձեր պրոֆիլ մուտք գործելու համար օգտագործեք {label}-ը։
        </p>
        <div style={{
          padding: '14px 17px', marginBottom: 18, borderRadius: 18, textAlign: 'left',
          background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)',
        }}>
          <small style={{ color: 'rgba(255,255,255,.46)' }}>Պրոֆիլ</small>
          <strong style={{ display: 'block', marginTop: 4, fontSize: 14 }}>{user?.email || user?.name || 'Worship Platform'}</strong>
        </div>
        {error ? <p style={{ color: '#ff9d9d', fontSize: 13 }}>{error}</p> : null}
        <button
          type="button"
          onClick={unlock}
          disabled={unlocking}
          style={{
            width: '100%',
            minHeight: '50px',
            border: 0,
            borderRadius: '17px',
            background: 'linear-gradient(125deg,#5148ff,#00ccea)',
            color: '#fff',
            fontWeight: 750,
            fontSize: '16px',
            boxShadow: '0 14px 35px rgba(0,192,235,.2)',
          }}
        >
          {unlocking ? 'Ստուգվում է…' : `Բացել ${label}-ով`}
        </button>
      </div>
    </div>
  );
}
