import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { CHRISTIAN_RADIO_STATIONS, CURATED_MEDIA_CHANNELS, useMediaPlayer } from '../utils/mediaData';
import { Glass } from 'glisse';
import './MediaHub.css';

export default function MediaHub() {
  const { language } = useLanguage();
  const player = useMediaPlayer();
  const [mediaMode, setMediaMode] = useState('video'); // 'video' | 'radio'
  const [category, setCategory] = useState('all');
  const [activeVideo, setActiveVideo] = useState(null);

  const ui = useMemo(() => {
    if (language === 'ru') {
      return {
        title: 'Медиа и 24/7 Радио',
        subtitle: 'Христианское радио без рекламы, живые собрания, проповеди и акустические сессии',
        tabs: { video: 'Видео', radio: 'Радио' },
        channelsTitle: 'Каналы',
        featuredTag: 'РЕКОМЕНДУЕМ',
        watchBtn: 'Смотреть',
        radioTitle: '24/7 Радио',
        stationsTitle: 'Христианские станции 24/7',
        videoTitle: 'Новое и Избранное',
        cats: { all: 'Все каналы', worship: 'Прославление', sermon: 'Проповеди', teaching: 'Обучение', acoustic: 'Акустика' },
        playing: 'В эфире',
        stop: 'Остановить',
        listen: 'Слушать',
      };
    }
    if (language === 'en') {
      return {
        title: 'Media & 24/7 Radio',
        subtitle: 'Ad-free Christian radio stations, live worship gatherings, sermons, and training',
        tabs: { video: 'Videos', radio: 'Radio' },
        channelsTitle: 'Channels',
        featuredTag: 'FEATURED',
        watchBtn: 'Watch Now',
        radioTitle: '24/7 Radio',
        stationsTitle: '24/7 Christian Radio Stations',
        videoTitle: 'New & Curated',
        cats: { all: 'All Channels', worship: 'Worship', sermon: 'Sermons', teaching: 'Training', acoustic: 'Acoustic' },
        playing: 'Live',
        stop: 'Stop Radio',
        listen: 'Listen Live',
      };
    }
    return {
      title: 'Մեդիա և 24/7 Ռադիո',
      subtitle: 'Առանց գովազդի քրիստոնեական ռադիո, կենդանի հավաքներ, քարոզներ և ուսուցումներ',
      tabs: { video: 'Տեսանյութեր', radio: 'Ռադիո' },
      channelsTitle: 'Ալիքներ',
      featuredTag: 'ԱՌԱՋԱՐԿՎՈՂ',
      watchBtn: 'Դիտել հիմա',
      radioTitle: '24/7 Ռադիո',
      stationsTitle: '24/7 Քրիստոնեական Ռադիոկայաններ',
      videoTitle: 'Տեսաալիքներ և Քարոզներ',
      cats: { all: 'Բոլոր ալիքները', worship: 'Փառաբանություն', sermon: 'Քարոզներ', teaching: 'Ուսուցում', acoustic: 'Ակուստիկ' },
      playing: 'Ուղիղ եթերում',
      stop: 'Կանգնեցնել',
      listen: 'Լսել ուղիղ',
    };
  }, [language]);

  const filteredVideos = useMemo(
    () => CURATED_MEDIA_CHANNELS.filter((v) => category === 'all' || v.category === category),
    [category],
  );

  const featuredVideo = filteredVideos[0] || CURATED_MEDIA_CHANNELS[0];
  const restVideos = filteredVideos.length > 1 ? filteredVideos.slice(1) : filteredVideos;

  return (
    <div className="media-page animate-fade-in">
      <header className="media-topbar">
        <div className="media-hero">
          <h1>{ui.title}</h1>
          <p>{ui.subtitle}</p>
        </div>
        <Glass className="media-segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mediaMode === 'video'}
            className={mediaMode === 'video' ? 'active' : ''}
            onClick={() => setMediaMode('video')}
          >
            ▶ {ui.tabs.video}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mediaMode === 'radio'}
            className={mediaMode === 'radio' ? 'active' : ''}
            onClick={() => setMediaMode('radio')}
          >
            ♫ {ui.tabs.radio}
          </button>
        </Glass>
      </header>

      {mediaMode === 'radio' ? (
        <section className="media-section">
          <h2 className="media-sec-title">{ui.stationsTitle}</h2>
          <div className="media-radio-grid media-radio-full">
            {CHRISTIAN_RADIO_STATIONS.map((st) => {
              const isCurrent = player?.activeStation?.id === st.id;
              const isLive = isCurrent && player?.isPlaying;
              return (
                <div key={st.id} className={`media-radio-card ${isCurrent ? 'is-active' : ''}`}>
                  <div className="media-radio-badge" style={{ backgroundColor: st.accent }}>
                    ♫
                  </div>
                  <div className="media-radio-meta">
                    <h3>{st.name[language] || st.name.am}</h3>
                    <p>{st.genre[language] || st.genre.am}</p>
                  </div>
                  <button
                    type="button"
                    className={`media-radio-btn ${isLive ? 'is-live' : ''}`}
                    onClick={() => player?.playStation(st)}
                  >
                    {isLive ? `■ ${ui.stop}` : `▶ ${ui.listen}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="media-workspace">
          {/* Left Channels Rail (Desktop) + Horizontal Pills (Mobile) */}
          <aside className="media-left-rail">
            <span className="media-rail-label">{ui.channelsTitle}</span>
            <div className="media-cat-list">
              {['all', 'worship', 'sermon', 'teaching', 'acoustic'].map((ck) => (
                <button
                  key={ck}
                  type="button"
                  className={`media-cat-pill ${category === ck ? 'active' : ''}`}
                  onClick={() => setCategory(ck)}
                >
                  <span className="media-cat-dot" />
                  <span>{ui.cats[ck]}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Center Featured Hero + Video Cards */}
          <main className="media-center-col">
            {featuredVideo && (
              <article
                className="media-featured-hero"
                style={{ background: featuredVideo.gradient }}
                onClick={() => setActiveVideo(featuredVideo)}
              >
                <div className="media-featured-overlay">
                  <span className="media-featured-tag">
                    {ui.featuredTag} · {featuredVideo.duration}
                  </span>
                  <h2>{featuredVideo.title[language] || featuredVideo.title.am}</h2>
                  <p>
                    {typeof featuredVideo.speaker === 'string'
                      ? featuredVideo.speaker
                      : featuredVideo.speaker[language] || featuredVideo.speaker.am}
                  </p>
                  <button type="button" className="media-featured-cta">
                    ▶ {ui.watchBtn}
                  </button>
                </div>
              </article>
            )}

            <div className="media-sec-head">
              <h2 className="media-sec-title">{ui.videoTitle}</h2>
            </div>

            <div className="media-video-grid">
              {restVideos.map((vid) => (
                <article key={vid.id} className="media-video-card" onClick={() => setActiveVideo(vid)}>
                  <div className="media-video-thumb" style={{ background: vid.gradient }}>
                    <span className="media-play-circle">▶</span>
                    <span className="media-duration">{vid.duration}</span>
                  </div>
                  <div className="media-video-body">
                    <h3>{vid.title[language] || vid.title.am}</h3>
                    <small>{typeof vid.speaker === 'string' ? vid.speaker : vid.speaker[language] || vid.speaker.am}</small>
                  </div>
                </article>
              ))}
            </div>
          </main>

          {/* Right Compact Radio Rail (Desktop) */}
          <aside className="media-right-rail">
            <div className="media-rail-card">
              <div className="media-rail-card-head">
                <span className="media-rail-label">{ui.radioTitle}</span>
                <button type="button" className="media-rail-all" onClick={() => setMediaMode('radio')}>
                  ›
                </button>
              </div>
              <div className="media-rail-stations">
                {CHRISTIAN_RADIO_STATIONS.map((st) => {
                  const isCurrent = player?.activeStation?.id === st.id;
                  const isLive = isCurrent && player?.isPlaying;
                  return (
                    <div key={st.id} className={`media-rail-station ${isCurrent ? 'is-active' : ''}`}>
                      <div className="media-rail-st-badge" style={{ backgroundColor: st.accent }}>
                        ♫
                      </div>
                      <div className="media-rail-st-info">
                        <strong>{st.name[language] || st.name.am}</strong>
                        <small>{st.genre[language] || st.genre.am}</small>
                      </div>
                      <button
                        type="button"
                        className={`media-rail-play ${isLive ? 'is-live' : ''}`}
                        onClick={() => player?.playStation(st)}
                        aria-label={isLive ? ui.stop : ui.listen}
                      >
                        {isLive ? '■' : '▶'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeVideo && createPortal(
        <div className="media-modal-backdrop" onClick={() => setActiveVideo(null)}>
          <div className="media-video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="media-video-modal-head">
              <strong>{activeVideo.title[language] || activeVideo.title.am}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="media-cat-pill"
                  style={{ textDecoration: 'none', fontSize: '0.76rem' }}
                >
                  YouTube ↗
                </a>
                <button type="button" className="media-close-btn" onClick={() => setActiveVideo(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="media-iframe-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeVideo.title.en}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
