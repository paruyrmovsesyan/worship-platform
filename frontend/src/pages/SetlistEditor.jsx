import React, { Suspense } from 'react';
import { useIsAppMode, useIsNativeApp } from '../hooks/useIsPWA';
import { useAuth } from '../context/AuthContext';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { SetlistEditorSkeleton } from '../components/NativeSkeletons';

const SetlistEditorApp = lazyWithRetry(() => import('./SetlistEditorApp'), 'SetlistEditorApp');
const SetlistEditorWeb = lazyWithRetry(() => import('./SetlistEditorWeb'), 'SetlistEditorWeb');
const SetlistPublicWeb = lazyWithRetry(() => import('./SetlistPublicWeb'), 'SetlistPublicWeb');

export default function SetlistEditor() {
  const isAppMode = useIsAppMode();
  const isNativeApp = useIsNativeApp();
  const { user, loading: authLoading } = useAuth();

  if (isAppMode) {
    return (
      <Suspense fallback={isNativeApp ? <SetlistEditorSkeleton /> : null}>
        <SetlistEditorApp />
      </Suspense>
    );
  }

  if (!authLoading && !user) {
    return (
      <Suspense fallback={null}>
        <SetlistPublicWeb />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <SetlistEditorWeb />
    </Suspense>
  );
}
