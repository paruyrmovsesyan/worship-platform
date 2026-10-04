import React from 'react';
import { useIsAppMode } from '../hooks/useIsPWA';
import SupportContactApp from './SupportContactApp';
import ContactWeb from './ContactWeb';

export default function Contact() {
  const isAppMode = useIsAppMode();

  if (isAppMode) {
    return <SupportContactApp initialTab="contact" />;
  }

  return <ContactWeb />;
}
