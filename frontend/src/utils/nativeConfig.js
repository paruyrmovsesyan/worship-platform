import { Capacitor } from '@capacitor/core';

export const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://worship.pmstudio.am'
  : '';
