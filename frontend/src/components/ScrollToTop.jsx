import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/songs') {
      try {
        if (sessionStorage.getItem('songs_app_restore_pending') === '1') return;
      } catch {}
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
