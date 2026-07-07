export function isPwaOfflineRouteAllowed(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/';

  if (path === '/' || path === '/songs' || path === '/favorites' || path === '/news') {
    return true;
  }

  if (path.startsWith('/song/')) {
    return true;
  }

  return false;
}

export function getPwaOfflineBlockedMessage() {
  return 'Այս բաժինը օֆֆլայն ռեժիմում հասանելի չէ։ Միացրեք ինտերնետը՝ շարունակելու համար։';
}

export function showPwaOfflineBlockedNotice(message = getPwaOfflineBlockedMessage()) {
  if (window.WP && typeof window.WP.showOfflineBlockedNotice === 'function') {
    window.WP.showOfflineBlockedNotice(message);
    return;
  }

  if (window.WP && typeof window.WP.showNotice === 'function') {
    window.WP.showNotice(message, true);
    return;
  }

  window.alert(message);
}
