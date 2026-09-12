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
  const maxPull = 120;
  const refreshThreshold = 85;

  useEffect(() => {
    if (!isPWA || disabled) return;

    const shouldIgnoreTouch = (target) => {
      if (!target) return false;
      // Do not allow pull-to-refresh if touching dedicated drag handles, buttons, modals, or form inputs
      if (target.closest('.sla-drag-handle, [data-drag-handle], input, textarea, select, audio, video, button, .modal, [role="dialog"]')) {
        return true;
      }
      // Do not allow pull-to-refresh if currently dragging or in reorder mode
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
        // Deep pull friction: requiring deep downward swipe to trigger refresh
        const distance = Math.min(diff * 0.45, maxPull);
        setPullDistance(distance);

        if (distance >= refreshThreshold && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(18); } catch {}
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
            setTimeout(() => {
              setIsRefreshing(false);
              setPullDistance(0);
            }, 300);
          } else {
            window.location.reload();
          }
        }, 600);
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
  const isVisible = pullDistance > 0 || isRefreshing;

  // Base position starts safely below the notch / Dynamic Island and status bar
  // On iPhone 14 Pro / 15 / 16 safe-area-inset-top is ~54-59px.
  // Adding + 16px ensures the base is at ~70-75px, always below hardware cutouts.
  const translateY = isRefreshing
    ? 48
    : (pullDistance > 0 ? Math.min(pullDistance * 0.62, 54) : -40);

  const scale = isRefreshing ? 1 : (isPastThreshold ? 1.08 : Math.max(0.65, 0.65 + progress * 0.35));

  const spinnerStyle = {
    position: 'fixed',
    top: 'calc(max(24px, env(safe-area-inset-top, 24px)) + 16px)',
    left: '50%',
    transform: `translate(-50%, ${translateY}px) scale(${scale})`,
    width: '46px',
    height: '46px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2147483647,
    boxShadow: isPastThreshold
      ? '0 14px 34px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 212, 255, 0.6)'
      : '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 212, 255, 0.25)',
    border: `2px solid ${isPastThreshold ? '#00d4ff' : 'rgba(56, 189, 248, 0.45)'}`,
    transition: isRefreshing || pullDistance === 0
      ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, border-color 0.2s ease, box-shadow 0.2s ease'
      : 'border-color 0.15s ease, box-shadow 0.15s ease',
    opacity: isRefreshing ? 1 : (pullDistance > 0 ? Math.min(pullDistance / 24, 1) : 0),
    pointerEvents: 'none'
  };

  const svgStyle = {
    width: '22px',
    height: '22px',
    color: isPastThreshold ? '#00d4ff' : '#38bdf8',
    transform: isRefreshing ? 'none' : `rotate(${progress * 280}deg)`,
    transition: isRefreshing ? 'none' : 'color 0.15s ease',
    animation: isRefreshing ? 'ptr-spin 0.75s linear infinite' : 'none'
  };

  return (
    <>
      {isVisible && (
        <div style={spinnerStyle} aria-hidden="true">
          <svg style={svgStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
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
