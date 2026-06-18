import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LandingPage.css';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [allSongs, setAllSongs] = useState([]);
  const [popularSongs, setPopularSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [songPage, setSongPage] = useState(0); // 0 = first 9, 1 = next 9, etc.
  const contentRef = useRef(null);
  const SONGS_PER_PAGE = 9;

  const mapSong = (song, index) => {
    let tags = [];
    if (song.tags) tags = song.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2);
    if (tags.length === 0) tags = ['Worship'];
    return { id: song.id, title: song.title || t('landing.unknownArtist'), artist: song.artist && song.artist !== 'Unknown' ? song.artist : t('landing.unknownArtist'), key: song.song_key || '?', bpm: song.bpm, tags, img: `bg-gradient-${(index % 9) + 1}` };
  };

  useEffect(() => {
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllSongs(data);
          setPopularSongs(data.slice(0, SONGS_PER_PAGE).map(mapSong));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const goToPage = (dir) => {
    const totalPages = Math.ceil(allSongs.length / SONGS_PER_PAGE);
    const newPage = (songPage + dir + totalPages) % totalPages;
    setSongPage(newPage);
    const start = newPage * SONGS_PER_PAGE;
    setPopularSongs(allSongs.slice(start, start + SONGS_PER_PAGE).map((s, i) => mapSong(s, start + i)));
  };

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Ambient BG */}
      <div className="rich-ambient-bg">
        <div className="glow-orb purple" />
        <div className="glow-orb cyan" />
      </div>

      {/* ── HERO ── */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            {t('landing.heroTitle1')}<br/>
            <span className="text-gradient-cyan">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="hero-subtitle">{t('landing.heroSubtitle')}</p>
          <div className="hero-actions">
            <button className="btn-start" onClick={() => window.location.href = '/registeruser.php?next=/'} style={{ minWidth: '160px' }}>
              {t('landing.startBtn')}
            </button>
            <button className="btn-demo" onClick={scrollToContent}>  
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {t('landing.watchDemo')}
            </button>
          </div>
        </div>

        {/* 3D Mockup */}
        <div className="hero-mockup-wrapper">
          <div className="mockup-3d">
            <div className="mockup-inner">
              <div className="mockup-header">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="mockup-body">
                <div className="m-left">
                  <div className="m-bar long" />
                  <div className="m-bar short" />
                  <div className="m-bar med" />
                  <div className="m-bar long" />
                  <div className="m-bar short" />
                </div>
                <div className="m-right">
                  <div className="m-top-panel" />
                  <div className="m-bottom-panel" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID: Left = Songs, Right = Sidebar ── */}
      <div className="main-grid" ref={contentRef}>

        {/* LEFT: Popular Songs */}
        <div>
          <div className="section-header">
            <h2>{t('landing.popularSongs')} <span style={{ fontSize: '0.75rem', color: '#5A5A70', fontWeight: 400 }}>page {songPage + 1}/{Math.max(1, Math.ceil(allSongs.length / SONGS_PER_PAGE))}</span></h2>
            <div className="nav-arrows">
              <button className="arrow-btn" onClick={() => goToPage(-1)} title="Previous">‹</button>
              <button className="arrow-btn" onClick={() => goToPage(1)} title="Next">›</button>
            </div>
          </div>

          {loading ? (
            <div className="loading-songs">Loading songs…</div>
          ) : (
            <div className="popular-grid">
              {popularSongs.map(song => (
                <div
                  key={song.id}
                  className="song-card"
                  onClick={() => navigate(`/song/${song.id}`)}
                >
                  <div className={`song-cover ${song.img}`}>
                    {song.title}
                  </div>
                  <div className="song-info">
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                    <div className="song-meta">
                      <span>Key {song.key}</span>
                      {song.bpm && song.bpm !== '0' && <span>BPM {song.bpm}</span>}
                    </div>
                    <div className="song-tags">
                      {song.tags.map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Filter Nav + Community Picks */}
        <div className="col-sidebar">

          {/* Filter nav */}
          <div>
            <div className="section-header">
              <h2>{t('landing.browse')}</h2>
            </div>
            <nav className="sidebar-filter-nav">
              <Link to="/songs" className="active">{t('landing.browseSongs')}</Link>
              <Link to="/songs">{t('landing.browseArtists')}</Link>
              <Link to="/setlists">{t('landing.browseCollections')}</Link>
              <Link to="/songs">{t('landing.browseByKey')}</Link>
              <Link to="/songs">{t('landing.browseByBPM')}</Link>
            </nav>
          </div>

          {/* Community Picks */}
          <div>
            <div className="section-header">
              <h2>{t('landing.communityPicks')}</h2>
              <div className="nav-arrows">
                <button className="arrow-btn">‹</button>
                <button className="arrow-btn">›</button>
              </div>
            </div>
            <div className="picks-list">
              {(t('landing.picks', { returnObjects: true }) || []).map((pick, i) => (
                <div key={i} className="pick-card" onClick={() => navigate('/songs')}>
                  <div className={`pick-img bg-gradient-${(i * 2) + 1}`} />
                  <div className="pick-info">
                    <h4>{pick.title}</h4>
                    <p>{pick.artist}</p>
                    <div className="pick-meta">{pick.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── LATEST NEWS ── */}
      <div className="latest-news-section">
        <div className="section-header">
        <h2>{t('landing.latestNews')}</h2>
          <div className="nav-arrows">
            <button className="arrow-btn">‹</button>
            <button className="arrow-btn">›</button>
          </div>
        </div>
        <div className="news-row">
          {(t('landing.newsItems', { returnObjects: true }) || []).map((item, i) => (
            <div key={i} className="news-card" onClick={() => navigate('/news')}>
              <div className={`news-img img-${i + 1}`} />
              <div className="news-content">
                <span className="news-date">{item.date}</span>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER MOVED TO APP.JSX */}
    </div>
  );
}
