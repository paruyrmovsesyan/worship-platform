import React from 'react';
import './NativeRouteLoader.css';

export default function NativeRouteLoader({ refreshing = false }) {
  return (
    <div
      className={`native-route-loader${refreshing ? ' is-visible is-refreshing' : ''}`}
      aria-hidden={!refreshing}
      aria-live="polite"
    >
      <div className="native-route-loader__card" role="status">
        <div className="native-route-loader__mark" aria-hidden="true">
          <span />
        </div>
        <span className="native-route-loader__label">Թարմացվում է…</span>
      </div>
    </div>
  );
}
