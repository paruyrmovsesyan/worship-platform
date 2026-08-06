import React, { useEffect } from 'react';
import { usePageLoading } from './context/PageLoadingContext';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

const LegacySongRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) {
    return <Navigate to={`/song/${id}`} replace />;
  }
  return <Navigate to="/songs" replace />;
};

import MobileNav from './components/MobileNav';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Songs from './pages/Songs';
import SongView from './pages/SongView';
import Setlists from './pages/Setlists';
import SetlistEditor from './pages/SetlistEditor';
import SetlistLive from './pages/SetlistLive';
import SetlistPublicWeb from './pages/SetlistPublicWeb';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';
import News from './pages/News';
import NewsArticle from './pages/NewsArticle';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Community from './pages/Community';
import Resources from './pages/Resources';
import Contact from './pages/Contact';
import About from './pages/About';
import Blog from './pages/Blog';
import Careers from './pages/Careers';
import Documentation from './pages/Documentation';
import Tutorials from './pages/Tutorials';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import Forbidden from './pages/Forbidden';
import ErrorBoundary from './components/ErrorBoundary';
import Support from './pages/Support';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SongRequest from './pages/SongRequest';
import Notifications from './pages/Notifications';
import ChatsList from './pages/ChatsList';
import TransposeTool from './pages/TransposeTool';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useIsPWA } from './hooks/useIsPWA';
import ScrollToTop from './components/ScrollToTop';
import TopLoader from './components/TopLoader';
import PullToRefresh from './components/PullToRefresh';
import { usePwaOfflineGuard } from './hooks/usePwaOfflineGuard';
import { usePwaSwipeNavigation } from './hooks/usePwaSwipeNavigation';
import { showPwaOfflineBlockedNotice } from './utils/pwaOfflineGuard';
import { useLanguage } from './context/LanguageContext';
import { applyAppTheme, getStoredAppTheme } from './utils/appTheme';
import WebCommandPalette from './components/WebCommandPalette';

function App() {
  const mediaQueryMatch = useMediaQuery('(max-width: 900px)');
  const isIOSMobile = /iPhone|iPod/.test(navigator.userAgent);
  
  // Apply Global App Settings
  useEffect(() => {
    const theme = applyAppTheme(getStoredAppTheme(), { persist: false });
    if (localStorage.getItem('reduceMotion') === 'true') document.body.classList.add('reduce-motion');
    if (theme === 'dark' && localStorage.getItem('oledMode') === 'true') document.body.classList.add('oled-mode');
    if (localStorage.getItem('outlinedChords') === 'true') document.body.classList.add('outlined-chords');
    
    const cColor = localStorage.getItem('chordColor');
    if (cColor && cColor !== 'gold') {
      document.body.classList.add(`chord-color-${cColor}`);
    }
  }, []);
  const isMobile = mediaQueryMatch || isIOSMobile;
  const isPWA = useIsPWA();
  const { isOffline, canAccessPath } = usePwaOfflineGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const transitionRef = React.useRef(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [rememberPromptOpen, setRememberPromptOpen] = React.useState(false);
  const [rememberPromptSaving, setRememberPromptSaving] = React.useState(false);
  const [rememberPromptError, setRememberPromptError] = React.useState('');
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    document.body.classList.remove('mobile-theme', 'app-desktop-theme', 'website-theme', 'is-pwa');
    
    if (isPWA) {
      document.body.classList.add('is-pwa');
      if (isMobile) {
        document.body.classList.add('mobile-theme');
      } else {
        document.body.classList.add('app-desktop-theme');
      }
    } else {
      document.body.classList.add('website-theme');
      if (isMobile) {
        document.body.classList.add('mobile-theme');
      }
    }
  }, [isMobile, isPWA]);

  useEffect(() => {
    const syncThemeColor = () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;

      const storedTheme = localStorage.getItem('theme');
      const isLight = document.documentElement.dataset.theme === 'light' ||
        document.body.classList.contains('light-mode') ||
        storedTheme === 'light';
      const isOled = document.body.classList.contains('oled-mode') || localStorage.getItem('oledMode') === 'true';
      const color = isLight ? '#F7F8FC' : (isOled ? '#000000' : '#05050A');

      meta.setAttribute('content', color);
      document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
    };

    syncThemeColor();
    const observer = new MutationObserver(syncThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', syncThemeColor);
    window.addEventListener('wp-theme-change', syncThemeColor);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncThemeColor);
      window.removeEventListener('wp-theme-change', syncThemeColor);
    };
  }, []);

  // Listen for push notification navigation from service worker
  useEffect(() => {
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'PUSH_NAVIGATE' && event.data.path) {
        navigate(event.data.path);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, [navigate]);

  useEffect(() => {
    if (!isPWA || !isOffline) return;
    if (canAccessPath(location.pathname)) return;

    showPwaOfflineBlockedNotice();
    navigate('/', { replace: true });
  }, [isPWA, isOffline, location.pathname, canAccessPath, navigate]);

  const clearSessionLoginPromptParam = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('session_login')) return;
    params.delete('session_login');
    const nextUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash || ''}`;
    navigate(nextUrl, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (transitionRef.current) {
      transitionRef.current.classList.remove('route-animate');
      void transitionRef.current.offsetWidth;
      transitionRef.current.classList.add('route-animate');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(location.search);
    const shouldPromptRemember = params.get('session_login') === '1';

    if (!shouldPromptRemember) {
      if (rememberPromptOpen) {
        setRememberPromptOpen(false);
      }
      return;
    }

    if (user) {
      setRememberPromptError('');
      setRememberPromptOpen(true);
    }
  }, [authLoading, location.search, rememberPromptOpen, user]);

  const handleRememberPromptClose = React.useCallback(() => {
    setRememberPromptError('');
    setRememberPromptSaving(false);
    setRememberPromptOpen(false);
    clearSessionLoginPromptParam();
  }, [clearSessionLoginPromptParam]);

  const handleRememberPromptConfirm = React.useCallback(async () => {
    setRememberPromptSaving(true);
    setRememberPromptError('');
    try {
      const source = isPWA ? 'pwa' : 'web';
      const response = await fetch('/account_api.php?action=enable_remember_me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remember_me: true, source }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || t('auth.saveLoginError'));
      }

      handleRememberPromptClose();
    } catch (error) {
      setRememberPromptSaving(false);
      setRememberPromptError(error?.message || t('auth.saveLoginError'));
    }
  }, [handleRememberPromptClose, isPWA, t]);

  const handleSoftRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderNav = () => {
    const isChatPage = location.pathname.startsWith('/chat/');
    if (isPWA) {
      return isMobile ? (isChatPage ? null : <MobileNav />) : <Sidebar />;
    }
    return <Navbar />;
  };

  const { isLoading } = usePageLoading() || {};
  const isChatPage = location.pathname.startsWith('/chat/');

  usePwaSwipeNavigation({
    enabled: isPWA && isMobile && !isChatPage,
    pathname: location.pathname,
    navigate,
    canAccessPath,
    onBlocked: showPwaOfflineBlockedNotice,
    user,
  });

  return (
    <PullToRefresh onRefresh={handleSoftRefresh} disabled={isChatPage}>
    <div className={`app-container ${isPWA && !isMobile ? 'with-sidebar' : ''}`}>
      <TopLoader />
      <ScrollToTop />
      {renderNav()}
      <main
        className={isPWA && !isMobile ? 'main-with-sidebar' : ''}
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.4s ease',
          pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        <div ref={transitionRef} className="route-animate">
          <ErrorBoundary>
            <Routes key={refreshKey}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/songs" element={<Songs />} />
              <Route path="/transpose" element={<TransposeTool />} />
              <Route path="/song/:id" element={<SongView />} />
              <Route path="/setlists" element={<Setlists />} />
              <Route path="/setlists/public" element={<SetlistPublicWeb />} />
              <Route path="/setlist_public.html" element={<SetlistPublicWeb />} />
              <Route path="/setlists/:id/edit" element={<SetlistEditor />} />
              <Route path="/setlists/:id/live" element={<SetlistLive />} />
              <Route path="/setlists/:id" element={<SetlistEditor />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/chats" element={<ChatsList />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/community" element={<Community />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/tutorials" element={<Tutorials />} />
              <Route path="/support" element={<Support />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/song-request" element={<SongRequest />} />
              <Route path="/notifications" element={<Notifications />} />

              {/* Explicit Error Pages */}
              <Route path="/500" element={<ServerError />} />
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />

              {/* Legacy URL Redirects */}
              <Route path="/main.html" element={<Navigate to="/songs" replace />} />
              <Route path="/favorites.html" element={<Navigate to="/favorites" replace />} />
              <Route path="/news.html" element={<Navigate to="/news" replace />} />
              <Route path="/setlists.html" element={<Navigate to="/setlists" replace />} />
              <Route path="/account.html" element={<Navigate to="/profile" replace />} />
              <Route path="/loginuser.php" element={<Navigate to="/login" replace />} />
              <Route path="/registeruser.php" element={<Navigate to="/register" replace />} />
              <Route path="/song_view.html" element={<LegacySongRedirect />} />

              {/* Catch-all 404 Not Found Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
      {rememberPromptOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          background: 'rgba(5, 8, 18, 0.74)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: 'min(100%, 420px)',
            background: '#151622',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            boxShadow: '0 28px 70px rgba(0,0,0,0.4)',
            padding: '24px',
            color: '#fff',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.25 }}>{t('auth.saveLoginTitle')}</h3>
            <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {t('auth.saveLoginDesc')}
            </p>
            {rememberPromptError ? (
              <div style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 82, 82, 0.12)',
                color: '#ff9d9d',
                fontSize: '0.95rem',
              }}>
                {rememberPromptError}
              </div>
            ) : null}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '22px',
              flexWrap: 'wrap',
            }}>
              <button
                type="button"
                onClick={handleRememberPromptClose}
                disabled={rememberPromptSaving}
                style={{
                  minWidth: '112px',
                  height: '46px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: '#fff',
                  padding: '0 18px',
                  cursor: rememberPromptSaving ? 'default' : 'pointer',
                }}
              >
                {t('auth.saveLoginSkip')}
              </button>
              <button
                type="button"
                onClick={handleRememberPromptConfirm}
                disabled={rememberPromptSaving}
                style={{
                  minWidth: '148px',
                  height: '46px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4c4cff 0%, #23c8ff 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0 18px',
                  cursor: rememberPromptSaving ? 'default' : 'pointer',
                }}
              >
                {rememberPromptSaving ? t('auth.pleaseWait') : t('auth.saveLoginConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {isPWA ? null : <Footer />}
      {isPWA ? null : <WebCommandPalette />}
    </div>
    </PullToRefresh>
  );
}

export default App;
