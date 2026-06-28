import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopLoader({ forcedVisible = false }) {
  const [loading, setLoading] = useState(forcedVisible);
  const location = useLocation();

  useEffect(() => {
    if (forcedVisible) return; // Controlled externally by Suspense

    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [location.pathname, forcedVisible]);

  if (!loading && !forcedVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 15, 19, 0.6)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.15s ease-in',
      }}
    >
      <div className="premium-spinner-container">
        <div className="premium-spinner-ring1"></div>
        <div className="premium-spinner-ring2"></div>
      </div>
    </div>
  );
}
