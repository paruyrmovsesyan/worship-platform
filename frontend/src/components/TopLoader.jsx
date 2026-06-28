import React, { useState, useEffect } from 'react';
import { usePageLoading } from '../context/PageLoadingContext';

export default function TopLoader() {
  const ctx = usePageLoading();
  const isLoading = ctx?.isLoading ?? false;

  // Keep the loader visible briefly after loading ends so it fades out smoothly
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      requestAnimationFrame(() => setOpacity(1));
    } else {
      setOpacity(0);
      const timer = setTimeout(() => setVisible(false), 350); // wait for fade-out to finish
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 15, 19, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        opacity: opacity,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div className="premium-spinner-container">
        <div className="premium-spinner-ring1"></div>
        <div className="premium-spinner-ring2"></div>
      </div>
    </div>
  );
}
