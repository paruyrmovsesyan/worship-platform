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
import Home from './pages/Home';
import Songs from './pages/Songs';
import SongView from './pages/SongView';
import Setlists from './pages/Setlists';
import SetlistEditor from './pages/SetlistEditor';
import Favorites from './pages/Favorites';
import News from './pages/News';
import Teams from './pages/Teams';
import TeamView from './pages/TeamView';
import Community from './pages/Community';
import Pricing from './pages/Pricing';
import Resources from './pages/Resources';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SongRequest from './pages/SongRequest';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useIsPWA } from './hooks/useIsPWA';

function App() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const isPWA = useIsPWA();

  useEffect(() => {
    document.body.classList.remove('mobile-theme', 'app-desktop-theme', 'website-theme');
    
    if (isPWA) {
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
      {renderNav()}
      <main className={isPWA && !isMobile ? 'main-with-sidebar' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/song-request" element={<SongRequest />} />

          {/* Legacy URL Redirects */}
          <Route path="/main.html" element={<Navigate to="/songs" replace />} />
          <Route path="/favorites.html" element={<Navigate to="/favorites" replace />} />
          <Route path="/news.html" element={<Navigate to="/news" replace />} />
          <Route path="/setlists.html" element={<Navigate to="/setlists" replace />} />
          <Route path="/account.html" element={<Navigate to="/profile" replace />} />
          <Route path="/song_view.html" element={<LegacySongRedirect />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
