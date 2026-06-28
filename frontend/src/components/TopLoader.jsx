import React from 'react';
import { usePageLoading } from '../context/PageLoadingContext';

export default function TopLoader() {
  const ctx = usePageLoading();
  if (!ctx || !ctx.isLoading) return null;

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
