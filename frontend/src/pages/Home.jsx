import React from 'react';
import LandingPage from './LandingPage';
import MobileHub from './MobileHub';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useIsPWA } from '../hooks/useIsPWA';

export default function Home() {
  const isPWA = useIsPWA();
  const isMobile = useMediaQuery('(max-width: 900px)');

  // For PWA (App Mode), show the Hub/Dashboard
  // For Website Mode, always show the Landing Page (which is responsive)
  return (
    <>
      {isPWA ? (
        <MobileHub /> // Currently works well for mobile, later we can add a Desktop Dashboard here
      ) : (
        <LandingPage />
      )}
    </>
  );
}
