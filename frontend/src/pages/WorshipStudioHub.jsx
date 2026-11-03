import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveStageBar from '../components/LiveStageBar';
import SongStemsMixer from '../components/SongStemsMixer';
import SmartMetronome from '../components/SmartMetronome';
import WorshipAIStudioModal from '../components/WorshipAIStudioModal';
import { useFeatureFlags } from '../utils/featureFlags';
import { BetaBadge, BetaBanner, FeatureDisabledScreen } from '../components/BetaBadge';
import './WorshipStudioHub.css';

export default function WorshipStudioHub() {
  const navigate = useNavigate();
  const { isEnabled, isBeta, isOff } = useFeatureFlags();

  // Active tab: 'overview' | 'live_stage' | 'stems' | 'projection' | 'ai_studio' | 'planner' | 'metronome'
  const [activeTab, setActiveTab] = useState('overview');
  const [songs, setSongs] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const [copiedUrlType, setCopiedUrlType] = useState(null); // 'beamer' | 'lowerthirds' | 'confidence' | null
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [isSongSearchOpen, setIsSongSearchOpen] = useState(false);

  // Fetch songs list for selection in tools
  useEffect(() => {
    let active = true;
    fetch('/api.php')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.songs || [];
        setSongs(list);
        if (list.length > 0) {
          setSelectedSongId((prev) => prev || String(list[0].id));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const selectedSong = useMemo(() => {
    if (!songs || songs.length === 0) return null;
    return songs.find((s) => String(s.id) === String(selectedSongId)) || songs[0];
  }, [songs, selectedSongId]);

  const filteredSongs = useMemo(() => {
    if (!songSearchQuery.trim()) return songs.slice(0, 50);
    const q = songSearchQuery.toLowerCase().trim();
    return songs.filter((s) => {
      const titleHy = String(s.title_hy || '').toLowerCase();
      const title = String(s.title || '').toLowerCase();
      const key = String(s.song_key || '').toLowerCase();
      const id = String(s.id || '');
      return titleHy.includes(q) || title.includes(q) || key.includes(q) || id === q;
    }).slice(0, 50);
  }, [songs, songSearchQuery]);

  const handleCopyProjectionLink = (mode) => {
    if (!selectedSong) return;
    const url = `${window.location.origin}/projection/${selectedSong.id}?mode=${mode}`;
    navigator.clipboard?.writeText(url);
    setCopiedUrlType(mode);
    setTimeout(() => setCopiedUrlType(null), 2500);
  };

  const handleSelectNextSong = () => {
    if (!songs || songs.length === 0 || !selectedSong) return;
    const currentIndex = songs.findIndex((s) => String(s.id) === String(selectedSong.id));
    if (currentIndex >= 0 && currentIndex < songs.length - 1) {
      setSelectedSongId(String(songs[currentIndex + 1].id));
    } else {
      setSelectedSongId(String(songs[0].id));
    }
  };

  const handleSelectPrevSong = () => {
    if (!songs || songs.length === 0 || !selectedSong) return;
    const currentIndex = songs.findIndex((s) => String(s.id) === String(selectedSong.id));
    if (currentIndex > 0) {
      setSelectedSongId(String(songs[currentIndex - 1].id));
    } else {
      setSelectedSongId(String(songs[songs.length - 1].id));
    }
  };

  const tabsConfig = useMemo(() => [
    { id: 'overview', icon: '🌟', label: 'Ընդհանուր', badge: 'Hub' },
    {
      id: 'live_stage',
      icon: '📡',
      label: 'Live Follower',
      featureId: 'live_stage_follower',
      badge: isOff('live_stage_follower') ? 'Off' : (isBeta('live_stage_follower') ? 'BETA' : 'Բեմ'),
      isBeta: isBeta('live_stage_follower'),
      isOff: isOff('live_stage_follower'),
    },
    {
      id: 'stems',
      icon: '🎛️',
      label: 'Stems Միքշեր',
      featureId: 'rehearsal_stems',
      badge: isOff('rehearsal_stems') ? 'Off' : (isBeta('rehearsal_stems') ? 'BETA' : 'Փորձ'),
      isBeta: isBeta('rehearsal_stems'),
      isOff: isOff('rehearsal_stems'),
    },
    {
      id: 'projection',
      icon: '📽️',
      label: 'Պրոյեկցիա & OBS',
      featureId: 'lyrics_projection',
      badge: isOff('lyrics_projection') ? 'Off' : (isBeta('lyrics_projection') ? 'BETA' : 'Եթեր'),
      isBeta: isBeta('lyrics_projection'),
      isOff: isOff('lyrics_projection'),
    },
    {
      id: 'ai_studio',
      icon: '✨',
      label: 'AI Studio',
      featureId: 'worship_ai_studio',
      badge: isOff('worship_ai_studio') ? 'Off' : (isBeta('worship_ai_studio') ? 'BETA' : 'Ակորդ'),
      isBeta: isBeta('worship_ai_studio'),
      isOff: isOff('worship_ai_studio'),
    },
    {
      id: 'planner',
      icon: '📅',
      label: 'Service Planner',
      featureId: 'service_planner',
      badge: isOff('service_planner') ? 'Off' : (isBeta('service_planner') ? 'BETA' : 'Ծրագիր'),
      isBeta: isBeta('service_planner'),
      isOff: isOff('service_planner'),
    },
    {
      id: 'metronome',
      icon: '⏱️',
      label: 'Մետրոնոմ',
      featureId: 'smart_metronome',
      badge: isOff('smart_metronome') ? 'Off' : (isBeta('smart_metronome') ? 'BETA' : 'Click'),
      isBeta: isBeta('smart_metronome'),
      isOff: isOff('smart_metronome'),
    },
  ], [isBeta, isOff]);

  return (
    <div className="worship-studio-hub-page">
      {/* Mobile / PWA Top Navigation Bar */}
      <header className="wsh-top-nav">
        <button
          type="button"
          className="wsh-nav-btn wsh-back-btn"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/songs'))}
          aria-label="Վերադառնալ"
        >
          <span className="wsh-btn-icon">←</span>
          <span className="wsh-btn-text">Ետ</span>
        </button>

        <div className="wsh-top-center-brand">
          <span className="wsh-brand-icon">🎛️</span>
          <div className="wsh-brand-info">
            <span className="wsh-brand-title">Worship Pro Studio</span>
            <span className="wsh-brand-version">v5.3.0 PRO SUITE</span>
          </div>
        </div>

        <button
          type="button"
          className="wsh-nav-btn wsh-home-btn"
          onClick={() => navigate('/songs')}
          title="Երգերի գրադարան"
          aria-label="Երգերի գրադարան"
        >
          <span className="wsh-btn-icon">🎵</span>
          <span className="wsh-btn-text wsh-hide-mobile">Երգեր</span>
        </button>
      </header>

      {/* Main Hero Header */}
      <section className="wsh-hero-section">
        <div className="wsh-hero-badge-wrap">
          <span className="wsh-hero-pill-badge">✨ Պրոֆեսիոնալ Երաժշտական Համակարգ</span>
          <span className="wsh-hero-status-pill">● Ակտիվ</span>
        </div>
        <h1 className="wsh-hero-title">Worship Studio Hub</h1>
        <p className="wsh-hero-desc">
          Բեմական սինքրոնացում, 8-ալիքային փորձերի միքշեր, եկեղեցու պրոյեկտոր, OBS ուղիղ եթեր,
          ակորդների արհեստական բանականություն և ծառայության պլանավորող մեկ ամբողջական էկրանում։
        </p>

        {/* Tab Navigation Ribbon */}
        <nav className="wsh-nav-ribbon" aria-label="Pro Studio Tools Navigation">
          <div className="wsh-ribbon-scroll">
            {tabsConfig.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`wsh-ribbon-pill ${activeTab === tab.id ? 'active' : ''} ${tab.isOff ? 'pill-off' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="wsh-pill-icon">{tab.icon}</span>
                <span className="wsh-pill-label">{tab.label}</span>
                {tab.isBeta ? (
                  <BetaBadge style={{ marginLeft: 4, padding: '1px 5px', fontSize: '0.62rem' }} />
                ) : (
                  <span className={`wsh-pill-badge ${tab.isOff ? 'off-badge' : ''}`}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </section>

      {/* Interactive Song Selector Bar (Displayed for tools that require a song) */}
      {['overview', 'stems', 'projection', 'ai_studio', 'metronome'].includes(activeTab) && selectedSong && (
        <section className="wsh-song-bar-card">
          <div className="wsh-sbar-left">
            <span className="wsh-sbar-tag">ԸՆՏՐՎԱԾ ԵՐԳ</span>
            <div className="wsh-sbar-details">
              <span className="wsh-sbar-title">
                {selectedSong.title_hy || selectedSong.title}
              </span>
              <div className="wsh-sbar-meta-chips">
                {selectedSong.song_key && (
                  <span className="wsh-meta-chip key-chip">🎹 {selectedSong.song_key}</span>
                )}
                {selectedSong.bpm ? (
                  <span className="wsh-meta-chip bpm-chip">⏱️ {selectedSong.bpm} BPM</span>
                ) : (
                  <span className="wsh-meta-chip bpm-chip">⏱️ 120 BPM</span>
                )}
                <span className="wsh-meta-chip id-chip">#{selectedSong.id}</span>
              </div>
            </div>
          </div>

          <div className="wsh-sbar-actions">
            <button
              type="button"
              className="wsh-sbar-btn wsh-sbar-nav-btn"
              onClick={handleSelectPrevSong}
              title="Նախորդ երգ"
            >
              ◀
            </button>
            <button
              type="button"
              className="wsh-sbar-btn wsh-sbar-choose-btn"
              onClick={() => setIsSongSearchOpen(!isSongSearchOpen)}
            >
              🔍 Փոխել երգը ▾
            </button>
            <button
              type="button"
              className="wsh-sbar-btn wsh-sbar-nav-btn"
              onClick={handleSelectNextSong}
              title="Հաջորդ երգ"
            >
              ▶
            </button>
            <button
              type="button"
              className="wsh-sbar-btn wsh-sbar-view-btn"
              onClick={() => navigate(`/song/${selectedSong.id}`)}
              title="Բացել երգի ակորդները"
            >
              📄 Էջ ↗
            </button>
          </div>

          {/* Quick Song Search Dropdown Panel */}
          {isSongSearchOpen && (
            <div className="wsh-song-search-panel">
              <div className="wsh-search-input-box">
                <span className="wsh-search-icon">🔍</span>
                <input
                  type="text"
                  className="wsh-search-field"
                  placeholder="Որոնել ըստ վերնագրի, տոնայնության կամ ID-ի..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  autoFocus
                />
                {songSearchQuery && (
                  <button
                    type="button"
                    className="wsh-search-clear"
                    onClick={() => setSongSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="wsh-song-search-list">
                {filteredSongs.length > 0 ? (
                  filteredSongs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`wsh-song-search-item ${String(s.id) === String(selectedSong.id) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSongId(String(s.id));
                        setIsSongSearchOpen(false);
                      }}
                    >
                      <div className="wsh-item-left">
                        <span className="wsh-item-title">{s.title_hy || s.title}</span>
                        {s.title && s.title_hy && s.title !== s.title_hy && (
                          <span className="wsh-item-sub">{s.title}</span>
                        )}
                      </div>
                      <div className="wsh-item-right">
                        {s.song_key && <span className="wsh-item-badge">{s.song_key}</span>}
                        {s.bpm && <span className="wsh-item-bpm">{s.bpm} BPM</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="wsh-search-empty">Երգեր չեն գտնվել</div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 0: OVERVIEW DASHBOARD
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <section className="wsh-dashboard-grid">
          {/* Card 1: Live Stage Follower */}
          <article className={`wsh-grid-card card-cyan ${isOff('live_stage_follower') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">📡 ԲԵՄԱԿԱՆ ՌԵԺԻՄ</span>
              {isOff('live_stage_follower') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('live_stage_follower') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-live-dot">LIVE SYNC</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">📡</div>
              <h2 className="wsh-card-heading">
                Band Live Follower
                {isBeta('live_stage_follower') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                Worship Leader-ը ղեկավարում է երգացանկն ու տոնայնությունը (Key/Capo),
                իսկ բոլոր երաժիշտների ու վոկալիստների էկրաններն ավտոմատ հետևում են իրական ժամանակում։
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Լոկալ Mesh & Սերվերային STAGE կոդ</li>
              <li>✓ Տոնայնության, Capo-ի և երգի ավտոմատ փոխում</li>
              <li>✓ Բեմական հրահանգներ («Կրկներգ 2x», «Solo»)</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('live_stage_follower') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-cyan"
                  onClick={() => setActiveTab('live_stage')}
                >
                  Գործարկել Live Follower →
                </button>
              )}
            </div>
          </article>

          {/* Card 2: RehearsalMix & Stems */}
          <article className={`wsh-grid-card card-purple ${isOff('rehearsal_stems') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">🎛️ ԱՆՀԱՏԱԿԱՆ ՓՈՐՁ</span>
              {isOff('rehearsal_stems') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('rehearsal_stems') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-stat-badge">8 STEMS</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">🎛️</div>
              <h2 className="wsh-card-heading">
                RehearsalMix & Stems
                {isBeta('rehearsal_stems') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                8-ալիքային Web Audio պաշտամունքային միքշեր։ Առանձնացրեք Click, Pad, Drums, Bass,
                Keys, Acoustic կամ Vocals շերտերը տանը փորձելու համար։
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Solo (S) և Mute (M) յուրաքանչյուր գործիքի համար</li>
              <li>✓ A-B Section Looper (Տուն, Կրկներգ, Կամուրջ)</li>
              <li>✓ Ինտեգրված տեմպ և մետրոնոմի քլիք</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('rehearsal_stems') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-purple"
                  onClick={() => setActiveTab('stems')}
                >
                  Բացել Stems Միքշերը →
                </button>
              )}
            </div>
          </article>

          {/* Card 3: Live Lyrics Projection & OBS */}
          <article className={`wsh-grid-card card-amber ${isOff('lyrics_projection') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">📽️ ԴԱՀԼԻՃ & ԵԹԵՐ</span>
              {isOff('lyrics_projection') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('lyrics_projection') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-stat-badge">OBS READY</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">📽️</div>
              <h2 className="wsh-card-heading">
                Live Lyrics Projection & OBS
                {isBeta('lyrics_projection') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                Դահլիճի մեծ պրոյեկտորի էկրան, YouTube/Facebook ուղիղ հեռարձակումների թափանցիկ Lower Thirds
                և բեմական Confidence Monitor:
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Դահլիճի Beamer մեծ էկրան (Blackout 'B' կոճակ)</li>
              <li>✓ OBS / vMix Browser Source թափանցիկ ֆոնով</li>
              <li>✓ Բեմի Confidence Monitor (հաջորդ տող & ժամացույց)</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('lyrics_projection') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-amber"
                  onClick={() => setActiveTab('projection')}
                >
                  Կարգավորել Պրոյեկցիան →
                </button>
              )}
            </div>
          </article>

          {/* Card 4: Worship AI Studio */}
          <article className={`wsh-grid-card card-rose ${isOff('worship_ai_studio') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">✨ ԱՐՀԵՍՏԱԿԱՆ ԲԱՆԱԿԱՆՈՒԹՅՈՒՆ</span>
              {isOff('worship_ai_studio') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('worship_ai_studio') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-stat-badge">AI 5.3</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">✨</div>
              <h2 className="wsh-card-heading">
                Worship AI Studio
                {isBeta('worship_ai_studio') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                Ակորդների գեներացում մաքուր տեքստից, ակորդների հարստացում (Modern Worship Voicing՝ add9, sus4, maj7)
                և պոետիկ հոգևոր հայերեն թարգմանություն։
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Modern Voicing & Simplify (սկսնակների համար)</li>
              <li>✓ Տոնայնության հարմոնիկ կառուցում</li>
              <li>✓ Պաշտամունքային բառերի հարմոնիզացիա</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('worship_ai_studio') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-rose"
                  onClick={() => setActiveTab('ai_studio')}
                >
                  Բացել AI Studio-ն →
                </button>
              )}
            </div>
          </article>

          {/* Card 5: Service Planner */}
          <article className={`wsh-grid-card card-blue ${isOff('service_planner') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">📅 ՊԼԱՆԱՎՈՐՈՒՄ</span>
              {isOff('service_planner') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('service_planner') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-stat-badge">RUN-OF-SHOW</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">📅</div>
              <h2 className="wsh-card-heading">
                Ministry Service Planner
                {isBeta('service_planner') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                Կիրակնօրյա պաշտամունքի րոպեական ծրագիր, երգացանկի կառուցում բազայից, ծառայողների թիմի
                գրաֆիկ (Rostering) և տպելու/PDF տարբերակ։
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Ծառայության ճշգրիտ ժամանակացույց</li>
              <li>✓ Երաժիշտների, վոկալիստների և քարոզչի նշանակում</li>
              <li>✓ Մեկ սեղմումով PDF արտահանում</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('service_planner') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-blue"
                  onClick={() => navigate('/service-planner')}
                >
                  Բացել Պլանավորման Էջը →
                </button>
              )}
            </div>
          </article>

          {/* Card 6: Smart Metronome */}
          <article className={`wsh-grid-card card-teal ${isOff('smart_metronome') ? 'card-disabled' : ''}`}>
            <div className="wsh-card-top">
              <span className="wsh-card-category-badge">⏱️ ՌԻԹՄ ԵՎ ՔԼԻՔ</span>
              {isOff('smart_metronome') ? (
                <span className="wsh-card-stat-badge off">🔒 ԱՆՋԱՏՎԱԾ</span>
              ) : isBeta('smart_metronome') ? (
                <BetaBadge label="BETA ՓՈՐՁԱՐԿՈՒՄ" />
              ) : (
                <span className="wsh-card-stat-badge">TAP TEMPO</span>
              )}
            </div>
            <div className="wsh-card-main-info">
              <div className="wsh-card-icon-bubble">⏱️</div>
              <h2 className="wsh-card-heading">
                Smart Visual Metronome
                {isBeta('smart_metronome') && <BetaBadge style={{ marginLeft: 8 }} />}
              </h2>
              <p className="wsh-card-text">
                Web Audio բարձր ճշգրտության մետրոնոմային շարժիչ։ Փայտե/էլեկտրոնային ձայներ, չափեր
                (4/4, 3/4, 6/8) և բեմական լուսային էկրանի զարկ (Screen Flash)։
              </p>
            </div>
            <ul className="wsh-card-highlights">
              <li>✓ Tap Tempo արագության ինտուիտիվ որոշում</li>
              <li>✓ Բեմական վիզուալ Flash Pulse ռեժիմ</li>
              <li>✓ Ընտրված երգի BPM-ի ավտոմատ բեռնում</li>
            </ul>
            <div className="wsh-card-footer">
              {isOff('smart_metronome') ? (
                <button type="button" className="wsh-action-btn disabled-btn" disabled>
                  🔒 Անջատված է լաբարատորիայում
                </button>
              ) : (
                <button
                  type="button"
                  className="wsh-action-btn primary-teal"
                  onClick={() => setActiveTab('metronome')}
                >
                  Գործարկել Մետրոնոմը →
                </button>
              )}
            </div>
          </article>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: BAND LIVE FOLLOWER
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'live_stage' && (
        <section className="wsh-panel-container">
          {isOff('live_stage_follower') ? (
            <FeatureDisabledScreen
              title="Band Live Follower-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('live_stage_follower') && (
                <BetaBanner
                  title="Band Live Follower — BETA Փորձարկման Փուլ"
                  description="Բեմական սինքրոնացումը գտնվում է ակտիվ լաբարատոր փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag cyan-tag">📡 LIVE STAGE SYNC</span>
                  <h2 className="wsh-panel-title">
                    Band Live Follower (Բեմական Սինքրոնացում)
                    {isBeta('live_stage_follower') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    Ղեկավարի սարքից երգը կամ տոնայնությունը փոխելիս՝ բոլոր միացած երաժիշտների ու երգիչների էկրանները
                    համաժամանակյա թարմանում են առանց հապաղման։
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

          <div className="wsh-panel-content">
            <LiveStageBar
              currentSongId={selectedSong ? Number(selectedSong.id) : null}
              currentSongTitle={selectedSong?.title_hy || selectedSong?.title || ''}
              currentKey={selectedSong?.song_key || 'C'}
              currentCapo={0}
              currentSemi={0}
              currentBpm={selectedSong?.bpm || 120}
              onFollowSongChange={(newSongId) => {
                setSelectedSongId(String(newSongId));
                navigate(`/song/${newSongId}`);
              }}
            />

            <div className="wsh-steps-grid">
              <div className="wsh-step-card">
                <div className="wsh-step-badge">ՔԱՅԼ 1 • ՂԵԿԱՎԱՐ (WORSHIP LEADER)</div>
                <h4 className="wsh-step-title">👑 Սկսել Բեմական Սեսիա</h4>
                <p className="wsh-step-desc">
                  Սեղմեք <strong>«Սկսել Live Բեմ»</strong> կոճակը։ Համակարգը կստեղծի ձեր բեմական կոդը
                  (օր.՝ <code>STAGE-4819</code>)։ Երգի կամ տոնայնության փոփոխությունը կհեռարձակվի ակնթարթորեն։
                </p>
              </div>

              <div className="wsh-step-card">
                <div className="wsh-step-badge">ՔԱՅԼ 2 • ԵՐԱԺԻՇՏ / ՎՈԿԱԼԻՍՏ</div>
                <h4 className="wsh-step-title">🎸 Միանալ Բեմին</h4>
                <p className="wsh-step-desc">
                  Մյուս սարքերով սեղմեք <strong>«Միանալ»</strong> և ընտրեք ցուցակում հայտնված ակտիվ սեսիան
                  կամ գրեք առաջնորդի STAGE կոդը։
                </p>
              </div>

              <div className="wsh-step-card">
                <div className="wsh-step-badge">ՔԱՅԼ 3 • ԱՆԽԱՓԱՆ ԿԱՊ</div>
                <h4 className="wsh-step-title">⚡ Տեղական Mesh & Cloud</h4>
                <p className="wsh-step-desc">
                  Համակարգն ավտոմատ ընտրում է ամենաարագ տեղական WiFi ցանցը (WebRTC/BroadcastChannel)
                  կամ ամպային սերվերը՝ երաշխավորելով 0 միլիվայրկյանի հապաղում։
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: REHEARSALMIX & STEMS MIXER
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'stems' && (
        <section className="wsh-panel-container">
          {isOff('rehearsal_stems') ? (
            <FeatureDisabledScreen
              title="RehearsalMix & Stems Mixer-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('rehearsal_stems') && (
                <BetaBanner
                  title="RehearsalMix & Stems Mixer — BETA Փորձարկման Փուլ"
                  description="8-ալիքային միքշերը գտնվում է ակտիվ փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag purple-tag">🎛️ MULTITRACK MIXER</span>
                  <h2 className="wsh-panel-title">
                    RehearsalMix & Stems Mixer
                    {isBeta('rehearsal_stems') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    8-ալիքային պաշտամունքային սինթեզատոր և միքշեր։ Բարձրացրեք կամ անջատեք առանձին գործիքները
                    տանը կամ բեմի ետնամասում անհատական փորձեր անելու համար։
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

              <div className="wsh-panel-content">
                {selectedSong ? (
                  <SongStemsMixer
                    songTitle={selectedSong.title_hy || selectedSong.title}
                    songKey={selectedSong.song_key || 'C'}
                    initialBpm={selectedSong.bpm || 120}
                    audioUrl={selectedSong.audio_url || ''}
                  />
                ) : (
                  <div className="wsh-empty-state">
                    <span className="wsh-empty-icon">🎛️</span>
                    <p>Խնդրում ենք ընտրել երգ վերևի վահանակից միքշերը բացելու համար։</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: LIVE LYRICS PROJECTION & OBS
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'projection' && (
        <section className="wsh-panel-container">
          {isOff('lyrics_projection') ? (
            <FeatureDisabledScreen
              title="Live Lyrics Projection-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('lyrics_projection') && (
                <BetaBanner
                  title="Live Lyrics Projection & OBS — BETA Փորձարկման Փուլ"
                  description="Դահլիճի պրոյեկցիան և OBS/vMix հեռարձակումը գտնվում են ակտիվ փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag amber-tag">📽️ PROJECTION & BROADCAST</span>
                  <h2 className="wsh-panel-title">
                    Live Lyrics Projection & OBS Stream
                    {isBeta('lyrics_projection') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    Դահլիճի մեծ էկրանի պրոյեկցիա, YouTube/Facebook եթերի համար թափանցիկ Lower Thirds
                    և բեմական Confidence Monitor:
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

              <div className="wsh-panel-content">
                {selectedSong ? (
                  <div className="wsh-projection-modes-grid">
                    {/* Mode 1: Beamer Screen */}
                    <div className="wsh-proj-mode-card">
                      <div className="wsh-mode-header">
                        <span className="wsh-mode-icon">🖥️</span>
                        <div>
                          <h4 className="wsh-mode-title">Դահլիճի Պրոյեկտոր (Beamer Screen)</h4>
                          <span className="wsh-mode-badge">FULLSCREEN DISPLAY</span>
                        </div>
                      </div>
                      <p className="wsh-mode-desc">
                        Տեքստը ավտոմատ բաժանված է խոշոր սլայդների, մաքրված է ակորդներից։
                        Ստեղնաշարի <code>Space</code>, <code>Arrow Keys</code> կամ սեղմում էկրանին՝ թերթելու համար։
                        <code>B</code> կոճակը սևացնում է էկրանը աղոթքի պահին։
                      </p>
                      <div className="wsh-mode-btns">
                        <button
                          type="button"
                          className="wsh-proj-btn primary-amber"
                          onClick={() => window.open(`/projection/${selectedSong.id}?mode=beamer`, '_blank')}
                        >
                          📽️ Բացել Դահլիճի Էկրան ↗
                        </button>
                        <button
                          type="button"
                          className="wsh-proj-btn copy-btn"
                          onClick={() => handleCopyProjectionLink('beamer')}
                        >
                          {copiedUrlType === 'beamer' ? '✅ Պատճենվեց!' : '📋 Պատճենել Հղումը'}
                        </button>
                      </div>
                    </div>

                    {/* Mode 2: OBS Lower Thirds */}
                    <div className="wsh-proj-mode-card">
                      <div className="wsh-mode-header">
                        <span className="wsh-mode-icon">📺</span>
                        <div>
                          <h4 className="wsh-mode-title">OBS & vMix Lower Thirds (Ուղիղ Եթեր)</h4>
                          <span className="wsh-mode-badge">TRANSPARENT OVERLAY</span>
                        </div>
                      </div>
                      <p className="wsh-mode-desc">
                        Թափանցիկ ֆոնով ստորին երկտող ժապավեն։ Ավելացրեք OBS Studio-ում որպես
                        <strong>«Browser Source»</strong> (Լայնություն՝ 1920, Բարձրություն՝ 1080)։
                      </p>
                      <div className="wsh-mode-btns">
                        <button
                          type="button"
                          className="wsh-proj-btn primary-amber"
                          onClick={() => window.open(`/projection/${selectedSong.id}?mode=lowerthirds`, '_blank')}
                        >
                          📺 Բացել Lower Thirds ↗
                        </button>
                        <button
                          type="button"
                          className="wsh-proj-btn copy-btn"
                          onClick={() => handleCopyProjectionLink('lowerthirds')}
                        >
                          {copiedUrlType === 'lowerthirds' ? '✅ Պատճենվեց!' : '📋 OBS Browser Source Link'}
                        </button>
                      </div>
                    </div>

                    {/* Mode 3: Confidence Monitor */}
                    <div className="wsh-proj-mode-card">
                      <div className="wsh-mode-header">
                        <span className="wsh-mode-icon">📱</span>
                        <div>
                          <h4 className="wsh-mode-title">Բեմական Confidence Monitor</h4>
                          <span className="wsh-mode-badge">STAGE MONITOR</span>
                        </div>
                      </div>
                      <p className="wsh-mode-desc">
                        Բեմի վրա դրվող էկրանների համար։ Ցուցադրում է ընթացիկ տողը, հաջորդ տողի նախադիտումը
                        և բեմական մեծ թվային ժամացույց։
                      </p>
                      <div className="wsh-mode-btns">
                        <button
                          type="button"
                          className="wsh-proj-btn primary-amber"
                          onClick={() => window.open(`/projection/${selectedSong.id}?mode=confidence`, '_blank')}
                        >
                          📱 Բացել Stage Monitor ↗
                        </button>
                        <button
                          type="button"
                          className="wsh-proj-btn copy-btn"
                          onClick={() => handleCopyProjectionLink('confidence')}
                        >
                          {copiedUrlType === 'confidence' ? '✅ Պատճենվեց!' : '📋 Պատճենել Հղումը'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="wsh-empty-state">
                    <span className="wsh-empty-icon">📽️</span>
                    <p>Խնդրում ենք ընտրել երգ պրոյեկցիան գործարկելու համար։</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: WORSHIP AI STUDIO
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'ai_studio' && (
        <section className="wsh-panel-container">
          {isOff('worship_ai_studio') ? (
            <FeatureDisabledScreen
              title="Worship AI Studio-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('worship_ai_studio') && (
                <BetaBanner
                  title="Worship AI Studio — BETA Փորձարկման Փուլ"
                  description="Արհեստական բանականության ակորդների և պոետիկ թարգմանության գործիքը գտնվում է ակտիվ փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag rose-tag">✨ HARMONY & TRANSLATION ENGINE</span>
                  <h2 className="wsh-panel-title">
                    Worship AI Studio
                    {isBeta('worship_ai_studio') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    Ներկառուցված արհեստական բանականության և երաժշտական տեսության շարժիչ։
                    Ստեղծեք ճիշտ հարմոնիա, հարստացրեք ակորդները կամ կատարեք պոետիկ հոգևոր թարգմանություն։
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

              <div className="wsh-panel-content">
                <div className="wsh-ai-feature-row">
                  <div className="wsh-ai-card">
                    <span className="wsh-ai-icon">🎸</span>
                    <h4 className="wsh-ai-card-title">Ակորդների Գեներացում</h4>
                    <p className="wsh-ai-card-desc">
                      Տեղադրեք միայն երգի խոսքերը, ընտրեք տոնայնությունը (Key), և AI-ը տների ու կրկներգերի համար
                      կկառուցի ճշգրիտ պաշտամունքային հարմոնիա։
                    </p>
                  </div>

                  <div className="wsh-ai-card">
                    <span className="wsh-ai-icon">🎨</span>
                    <h4 className="wsh-ai-card-title">Modern Worship Voicing</h4>
                    <p className="wsh-ai-card-desc">
                      Հարստացրեք սովորական ակորդները ժամանակակից հնչերանգներով (add9, sus4, maj7) կամ
                      պարզեցրեք սկսնակ երաժիշտների համար։
                    </p>
                  </div>

                  <div className="wsh-ai-card">
                    <span className="wsh-ai-icon">🇦🇲</span>
                    <h4 className="wsh-ai-card-title">Պոետիկ Թարգմանություն</h4>
                    <p className="wsh-ai-card-desc">
                      Անգլերեն կամ ռուսերեն պաշտամունքային երգերի թարգմանություն հայերեն՝ պահպանելով հոգևոր
                      իմաստն ու երաժշտական չափը։
                    </p>
                  </div>
                </div>

                <div className="wsh-ai-launch-box">
                  <div className="wsh-ai-launch-info">
                    <strong>Ընթացիկ երգ՝ {selectedSong ? (selectedSong.title_hy || selectedSong.title) : 'Ընտրված չէ'}</strong>
                    <span>
                      Սեղմեք ստորև գտնվող կոճակը՝ AI Studio-ի ինտերակտիվ վահանակը բացելու համար։
                    </span>
                  </div>
                  <button
                    type="button"
                    className="wsh-btn-launch primary-rose"
                    onClick={() => setIsAIStudioOpen(true)}
                  >
                    ✨ Գործարկել Worship AI Studio-ն →
                  </button>
                </div>

                {selectedSong && (
                  <WorshipAIStudioModal
                    isOpen={isAIStudioOpen}
                    onClose={() => setIsAIStudioOpen(false)}
                    songTitle={selectedSong.title_hy || selectedSong.title}
                    songKey={selectedSong.song_key || 'C'}
                    lyrics={selectedSong.lyrics || ''}
                    chords={selectedSong.chords || ''}
                    onApplyResult={(newText) => {
                      alert('Արդյունքը պատճենվեց clipboard: Կարող եք տեղադրել երգի մեջ։');
                      navigator.clipboard?.writeText(newText);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 5: MINISTRY SERVICE PLANNER
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'planner' && (
        <section className="wsh-panel-container">
          {isOff('service_planner') ? (
            <FeatureDisabledScreen
              title="Ministry Service Planner-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('service_planner') && (
                <BetaBanner
                  title="Ministry Service Planner — BETA Փորձարկման Փուլ"
                  description="Ծառայության ծրագրի պլանավորիչը գտնվում է ակտիվ փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag blue-tag">📅 SERVICE ROSTER & RUN-OF-SHOW</span>
                  <h2 className="wsh-panel-title">
                    Ministry Service Planner
                    {isBeta('service_planner') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    Ծառայության րոպեական ծրագիր (Run-of-Show), երգացանկի ավելացում բազայից և ծառայողների թիմի գրաֆիկ։
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

              <div className="wsh-panel-content">
                <div className="wsh-planner-hero-card">
                  <div className="wsh-planner-card-text">
                    <h3>Կիրակնօրյա Պաշտամունքի Կազմակերպում</h3>
                    <p>
                      Ծառայության պլանավորիչը թույլ է տալիս ստեղծել կիրակնօրյա ծրագիրը, հաշվարկել յուրաքանչյուր
                      հատվածի տևողությունը (Երգեր, Աղոթք, Քարոզ, Հայտարարություններ), նշանակել երաժիշտներին և
                      արտահանել PDF կամ տպել։
                    </p>
                    <div className="wsh-planner-feature-pills">
                      <span>⏱️ Ընդհանուր ժամանակացույց</span>
                      <span>🎸 Երաժիշտների նշանակում</span>
                      <span>📄 PDF և Տպելու ռեժիմ</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wsh-btn-launch primary-blue"
                    onClick={() => navigate('/service-planner')}
                  >
                    🚀 Բացել Ծառայության Պլանավորման Էջը →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 6: SMART VISUAL METRONOME
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'metronome' && (
        <section className="wsh-panel-container">
          {isOff('smart_metronome') ? (
            <FeatureDisabledScreen
              title="Smart Visual Metronome-ն անջատված է"
              description="Այս ֆունկցիան ժամանակավորապես անջատված է կառավարման վահանակի Լաբարատորիայում (Feature Labs):"
              onBack={() => setActiveTab('overview')}
            />
          ) : (
            <>
              {isBeta('smart_metronome') && (
                <BetaBanner
                  title="Smart Visual Metronome — BETA Փորձարկման Փուլ"
                  description="Բարձր ճշգրտության մետրոնոմի շարժիչը գտնվում է ակտիվ փորձարկման փուլում:"
                />
              )}
              <div className="wsh-panel-header">
                <div className="wsh-panel-headline">
                  <span className="wsh-panel-tag teal-tag">⏱️ HIGH PRECISION ENGINE</span>
                  <h2 className="wsh-panel-title">
                    Smart Visual Metronome Engine
                    {isBeta('smart_metronome') && <BetaBadge style={{ marginLeft: 8 }} />}
                  </h2>
                  <p className="wsh-panel-subtitle">
                    Web Audio բարձր ճշգրտության մետրոնոմ, չափեր (4/4, 3/4, 6/8), Tap Tempo և էկրանի լուսային զարկ (Pulse):
                  </p>
                </div>
                <button
                  type="button"
                  className="wsh-panel-close-btn"
                  onClick={() => setActiveTab('overview')}
                >
                  ✕ Ընդհանուր
                </button>
              </div>

              <div className="wsh-panel-content">
                <div className="wsh-metronome-wrapper">
                  <SmartMetronome
                    initialBpm={selectedSong?.bpm || 120}
                    initialSignature={4}
                    enableScreenPulse={true}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
