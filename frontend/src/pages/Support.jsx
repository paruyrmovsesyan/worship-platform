import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import SupportContactApp from './SupportContactApp';
import SupportWeb from './SupportWeb';

export default function Support() {
  const isPWA = useIsPWA();

  if (isPWA) {
    return <SupportContactApp initialTab="faq" />;
  }

  return <SupportWeb />;
}
