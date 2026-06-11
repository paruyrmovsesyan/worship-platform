import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MobileNav.css';

export default function MobileNav() {
  const location = useLocation();
  const { user, login } = useAuth();

  if (location.pathname.startsWith('/song/')) return null;

  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Գլխավոր</span>
      </NavLink>
      
      <NavLink to="/songs" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>Երգեր</span>
      </NavLink>
      
      <NavLink to="/setlists" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <span>Երգացանկ</span>
      </NavLink>

      {user ? (
        <NavLink to="/profile" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Պրոֆիլ</span>
        </NavLink>
      ) : (
        <button className="nav-item" onClick={login} style={{background: 'transparent', border: 'none', color: 'inherit'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          <span>Մուտք</span>
        </button>
      )}
    </nav>
  );
}
