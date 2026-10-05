import React, { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './NativeRouteLoader.css';

const TRANSITION_DURATION_MS = 480;

export default function NativeRouteLoader({ refreshing = false }) {
  const location = useLocation();
  const firstRender = useRef(true);
  const timerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }

    window.clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [location.key]);

  const isVisible = visible || refreshing;

  return (
    <div
      className={`native-route-loader${isVisible ? ' is-visible' : ''}${refreshing ? ' is-refreshing' : ''}`}
      aria-hidden={!isVisible}
      aria-live="polite"
    >
      <div className="native-route-loader__card" role="status">
        <div className="native-route-loader__mark" aria-hidden="true">
          <span />
        </div>
        <span className="native-route-loader__label">{refreshing ? 'Թարմացվում է…' : 'Բացվում է…'}</span>
      </div>
    </div>
  );
}
