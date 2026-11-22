import React, { Suspense } from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('./LandingPage'), 'LandingPage');
const MobileHub = lazyWithRetry(() => import('./MobileHub'), 'MobileHub');

export default function Home() {
  const isAppMode = useIsAppMode();

  return (
    <Suspense fallback={null}>
      {isAppMode ? <MobileHub /> : <LandingPage />}
    </Suspense>
  );
}
