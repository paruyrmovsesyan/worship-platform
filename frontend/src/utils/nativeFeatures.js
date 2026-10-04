import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

/**
 * Universal Share helper:
 * - In Native App (iOS/Android): uses Capacitor Native Share Sheet
 * - In Web / PWA: falls back to navigator.share or clipboard copy
 */
export async function nativeShare({ title, text, url, dialogTitle }) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: title || 'Worship Platform',
        text: text || '',
        url: url || '',
        dialogTitle: dialogTitle || 'Կիսվել'
      });
      return true;
    } catch (err) {
      if (err?.message?.includes('canceled') || err?.name === 'AbortError') {
        return false;
      }
      console.warn('Native share error, falling back:', err);
    }
  }

  // Web / PWA fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') return false;
    }
  }

  // Clipboard fallback if share not supported
  if (url && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {}
  }

  return false;
}

/**
 * Universal Haptics / Vibration helper:
 * - In Native App (iOS/Android): uses Taptic Engine / system vibrator
 * - In Web / PWA: uses navigator.vibrate
 */
export function triggerHaptic(style = 'light') {
  if (Capacitor.isNativePlatform()) {
    try {
      if (style === 'medium') {
        Haptics.impact({ style: ImpactStyle.Medium });
      } else if (style === 'heavy') {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (style === 'success') {
        Haptics.notification({ type: NotificationType.Success });
      } else if (style === 'warning') {
        Haptics.notification({ type: NotificationType.Warning });
      } else {
        Haptics.impact({ style: ImpactStyle.Light });
      }
      return;
    } catch {}
  }

  // PWA / Browser vibration fallback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      const duration = style === 'heavy' ? 30 : style === 'medium' ? 20 : 12;
      navigator.vibrate(duration);
    } catch {}
  }
}

/**
 * Configure native Status Bar theme (dark / light)
 */
export async function updateNativeStatusBar(isDark = true) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });
  } catch {}
}

/**
 * Setup Android Hardware Back Button listener
 */
export function setupAndroidBackButton(onBack) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => {};

  const handle = CapApp.addListener('backButton', (data) => {
    if (onBack) {
      onBack(data);
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    }
  });

  return () => {
    handle.then(h => h.remove()).catch(() => {});
  };
}
