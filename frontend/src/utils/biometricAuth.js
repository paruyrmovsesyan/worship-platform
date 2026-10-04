import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const LEGACY_BIOMETRIC_CREDENTIALS_KEY = 'wp_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'wp_biometric_enabled';
const BIOMETRIC_ACCOUNT_KEY = 'wp_biometric_account';
const BIOMETRIC_TOKEN_KEY = 'wp_biometric_token';

async function removeLegacyPassword() {
  await Preferences.remove({ key: LEGACY_BIOMETRIC_CREDENTIALS_KEY });
}

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
 * Checks whether biometric session unlock is enabled for this device.
 */
export async function isBiometricLoginEnabled() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { value: enabled } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    if (enabled !== 'true') return false;
    await removeLegacyPassword();
    const [{ value: account }, { value: token }] = await Promise.all([
      Preferences.get({ key: BIOMETRIC_ACCOUNT_KEY }),
      Preferences.get({ key: BIOMETRIC_TOKEN_KEY }),
    ]);
    return Boolean(account && token);
  } catch {
    return false;
  }
}

/**
 * Records the account associated with the native session. Passwords are never stored.
 */
export async function saveBiometricCredentials(login, token = '') {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await removeLegacyPassword();
    await Preferences.set({
      key: BIOMETRIC_ACCOUNT_KEY,
      value: String(login || ''),
    });
    if (token) {
      await Preferences.set({ key: BIOMETRIC_TOKEN_KEY, value: String(token) });
      await setBiometricEnabled(true);
    }
  } catch (err) {
    console.warn('Failed to save biometric credentials:', err);
  }
}

/**
 * Checks if a native account has been associated with biometric unlock.
 */
export async function hasSavedBiometricCredentials() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await removeLegacyPassword();
    const [{ value: account }, { value: token }] = await Promise.all([
      Preferences.get({ key: BIOMETRIC_ACCOUNT_KEY }),
      Preferences.get({ key: BIOMETRIC_TOKEN_KEY }),
    ]);
    return Boolean(account && token);
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

export async function registerBiometricLogin(account = '') {
  if (!Capacitor.isNativePlatform()) return false;
  const response = await fetch('/native_biometric_api.php?action=issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ account: String(account || '') }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.token) {
    throw new Error(data?.error || 'Biometric մուտքը չհաջողվեց կարգավորել');
  }
  await saveBiometricCredentials(data.account || account, data.token);
  return true;
}

/**
 * Clears the biometric account association and any legacy stored password.
 */
export async function clearBiometricCredentials() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await removeLegacyPassword();
    await Preferences.remove({ key: BIOMETRIC_ACCOUNT_KEY });
    await Preferences.remove({ key: BIOMETRIC_TOKEN_KEY });
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY });
  } catch {
    // Best-effort cleanup for device-local state.
  }
}

/**
 * Prompts for biometric auth and exchanges the device's revocable token for
 * a fresh server session. Passwords are never persisted on the device.
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

  await removeLegacyPassword();
  const [{ value: account }, { value: token }] = await Promise.all([
    Preferences.get({ key: BIOMETRIC_ACCOUNT_KEY }),
    Preferences.get({ key: BIOMETRIC_TOKEN_KEY }),
  ]);
  if (!account || !token) {
    throw new Error('Այս սարքում biometric մուտքը կարգավորված չէ');
  }

  const response = await fetch('/native_biometric_api.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ token }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.user) {
    if (response.status === 401) await clearBiometricCredentials();
    throw new Error(data?.error || 'Face ID մուտքը չհաջողվեց');
  }

  if (data.token && data.token !== token) {
    await Preferences.set({ key: BIOMETRIC_TOKEN_KEY, value: data.token });
  }
  return { authenticated: true, account, user: data.user };
}
