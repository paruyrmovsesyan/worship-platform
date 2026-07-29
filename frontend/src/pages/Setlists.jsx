import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import SetlistsApp from './SetlistsApp';
import SetlistsWeb from './SetlistsWeb';

export default function Setlists() {
  const isPWA = useIsPWA();

  if (isPWA) {
    return <SetlistsApp />;
  }

  return <SetlistsWeb />;
}
