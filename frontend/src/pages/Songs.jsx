import React, { Suspense } from 'react';
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SongsListSkeleton } from '../components/NativeSkeletons';

const SongsApp = lazyWithRetry(() => import('./SongsApp'), 'SongsApp');
const SongsWeb = lazyWithRetry(() => import('./SongsWeb'), 'SongsWeb');

export default function Songs() {
  const isAppMode = useIsAppMode();
  const isNativeApp = useIsNativeApp();

  return (
    <Suspense fallback={isNativeApp ? <SongsListSkeleton /> : null}>
      {isAppMode ? <SongsApp /> : <SongsWeb />}
    </Suspense>
  );
}
