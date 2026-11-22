import { Suspense } from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import MobileHub from './MobileHub';

const LandingPage = lazyWithRetry(() => import('./LandingPage'), 'LandingPage');

export default function Home() {
  const isAppMode = useIsAppMode();

  if (isAppMode) {
    return <MobileHub />;
  }

  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
