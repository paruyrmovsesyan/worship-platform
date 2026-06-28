import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopLoader() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 400); // Quick 400ms flash to feel like a real load

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 15, 19, 0.6)', /* Darkened background */
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        transition: 'opacity 0.2s ease-out',
        animation: 'fadeIn 0.2s ease-in'
      }}
    >
      <div className="premium-spinner-container">
        <div className="premium-spinner-ring1"></div>
        <div className="premium-spinner-ring2"></div>
      </div>
    </div>
  );
}
