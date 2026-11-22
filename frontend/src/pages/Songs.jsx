import React, { Suspense } from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const SongsApp = lazyWithRetry(() => import('./SongsApp'), 'SongsApp');
const SongsWeb = lazyWithRetry(() => import('./SongsWeb'), 'SongsWeb');

export default function Songs() {
  const isAppMode = useIsAppMode();

  return (
    <Suspense fallback={null}>
      {isAppMode ? <SongsApp /> : <SongsWeb />}
    </Suspense>
  );
}
