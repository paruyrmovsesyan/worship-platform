import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import FavoritesApp from './FavoritesApp';
import FavoritesWeb from './FavoritesWeb';

export default function Favorites() {
  const isPWA = useIsPWA();

  if (isPWA) {
    return <FavoritesApp />;
  }

  return <FavoritesWeb />;
}
