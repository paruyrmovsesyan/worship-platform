import React from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import { useAuth } from '../context/AuthContext';
import SetlistEditorApp from './SetlistEditorApp';
import SetlistEditorWeb from './SetlistEditorWeb';
import SetlistPublicWeb from './SetlistPublicWeb';

export default function SetlistEditor() {
  const isAppMode = useIsAppMode();
  const { user, loading: authLoading } = useAuth();

  if (isAppMode) {
    return <SetlistEditorApp />;
  }

  if (!authLoading && !user) {
    return <SetlistPublicWeb />;
  }

  return <SetlistEditorWeb />;
}
