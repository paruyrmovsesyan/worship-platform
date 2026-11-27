import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerHaptic = (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {});
  }
};

export const triggerSelectionHaptic = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.selectionChanged().catch(() => {});
  }
};

export const triggerSuccessHaptic = () => {
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }
};
