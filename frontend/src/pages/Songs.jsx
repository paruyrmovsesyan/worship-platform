import React, { Suspense } from 'react';
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SongsPageSkeleton } from '../components/NativeSkeletons';

const SongsApp = lazyWithRetry(() => import('./SongsApp'), 'SongsApp');
const SongsWeb = lazyWithRetry(() => import('./SongsWeb'), 'SongsWeb');

export default function Songs() {
  const isAppMode = useIsAppMode();
  const isNativeApp = useIsNativeApp();

  return (
    <Suspense fallback={<SongsPageSkeleton />}>
      {isAppMode ? <SongsApp /> : <SongsWeb />}
    </Suspense>
  );
}
