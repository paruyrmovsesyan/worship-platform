export function isPwaOfflineRouteAllowed(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/';

  if (
    path === '/' ||
    path === '/songs' ||
    path === '/transpose' ||
    path === '/favorites' ||
    path === '/news' ||
    path === '/setlists' ||
    path === '/chats' ||
    path === '/friends' ||
    path === '/support' ||
    path === '/profile' ||
    path === '/settings' ||
    path === '/account' ||
    path === '/notifications' ||
    path === '/contact'
  ) {
    return true;
  }

  if (path.startsWith('/song/') || path.startsWith('/chat/')) {
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
