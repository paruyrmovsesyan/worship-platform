import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import { useAuth } from '../context/AuthContext';
import SetlistEditorApp from './SetlistEditorApp';
import SetlistEditorWeb from './SetlistEditorWeb';
import SetlistPublicWeb from './SetlistPublicWeb';

export default function SetlistEditor() {
  const isPWA = useIsPWA();
  const { user, loading: authLoading } = useAuth();

  if (isPWA) {
    return <SetlistEditorApp />;
  }

  if (!authLoading && !user) {
    return <SetlistPublicWeb />;
  }

  return <SetlistEditorWeb />;
}
