import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import SetlistEditorApp from './SetlistEditorApp';
import SetlistEditorWeb from './SetlistEditorWeb';

export default function SetlistEditor() {
  const isPWA = useIsPWA();

  if (isPWA) {
    return <SetlistEditorApp />;
  }

  return <SetlistEditorWeb />;
}
