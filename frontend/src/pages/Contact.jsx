import React from 'react';
import { useIsPWA } from '../hooks/useIsPWA';
import SupportContactApp from './SupportContactApp';
import ContactWeb from './ContactWeb';

export default function Contact() {
  const isPWA = useIsPWA();

  if (isPWA) {
    return <SupportContactApp initialTab="contact" />;
  }

  return <ContactWeb />;
}
