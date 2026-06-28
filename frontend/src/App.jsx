import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

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
import { useAuth } from './context/AuthContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useIsPWA } from './hooks/useIsPWA';
import ScrollToTop from './components/ScrollToTop';
import TopLoader from './components/TopLoader';

// Lazy-loaded pages — each page loads only when navigated to
const Home         = lazy(() => import('./pages/Home'));
const Songs        = lazy(() => import('./pages/Songs'));
const SongView     = lazy(() => import('./pages/SongView'));
const Setlists     = lazy(() => import('./pages/Setlists'));
const SetlistEditor= lazy(() => import('./pages/SetlistEditor'));
const Favorites    = lazy(() => import('./pages/Favorites'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const News         = lazy(() => import('./pages/News'));
const Teams        = lazy(() => import('./pages/Teams'));
const TeamView     = lazy(() => import('./pages/TeamView'));
const Community    = lazy(() => import('./pages/Community'));
const Resources    = lazy(() => import('./pages/Resources'));
const Contact      = lazy(() => import('./pages/Contact'));
const About        = lazy(() => import('./pages/About'));
const Blog         = lazy(() => import('./pages/Blog'));
const Careers      = lazy(() => import('./pages/Careers'));
const Documentation= lazy(() => import('./pages/Documentation'));
const Tutorials    = lazy(() => import('./pages/Tutorials'));
const Support      = lazy(() => import('./pages/Support'));
const Privacy      = lazy(() => import('./pages/Privacy'));
const Terms        = lazy(() => import('./pages/Terms'));
const Cookies      = lazy(() => import('./pages/Cookies'));
const Profile      = lazy(() => import('./pages/Profile'));
const Settings     = lazy(() => import('./pages/Settings'));
const SongRequest  = lazy(() => import('./pages/SongRequest'));
const Notifications= lazy(() => import('./pages/Notifications'));

function App() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const isPWA = useIsPWA();

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

  const renderNav = () => {
    if (isPWA) {
      return isMobile ? <MobileNav /> : <Sidebar />;
    }
    return <Navbar />;
  };

  return (
    <div className={`app-container ${isPWA && !isMobile ? 'with-sidebar' : ''}`}>
      <TopLoader />
      <ScrollToTop />
      {renderNav()}
      <main className={isPWA && !isMobile ? 'main-with-sidebar' : ''}>
        <Suspense fallback={<TopLoader forcedVisible />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/song/:id" element={<SongView />} />
            <Route path="/setlists" element={<Setlists />} />
            <Route path="/setlists/:id" element={<SetlistEditor />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/news" element={<News />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamView />} />
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

            {/* Legacy URL Redirects */}
            <Route path="/main.html" element={<Navigate to="/songs" replace />} />
            <Route path="/favorites.html" element={<Navigate to="/favorites" replace />} />
            <Route path="/news.html" element={<Navigate to="/news" replace />} />
            <Route path="/setlists.html" element={<Navigate to="/setlists" replace />} />
            <Route path="/account.html" element={<Navigate to="/profile" replace />} />
            <Route path="/song_view.html" element={<LegacySongRedirect />} />
          </Routes>
        </Suspense>
      </main>
      {isPWA && isMobile ? null : <Footer />}
    </div>
  );
}

export default App;
