import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const BIOMETRIC_CREDENTIALS_KEY = 'wp_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'wp_biometric_enabled';

/**
 * Checks if device hardware supports biometric authentication (Face ID / Touch ID / Fingerprint)
 * and whether biometry is enrolled.
 */
export async function getBiometricStatus() {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, biometryType: 'none', label: '' };
  }

  try {
    const result = await BiometricAuth.checkBiometry();
    const isFaceId = result.biometryType === BiometryType.faceId || result.biometryType === BiometryType.faceAuthentication;
    const isTouchId = result.biometryType === BiometryType.touchId || result.biometryType === BiometryType.fingerprintAuthentication;
    
    let label = 'Biometrics';
    if (isFaceId) label = 'Face ID';
    else if (isTouchId) label = 'Touch ID / Fingerprint';

    return {
      available: Boolean(result.isAvailable),
      biometryType: isFaceId ? 'faceId' : isTouchId ? 'touchId' : 'other',
      label,
    };
  } catch (err) {
    console.warn('Biometric status check failed:', err);
    return { available: false, biometryType: 'none', label: '' };
  }
}

/**
 * Checks if user has previously saved credentials for biometric login.
 */
export async function isBiometricLoginEnabled() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { value: enabled } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    if (enabled !== 'true') return false;
    const { value: creds } = await Preferences.get({ key: BIOMETRIC_CREDENTIALS_KEY });
    return Boolean(creds);
  } catch {
    return false;
  }
}

/**
 * Saves login credentials for biometric quick login upon successful manual login.
 */
export async function saveBiometricCredentials(login, password) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Preferences.set({
      key: BIOMETRIC_CREDENTIALS_KEY,
      value: JSON.stringify({ login, password }),
    });
    await Preferences.set({
      key: BIOMETRIC_ENABLED_KEY,
      value: 'true',
    });
  } catch (err) {
    console.warn('Failed to save biometric credentials:', err);
  }
}

/**
 * Checks if user has stored credentials on device.
 */
export async function hasSavedBiometricCredentials() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { value: creds } = await Preferences.get({ key: BIOMETRIC_CREDENTIALS_KEY });
    return Boolean(creds);
  } catch {
    return false;
  }
}

/**
 * Toggles biometric login on or off.
 */
export async function setBiometricEnabled(enabled) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Preferences.set({
      key: BIOMETRIC_ENABLED_KEY,
      value: enabled ? 'true' : 'false',
    });
  } catch (err) {
    console.warn('Failed to set biometric enabled:', err);
  }
}

/**
 * Clears saved biometric credentials (e.g. on full logout or disabled setting).
 */
export async function clearBiometricCredentials() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Preferences.remove({ key: BIOMETRIC_CREDENTIALS_KEY });
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
  } catch (err) {}
}

/**
 * Prompts user for biometric auth (Face ID / Touch ID) and returns saved credentials on success.
 */
export async function performBiometricLogin(reason = 'Մուտք գործելու համար հաստատեք ձեր ինքնությունը') {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Biometrics only available on native mobile platforms');
  }

  // 1. Prompt system Face ID / Touch ID
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Չեղարկել',
    allowDeviceCredential: true,
  });

  // 2. Retrieve credentials
  const { value } = await Preferences.get({ key: BIOMETRIC_CREDENTIALS_KEY });
  if (!value) {
    throw new Error('Պահպանված մուտքի տվյալներ չեն գտնվել');
  }

  return JSON.parse(value);
}
