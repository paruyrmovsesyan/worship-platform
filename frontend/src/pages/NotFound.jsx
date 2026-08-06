import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './ErrorPages.css';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  usePageReady(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/songs?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="error-page-wrapper animate-fade-in">
      <div className="error-card">
        <div className="error-hero-glow" />
        <div className="error-badge glitch-text">404 ERROR</div>
        
        <h1 className="error-title">Էջը Չի Գտնվել</h1>
        <p className="error-subtitle">
          Ցավոք, Ձեր փնտրած էջը չի գտնվել, ջնջվել է կամ փոխվել է դրա հասցեն:
        </p>

        {/* QUICK SEARCH */}
        <form className="error-search-box" onSubmit={handleSearch}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('landing.searchPlaceholder', 'Փնտրել երգեր, ակորդներ, կատարողներ...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-error-search">Որոնել</button>
        </form>

        {/* HELPFUL QUICK LINKS */}
        <div className="error-actions">
          <button className="btn-error primary" onClick={() => navigate('/')}>
            🏠 {t('nav.home', 'Գլխավոր Էջ')}
          </button>
          <button className="btn-error secondary" onClick={() => navigate('/songs')}>
            🎵 {t('nav.songs', 'Երգացանկ')}
          </button>
          <button className="btn-error secondary" onClick={() => navigate('/contact')}>
            💬 {t('nav.contact', 'Կապ')}
          </button>
        </div>

        <div className="error-footer-links">
          <span>Հաճախ այցելվող էջեր՝ </span>
          <Link to="/setlists">Երգացանկեր</Link> • <Link to="/favorites">Նախընտրածներ</Link> • <Link to="/news">Նորություններ</Link>
        </div>
      </div>
    </div>
  );
}
