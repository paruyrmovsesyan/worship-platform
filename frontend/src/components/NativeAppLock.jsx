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
      <div style={{ width: 'min(100%, 360px)', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '18px' }} aria-hidden="true">🔐</div>
        <h2 style={{ margin: 0 }}>Worship Platform-ը կողպված է</h2>
        <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
          Շարունակելու համար հաստատեք ինքնությունը {label}-ով։
        </p>
        {error ? <p style={{ color: '#ff9d9d' }}>{error}</p> : null}
        <button
          type="button"
          onClick={unlock}
          disabled={unlocking}
          style={{
            width: '100%',
            minHeight: '50px',
            border: 0,
            borderRadius: '16px',
            background: 'linear-gradient(135deg,#4c4cff,#23c8ff)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
          }}
        >
          {unlocking ? 'Ստուգվում է…' : `Բացել ${label}-ով`}
        </button>
      </div>
    </div>
  );
}
