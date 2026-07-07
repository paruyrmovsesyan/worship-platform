import React, { useState, useEffect, useRef } from 'react';
import { useIsPWA } from '../hooks/useIsPWA';

const PullToRefresh = ({ children, onRefresh, disabled }) => {
  const isPWA = useIsPWA();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const maxPull = 100;
  const refreshThreshold = 60;

  useEffect(() => {
    // Only apply in PWA mode to avoid interfering with native browser behavior
    if (!isPWA || disabled) return;

    const handleTouchStart = (e) => {
      // Only allow pull if we are at the very top of the page
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
    };

    const handleTouchMove = (e) => {
      if (window.scrollY > 0 || isRefreshing) return;
      
      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        // User is pulling down
        // Optional: e.preventDefault() here might be needed to stop native overscroll,
        // but iOS safari doesn't allow preventing default on passive listeners easily.
        // We'll just calculate visual distance.
        const distance = Math.min(diff * 0.5, maxPull); // 0.5 friction
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        // Snap to refresh threshold
        setPullDistance(refreshThreshold);
        // Trigger reload or onRefresh after a short delay so user sees the spinner spinning
        setTimeout(() => {
          if (onRefresh) {
            onRefresh();
            setIsRefreshing(false);
            setPullDistance(0);
          } else {
            window.location.reload();
          }
        }, 500);
      } else {
        // Not pulled enough, snap back
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPWA, pullDistance, isRefreshing, disabled]);

  if (!isPWA || disabled) {
    return <>{children}</>;
  }

  const spinnerStyle = {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: `translate(-50%, ${pullDistance - 50}px)`,
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none',
    opacity: pullDistance > 0 ? Math.min(pullDistance / refreshThreshold, 1) : 0,
    pointerEvents: 'none'
  };

  const svgStyle = {
    width: '24px',
    height: '24px',
    color: '#00d4ff',
    transform: `rotate(${pullDistance * 3}deg)`,
    transition: isRefreshing ? 'transform 0.5s linear infinite' : 'none',
    animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
  };

  return (
    <>
      {pullDistance > 0 && (
        <div style={spinnerStyle}>
          <svg style={svgStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-1.42"/>
          </svg>
        </div>
      )}
      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {children}
    </>
  );
};

export default PullToRefresh;
