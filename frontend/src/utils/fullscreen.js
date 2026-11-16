/**
 * Cross-browser Fullscreen API helpers.
 * Safely guards platforms (e.g. iOS Safari / iOS PWA / WKWebView) where
 * document.documentElement.requestFullscreen is undefined or non-Promise.
 */

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

export function isFullscreenSupported(element = null) {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;
  if (!target) return false;

  const hasRequestMethod = Boolean(
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.mozRequestFullScreen ||
    target.msRequestFullscreen
  );
  if (!hasRequestMethod) return false;

  if (document.fullscreenEnabled === false || document.webkitFullscreenEnabled === false) {
    return false;
  }
  return true;
}

export async function enterFullscreen(element = null) {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;
  if (!target || !isFullscreenSupported(target)) return false;

  const requestFn =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.mozRequestFullScreen ||
    target.msRequestFullscreen;

  if (typeof requestFn !== 'function') return false;

  try {
    await Promise.resolve(requestFn.call(target));
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  if (typeof document === 'undefined') return false;
  if (!getFullscreenElement()) return true;

  const exitFn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;

  if (typeof exitFn !== 'function') return false;

  try {
    await Promise.resolve(exitFn.call(document));
    return true;
  } catch {
    return false;
  }
}

export function addFullscreenChangeListener(listener) {
  if (typeof document === 'undefined' || typeof listener !== 'function') {
    return () => {};
  }
  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];
  events.forEach((eventName) => document.addEventListener(eventName, listener));
  return () => {
    events.forEach((eventName) => document.removeEventListener(eventName, listener));
  };
}
