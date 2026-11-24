import React, { Suspense } from 'react';
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SetlistsAppSkeleton } from '../components/NativeSkeletons';

const SetlistsApp = lazyWithRetry(() => import('./SetlistsApp'), 'SetlistsApp');
const SetlistsWeb = lazyWithRetry(() => import('./SetlistsWeb'), 'SetlistsWeb');

export default function Setlists() {
  const isAppMode = useIsAppMode();
  const isNativeApp = useIsNativeApp();

  return (
    <Suspense fallback={<SetlistsAppSkeleton />}>
      {isAppMode ? <SetlistsApp /> : <SetlistsWeb />}
    </Suspense>
  );
}
