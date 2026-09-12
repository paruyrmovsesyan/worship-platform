import React, { useState, useEffect, useRef } from 'react';
import { useIsPWA } from '../hooks/useIsPWA';

const PullToRefresh = ({ children, onRefresh, disabled }) => {
  const isPWA = useIsPWA();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isValidPull = useRef(false);
  const hasVibratedRef = useRef(false);
  const maxPull = 90;
  const refreshThreshold = 55;

  useEffect(() => {
    if (!isPWA || disabled) return;

    const shouldIgnoreTouch = (target) => {
      if (!target) return false;
      // If user is touching setlist items, cards, drag handles, buttons, inputs, or when dragging state is active
      if (
        target.closest(
          '[data-item-id], .sla-drag-handle, .sla-song-card, .sla-section-card, .sla-item-list, [data-no-ptr], [draggable="true"], button, a, input, textarea, select'
        )
      ) {
        return true;
      }
      if (
        (typeof window !== 'undefined' && window.__wpIsDragging) ||
        document.body.classList.contains('is-touch-dragging-active') ||
        document.body.classList.contains('is-reorder-active')
      ) {
        return true;
      }
      return false;
    };

    const handleTouchStart = (e) => {
      if (window.scrollY > 0 || isRefreshing) {
        isValidPull.current = false;
        return;
      }

      if (shouldIgnoreTouch(e.target)) {
        isValidPull.current = false;
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      // Pull-to-refresh should only be triggered from the top area (< 100px from top)
      if (touch.clientY > 100) {
        isValidPull.current = false;
        return;
      }

      startY.current = touch.clientY;
      currentY.current = startY.current;
      isValidPull.current = true;
      hasVibratedRef.current = false;
    };

    const handleTouchMove = (e) => {
      if (!isValidPull.current || window.scrollY > 0 || isRefreshing) return;

      if (
        (typeof window !== 'undefined' && window.__wpIsDragging) ||
        document.body.classList.contains('is-touch-dragging-active') ||
        document.body.classList.contains('is-reorder-active')
      ) {
        isValidPull.current = false;
        setPullDistance(0);
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      currentY.current = touch.clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        const distance = Math.min(diff * 0.45, maxPull);
        setPullDistance(distance);

        if (distance >= refreshThreshold && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(12); } catch {}
          }
        } else if (distance < refreshThreshold) {
          hasVibratedRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isValidPull.current) {
        setPullDistance(0);
        return;
      }
      isValidPull.current = false;

      if (pullDistance >= refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(refreshThreshold);
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
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPWA, pullDistance, isRefreshing, disabled]);

  if (!isPWA || disabled) {
    return <>{children}</>;
  }

  const isPastThreshold = pullDistance >= refreshThreshold;
  const progress = Math.min(pullDistance / refreshThreshold, 1);

  // Position nicely below safe area / notch, sliding down smoothly
  const spinnerStyle = {
    position: 'fixed',
    top: 'calc(var(--safe-top, 0px) + 12px)',
    left: '50%',
    transform: `translate(-50%, ${Math.min(pullDistance, 70) - 56}px)`,
    width: '42px',
    height: '42px',
    background: 'rgba(15, 23, 42, 0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    boxShadow: isPastThreshold
      ? '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 212, 255, 0.45)'
      : '0 6px 18px rgba(0, 0, 0, 0.4), 0 0 10px rgba(0, 212, 255, 0.15)',
    border: `1.5px solid ${isPastThreshold ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)'}`,
    transition: isRefreshing || pullDistance === 0 ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease' : 'border-color 0.15s ease, box-shadow 0.15s ease',
    opacity: pullDistance > 8 ? Math.min((pullDistance - 8) / (refreshThreshold - 8), 1) : 0,
    pointerEvents: 'none'
  };

  const svgStyle = {
    width: '20px',
    height: '20px',
    color: isPastThreshold ? '#00d4ff' : '#7dd3fc',
    transform: isRefreshing ? 'none' : `rotate(${progress * 280}deg)`,
    transition: isRefreshing ? 'none' : 'color 0.15s ease',
    animation: isRefreshing ? 'ptr-spin 0.75s linear infinite' : 'none'
  };

  return (
    <>
      {pullDistance > 0 && (
        <div style={spinnerStyle} aria-hidden="true">
          <svg style={svgStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-1.42"/>
          </svg>
        </div>
      )}
      <style>
        {`
          @keyframes ptr-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {children}
    </>
  );
};

export default PullToRefresh;
