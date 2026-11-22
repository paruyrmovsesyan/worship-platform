import React, { Suspense } from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const SetlistsApp = lazyWithRetry(() => import('./SetlistsApp'), 'SetlistsApp');
const SetlistsWeb = lazyWithRetry(() => import('./SetlistsWeb'), 'SetlistsWeb');

export default function Setlists() {
  const isAppMode = useIsAppMode();

  return (
    <Suspense fallback={null}>
      {isAppMode ? <SetlistsApp /> : <SetlistsWeb />}
    </Suspense>
  );
}
