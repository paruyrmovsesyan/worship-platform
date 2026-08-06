import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LandingPage.css';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import { usePageReady } from '../hooks/usePageReady';
import { fallbackNews, getCachedNewsList, fetchNewsList, formatNewsDate, formatNewsVersion, getNewsImageUrl } from '../utils/news';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [allSongs, setAllSongs] = useState([]);
  const [popularSongs, setPopularSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsItems, setNewsItems] = useState(() => getCachedNewsList(language));
  usePageReady(loading);
  const [songPage, setSongPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState('songs');
  const [showVideo, setShowVideo] = useState(false);
  const contentRef = useRef(null);
  const SONGS_PER_PAGE = 9;

  useEffect(() => {
    let cancelled = false;
    fetchNewsList({ language, limit: 6 })
      .then(items => {
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setNewsItems(items);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [language]);

  const mapSong = (song, index) => {
    let tags = [];
    if (song.tags) tags = song.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2);
    if (tags.length === 0) tags = ['Worship'];
    return { id: song.id, title: getLocalizedTitle(song, language) || t('landing.unknownArtist'), artist: song.artist && song.artist !== 'Unknown' ? song.artist : t('landing.unknownArtist'), key: song.song_key || '?', bpm: song.bpm, tags, img: `bg-gradient-${(index % 9) + 1}` };
  };

  const [customHero, setCustomHero] = useState(null);

  useEffect(() => {
    fetch('/api.php?action=site_config')
      .then(res => res.json())
      .then(data => {
        if (data?.ok) setCustomHero(data);
      })
      .catch(() => {});
  }, []);

  const [realPopularSongs, setRealPopularSongs] = useState([]);

  useEffect(() => {
    // Fetch real popular songs based on stats (views, favorites, setlists)
    fetch('/api.php?action=popular')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRealPopularSongs(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // 1. Instant hydration from localStorage cache
    try {
      const cached = localStorage.getItem('wp_songs_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllSongs(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2. Fetch fresh data from API
    fetch('/api.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllSongs(data);
          try {
            localStorage.setItem('wp_songs_cache', JSON.stringify(data));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (allSongs.length === 0 && realPopularSongs.length === 0) return;
    
    let sorted = [];
    if (activeFilter === 'songs' || activeFilter === 'popular') {
      sorted = realPopularSongs.length > 0 ? [...realPopularSongs] : [...allSongs];
    } else if (activeFilter === 'artists') {
      sorted = [...allSongs].sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    } else if (activeFilter === 'key') {
      sorted = [...allSongs].sort((a, b) => (a.song_key || '').localeCompare(b.song_key || ''));
    } else if (activeFilter === 'bpm') {
      sorted = [...allSongs].sort((a, b) => (parseInt(a.bpm) || 0) - (parseInt(b.bpm) || 0));
    } else if (activeFilter === 'collections') {
      sorted = [...allSongs].sort((a, b) => (a.tags || '').localeCompare(b.tags || ''));
    } else {
      sorted = realPopularSongs.length > 0 ? [...realPopularSongs] : [...allSongs];
    }
    
    const start = songPage * SONGS_PER_PAGE;
    setPopularSongs(sorted.slice(start, start + SONGS_PER_PAGE).map((s, i) => mapSong(s, start + i)));
  }, [activeFilter, allSongs, realPopularSongs, songPage]);

  const goToPage = (dir) => {
    const totalPages = Math.ceil(allSongs.length / SONGS_PER_PAGE);
    const newPage = (songPage + dir + totalPages) % totalPages;
    setSongPage(newPage);
  };

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setFilter = (event, filter) => {
    event.preventDefault();
    setActiveFilter(filter);
    setSongPage(0);
  };

  const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-stage-light" aria-hidden="true" />
        <div className="hero-content">
          <h1 className="hero-title">
            {customHero?.hero_title1 || t('landing.heroTitle1')}<br />
            <span>{customHero?.hero_title2 || t('landing.heroTitle2')}</span>
          </h1>
          <p className="hero-subtitle">{customHero?.hero_subtitle || t('landing.heroSubtitle')}</p>
          <div className="hero-actions">
            <button className="btn-start" onClick={() => navigate('/register')}>
              <span>{t('landing.startBtn')}</span> <ArrowIcon />
            </button>
            <button className="btn-demo" onClick={() => setShowVideo(true)}>
              <span className="demo-play">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </span>
              <span>{t('landing.watchDemo')}</span>
            </button>
          </div>
          <button className="hero-scroll-link" onClick={scrollToContent}>
            <span>{t('landing.popularSongs')}</span>
            <span aria-hidden="true">↓</span>
          </button>
        </div>

        <div className="hero-mockup-wrapper" aria-label="Worship Platform workspace preview">
          <div className="workspace-preview">
            <div className="workspace-topbar">
              <div className="workspace-brand-mark"><i /><i /><i /></div>
              <span>Sunday Worship</span>
              <div className="workspace-actions"><i /><i /></div>
            </div>
            <div className="workspace-body">
              <aside className="workspace-sidebar">
                <span className="workspace-nav-active" />
                <span /><span /><span /><span />
              </aside>
              <div className="workspace-setlist">
                <div className="workspace-heading">
                  <div><strong>Sunday Worship</strong><small>9 songs · 42 min</small></div>
                  <button type="button">Live</button>
                </div>
                {[['1', 'Քո սիրով', 'D', '6:30'], ['2', 'Դու մոտ ես', 'G', '5:45'], ['3', 'Բարձր եմ Տեր', 'A', '5:20'], ['4', 'Քո լույսը', 'E', '4:40'], ['5', 'Սուրբ ես', 'C', '6:10']].map((row, index) => (
                  <div className={`workspace-song ${index === 0 ? 'selected' : ''}`} key={row[0]}>
                    <span className="workspace-index">{row[0]}</span>
                    <span className="workspace-song-name"><strong>{row[1]}</strong><small>{row[2]} · {68 + index * 2} BPM</small></span>
                    <span>{row[3]}</span>
                    <span className="workspace-more">•••</span>
                  </div>
                ))}
              </div>
              <aside className="workspace-inspector">
                <small>SONG DETAILS</small>
                <strong>Քո սիրով</strong>
                <div className="inspector-rule" />
                <span>Key <b>D</b></span>
                <span>Tempo <b>72 BPM</b></span>
                <span>Time <b>4/4</b></span>
                <div className="inspector-note" />
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="songs-section" ref={contentRef}>
        <div className="section-heading-row">
          <div>
            <h2>{t('landing.popularSongs')}</h2>
            <p>{t('landing.heroSubtitle')}</p>
          </div>
          <Link className="section-link" to="/songs">{t('landing.browseSongs')} <ArrowIcon /></Link>
        </div>

        <nav className="song-filter-nav" aria-label={t('landing.browse')}>
          {[
            ['songs', t('landing.browseSongs')],
            ['artists', t('landing.browseArtists')],
            ['collections', t('landing.browseCollections')],
            ['key', t('landing.browseByKey')],
            ['bpm', t('landing.browseByBPM')],
          ].map(([filter, label]) => (
            <Link key={filter} to="#" className={activeFilter === filter ? 'active' : ''} onClick={(event) => setFilter(event, filter)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="song-table-head" aria-hidden="true">
          <span>#</span><span>{t('landing.popularSongs')}</span><span>Key</span><span>BPM</span><span />
        </div>
        {loading ? (
          <div className="loading-songs">Loading songs…</div>
        ) : (
          <div className="popular-list">
            {popularSongs.slice(0, 6).map((song, index) => (
              <button key={song.id} className="song-row" onClick={() => navigate(`/song/${song.id}`)}>
                <span className="song-number">{String(index + 1 + songPage * SONGS_PER_PAGE).padStart(2, '0')}</span>
                <span className={`song-art ${song.img}`}><i /></span>
                <span className="song-copy"><strong>{song.title}</strong><small>{song.artist}</small></span>
                <span className="song-key">{song.key}</span>
                <span className="song-bpm">{Number.parseInt(song.bpm, 10) > 0 ? song.bpm : '—'}</span>
                <span className="song-open"><ArrowIcon /></span>
              </button>
            ))}
          </div>
        )}
        <div className="list-pagination">
          <button onClick={() => goToPage(-1)} aria-label="Previous page">←</button>
          <span>{songPage + 1} / {Math.max(1, Math.ceil(allSongs.length / SONGS_PER_PAGE))}</span>
          <button onClick={() => goToPage(1)} aria-label="Next page">→</button>
        </div>
      </section>


      <section className="latest-news-section">
        <div className="section-heading-row">
          <div><h2>{t('landing.latestNews')}</h2></div>
          <Link className="section-link" to="/news">{t('nav.news')} <ArrowIcon /></Link>
        </div>
        <div className="news-row">
          {newsItems.slice(0, 3).map((item, i) => (
            <article key={item.slug || i} className="news-card" onClick={() => navigate(`/news/${item.slug}`)}>
              <div className={`news-img img-${i + 1}`} style={item.image_url ? { backgroundImage: `url("${getNewsImageUrl(item)}")` } : undefined}>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="news-content">
                {item.release_version ? <span className="news-release-version">{formatNewsVersion(item.release_version)}</span> : null}
                <span className="news-date">{formatNewsDate(item.published_at || item.date, language)}</span>
                <h3>{item.title}</h3>
                <p>{item.excerpt || item.desc}</p>
                <span className="news-read"><ArrowIcon /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER MOVED TO APP.JSX */}
      {/* Video Modal Overlay */}
      {showVideo && (
        <div className="video-modal-overlay" onClick={() => setShowVideo(false)}>
          <div className="video-modal-content" onClick={e => e.stopPropagation()}>
            <button className="video-close" onClick={() => setShowVideo(false)}>&times;</button>
            <video src="/demo.mp4" controls autoPlay playsInline className="demo-video-player" />
          </div>
        </div>
      )}

    </div>
  );
}
