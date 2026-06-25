import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onFinish }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash for 1.5 seconds, then fade out for 0.5s
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onFinish();
      }, 500); // 500ms fade duration
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fading ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <img 
          src="/user_uploaded_logo.png" 
          alt="Worship Platform Logo" 
          className="splash-logo" 
          onError={(e) => { e.target.src = '/icon-512-v4.png'; }} 
        />
        <div className="splash-spinner"></div>
      </div>
    </div>
  );
}
