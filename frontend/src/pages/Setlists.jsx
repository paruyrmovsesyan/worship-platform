import React from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import SetlistsApp from './SetlistsApp';
import SetlistsWeb from './SetlistsWeb';

export default function Setlists() {
  const isAppMode = useIsAppMode();

  if (isAppMode) {
    return <SetlistsApp />;
  }

  return <SetlistsWeb />;
}
