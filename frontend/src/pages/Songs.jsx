import React from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import SongsApp from './SongsApp';
import SongsWeb from './SongsWeb';

export default function Songs() {
  const isAppMode = useIsAppMode();
  
  if (isAppMode) {
    return <SongsApp />;
  }
  
  return <SongsWeb />;
}
