import React from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import SupportContactApp from './SupportContactApp';
import SupportWeb from './SupportWeb';

export default function Support() {
  const isAppMode = useIsAppMode();

  if (isAppMode) {
    return <SupportContactApp initialTab="faq" />;
  }

  return <SupportWeb />;
}
