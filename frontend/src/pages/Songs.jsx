import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import SongsApp from './SongsApp';
import SongsWeb from './SongsWeb';

export default function Songs() {
  const isPWA = useIsPWA();
  
  if (isPWA) {
    return <SongsApp />;
  }
  
  return <SongsWeb />;
}
