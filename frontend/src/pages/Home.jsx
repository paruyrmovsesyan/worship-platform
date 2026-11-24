import { Suspense } from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { RouteSkeletonFallback } from '../components/NativeSkeletons';
import MobileHub from './MobileHub';

const LandingPage = lazyWithRetry(() => import('./LandingPage'), 'LandingPage');

export default function Home() {
  const isAppMode = useIsAppMode();

  if (isAppMode) {
    return <MobileHub />;
  }

  return (
    <Suspense fallback={<RouteSkeletonFallback pathname="/" />}>
      <LandingPage />
    </Suspense>
  );
}
