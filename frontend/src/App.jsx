import React, { useEffect } from 'react';
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
import Home from './pages/Home';
import Songs from './pages/Songs';
import SongView from './pages/SongView';
import Setlists from './pages/Setlists';
import SetlistEditor from './pages/SetlistEditor';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';
import News from './pages/News';
import Teams from './pages/Teams';
import TeamView from './pages/TeamView';
import Community from './pages/Community';
import Pricing from './pages/Pricing';
import Resources from './pages/Resources';
import Contact from './pages/Contact';
import About from './pages/About';
import Blog from './pages/Blog';
import Careers from './pages/Careers';
import Documentation from './pages/Documentation';
import Tutorials from './pages/Tutorials';
import Support from './pages/Support';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SongRequest from './pages/SongRequest';
import Notifications from './pages/Notifications';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useIsPWA } from './hooks/useIsPWA';
import ScrollToTop from './components/ScrollToTop';

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
        document.body.classList.add('mobile-theme'); // Still mobile size, but maybe website styling
      }
    }
  }, [isMobile, isPWA]);

  const renderNav = () => {
    if (isPWA) {
      return isMobile ? <MobileNav /> : <Sidebar />;
    }
    // Website uses Navbar (which is now fully responsive)
    return <Navbar />;
  };

  return (
    <div className={`app-container ${isPWA && !isMobile ? 'with-sidebar' : ''}`}>
      <ScrollToTop />
      {renderNav()}
      <main className={isPWA && !isMobile ? 'main-with-sidebar' : ''}>
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
          <Route path="/pricing" element={<Pricing />} />
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
      </main>
      {isPWA && isMobile ? null : <Footer />}
    </div>
  );
}

export default App;
