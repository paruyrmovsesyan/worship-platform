import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { CHRISTIAN_RADIO_STATIONS, CURATED_MEDIA_CHANNELS, useMediaPlayer } from '../utils/mediaData';
import './MediaHub.css';

export default function MediaHub() {
  const { language } = useLanguage();
  const player = useMediaPlayer();
  const [category, setCategory] = useState('all');
  const [activeVideo, setActiveVideo] = useState(null);

  const ui = useMemo(() => {
    if (language === 'ru') {
      return {
        title: 'Медиа и 24/7 Радио',
        subtitle: 'Христианское радио без рекламы, живые собрания, проповеди и акустические сессии',
        radioTitle: '24/7 Христианское Радио',
        videoTitle: 'Видеоканалы и Проповеди',
        cats: { all: 'Все', worship: 'Прославление', sermon: 'Проповеди', teaching: 'Обучение', acoustic: 'Акустика' },
        playing: 'В эфире',
        listen: 'Слушать',
      };
    }
    if (language === 'en') {
      return {
        title: 'Media & 24/7 Radio',
        subtitle: 'Ad-free Christian radio stations, live worship gatherings, sermons, and training',
        radioTitle: '24/7 Christian Radio',
        videoTitle: 'Curated Video Channels',
        cats: { all: 'All', worship: 'Worship', sermon: 'Sermons', teaching: 'Training', acoustic: 'Acoustic' },
        playing: 'Playing',
        listen: 'Listen Live',
      };
    }
    return {
      title: 'Մեդիա և 24/7 Ռադիո',
      subtitle: 'Առանց գովազդի քրիստոնեական ռադիո, կենդանի հավաքներ, քարոզներ և ուսուցումներ',
      radioTitle: '24/7 Քրիստոնեական Ռադիո',
      videoTitle: 'Տեսաալիքներ և Քարոզներ',
      cats: { all: 'Բոլորը', worship: 'Փառաբանություն', sermon: 'Քարոզներ', teaching: 'Ուսուցում', acoustic: 'Ակուստիկ' },
      playing: 'Ուղիղ եթերում',
      listen: 'Լսել ուղիղ',
    };
  }, [language]);

  const filteredVideos = useMemo(
    () => CURATED_MEDIA_CHANNELS.filter((v) => category === 'all' || v.category === category),
    [category],
  );

  return (
    <div className="media-page animate-fade-in">
      <header className="media-hero">
        <h1>{ui.title}</h1>
        <p>{ui.subtitle}</p>
      </header>

      <section className="media-section">
        <h2 className="media-sec-title">📻 {ui.radioTitle}</h2>
        <div className="media-radio-grid">
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
                  {isLive ? `❚❚ ${ui.playing}` : `▶ ${ui.listen}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="media-section">
        <div className="media-sec-head">
          <h2 className="media-sec-title">🎬 {ui.videoTitle}</h2>
          <div className="media-cat-pills">
            {['all', 'worship', 'sermon', 'teaching', 'acoustic'].map((ck) => (
              <button
                key={ck}
                type="button"
                className={`media-cat-pill ${category === ck ? 'active' : ''}`}
                onClick={() => setCategory(ck)}
              >
                {ui.cats[ck]}
              </button>
            ))}
          </div>
        </div>

        <div className="media-video-grid">
          {filteredVideos.map((vid) => (
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
      </section>

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
