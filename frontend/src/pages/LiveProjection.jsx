import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { liveStageSync } from '../utils/liveStageSync';
import { getLocalizedTitle } from '../utils/titleParser';
import { useLanguage } from '../context/LanguageContext';
import './LiveProjection.css';

const BEAMER_THEMES = [
  { id: 'space', label: '🌌 Deep Space' },
  { id: 'purple', label: '✨ Royal Worship' },
  { id: 'ocean', label: '🌊 Ocean Glow' },
  { id: 'black', label: '⬛ Pure Black' },
];

function isPureChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('[')) return false;
  return /^([A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d)*(?:\/[A-G][#b]?)?\s*)+$/.test(trimmed);
}

export default function LiveProjection() {
  const { songId, sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Mode: 'beamer' (projector), 'lowerthirds' (OBS stream), 'confidence' (stage monitor)
  const [mode, setMode] = useState(searchParams.get('mode') || 'beamer');
  const [theme, setTheme] = useState('space');
  const [fontScale, setFontScale] = useState(1);
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(Boolean(songId));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isBlank, setIsBlank] = useState(false);
  const [showTitleOverlay, setShowTitleOverlay] = useState(true);
  const [stageMessage, setStageMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  // Clock tick for Confidence Monitor
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSongById = useCallback(async (targetId) => {
    if (!targetId) return;
    try {
      const res = await fetch(`/api.php?id=${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.id || data.title || data.lyrics || data.chords)) {
          setSong(data);
          setCurrentSlideIndex(0);
        }
      }
    } catch (e) {
      console.error('Failed to load song for projection:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch song details if songId provided
  useEffect(() => {
    let active = true;
    if (songId) {
      fetch(`/api.php?id=${encodeURIComponent(songId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data && (data.id || data.title || data.lyrics || data.chords)) {
            setSong(data);
            setCurrentSlideIndex(0);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => { active = false; };
  }, [songId]);

  // If live stage session provided (or active in local mesh), sync with live session
  useEffect(() => {
    const activeSess = sessionId || liveStageSync.sessionId;
    if (!activeSess) return;

    if (sessionId && liveStageSync.sessionId !== sessionId) {
      liveStageSync.joinSession(sessionId);
    }

    const unsub = liveStageSync.subscribe((state) => {
      if (!state) return;
      if (typeof state.stage_message === 'string') {
        setStageMessage(state.stage_message);
      }
      if (state.song_id && (!song || Number(song.id) !== Number(state.song_id))) {
        loadSongById(state.song_id);
      }
      if (typeof state.section_index === 'number') {
        setCurrentSlideIndex(state.section_index);
      }
    });

    return () => {
      unsub();
    };
  }, [sessionId, song, loadSongById]);

  // Parse lyrics into structured slides: [{ section: 'Տուն 1', text: '...' }]
  const slides = useMemo(() => {
    const rawText = song?.lyrics || song?.chords || '';
    if (!rawText.trim()) {
      return [{ section: 'Պատրաստ', text: loading ? 'Երգը բեռնվում է...' : 'Երգի բառերը հասանելի չեն' }];
    }

    const chunks = rawText.split(/\n\s*\n+/);
    const parsedSlides = [];

    chunks.forEach((chunk, idx) => {
      const lines = chunk.split('\n');
      let sectionLabel = '';
      const lyricLines = [];

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (isPureChordLine(trimmed)) return;

        // Check if bracket header like [Տուն 1] or [Կրկներգ]
        const headerMatch = trimmed.match(/^\[([^\]]+)\]$/);
        if (headerMatch && !/^[A-G][#b]?/.test(headerMatch[1])) {
          sectionLabel = headerMatch[1].trim();
          return;
        }

        // Strip inline [Am] chords
        const cleanLine = trimmed.replace(/\[[A-G][#b]?[^\]]*\]/g, '').trim();
        if (cleanLine) {
          lyricLines.push(cleanLine);
        }
      });

      if (lyricLines.length > 0) {
        // Split very long stanzas (> 6 lines) into 4-line slides for readability on projectors
        if (lyricLines.length > 6) {
          for (let i = 0; i < lyricLines.length; i += 4) {
            const subLines = lyricLines.slice(i, i + 4);
            parsedSlides.push({
              section: sectionLabel
                ? `${sectionLabel}${i > 0 ? ` (${Math.floor(i / 4) + 1})` : ''}`
                : `Սլայդ ${parsedSlides.length + 1}`,
              text: subLines.join('\n'),
            });
          }
        } else {
          parsedSlides.push({
            section: sectionLabel || `Սլայդ ${idx + 1}`,
            text: lyricLines.join('\n'),
          });
        }
      }
    });

    return parsedSlides.length > 0
      ? parsedSlides
      : [{ section: 'Երգ', text: rawText.trim() }];
  }, [song, loading]);

  const safeIndex = Math.min(Math.max(0, currentSlideIndex), Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIndex] || { section: '', text: '' };
  const nextSlide = slides[safeIndex + 1] || null;
  const displayTitle = song?.title ? getLocalizedTitle(song.title, language) : (song?.title_hy || 'Worship');

  const goToSlide = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, index));
      setCurrentSlideIndex(clamped);
      if (liveStageSync.sessionId) {
        liveStageSync.broadcastState({
          section_index: clamped,
          section_name: slides[clamped]?.section || '',
        });
      }
    },
    [slides]
  );

  const next = useCallback(() => {
    goToSlide(safeIndex + 1);
  }, [goToSlide, safeIndex]);

  const prev = useCallback(() => {
    goToSlide(safeIndex - 1);
  }, [goToSlide, safeIndex]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBlank((b) => !b);
      } else if (e.key === 'l' || e.key === 'L') {
        setShowTitleOverlay((v) => !v);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < slides.length) goToSlide(idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, toggleFullscreen, slides.length, goToSlide]);

  return (
    <div className={`projection-root mode-${mode} theme-${theme}`}>
      {/* Top Presenter Control Toolbar */}
      <div className="projection-toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="projection-tool-btn projection-tool-btn--back"
          onClick={() => (songId ? navigate(`/song/${songId}`) : navigate(-1))}
          title="Վերադառնալ երգի էջ"
        >
          ← Ելք
        </button>

        <div className="projection-tool-group">
          <button
            type="button"
            className={`projection-tool-btn ${mode === 'beamer' ? 'active' : ''}`}
            onClick={() => setMode('beamer')}
          >
            📽️ Պրոյեկտոր
          </button>
          <button
            type="button"
            className={`projection-tool-btn ${mode === 'lowerthirds' ? 'active' : ''}`}
            onClick={() => setMode('lowerthirds')}
          >
            📺 OBS Lower-Thirds
          </button>
          <button
            type="button"
            className={`projection-tool-btn ${mode === 'confidence' ? 'active' : ''}`}
            onClick={() => setMode('confidence')}
          >
            ⏱️ Բեմի Մոնիտոր
          </button>
        </div>

        {mode === 'beamer' && (
          <div className="projection-tool-group">
            {BEAMER_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`projection-tool-btn ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="projection-tool-group">
          <button
            type="button"
            className="projection-tool-btn"
            onClick={() => setFontScale((s) => Math.max(0.7, +(s - 0.1).toFixed(1)))}
            title="Փոքրացնել տառաչափը"
          >
            A−
          </button>
          <button
            type="button"
            className="projection-tool-btn"
            onClick={() => setFontScale((s) => Math.min(1.5, +(s + 0.1).toFixed(1)))}
            title="Մեծացնել տառաչափը"
          >
            A+
          </button>
          <button
            type="button"
            className={`projection-tool-btn ${isBlank ? 'active-danger' : ''}`}
            onClick={() => setIsBlank(!isBlank)}
            title="Սև էկրան աղոթքի պահին (B)"
          >
            {isBlank ? '☀️ Ցուցադրել' : '⬛ Սև էկրան (B)'}
          </button>
          <button
            type="button"
            className="projection-tool-btn"
            onClick={toggleFullscreen}
            title="Ամբողջ էկրանով (F)"
          >
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      {/* Main Slide Canvas (Click left/right zones to navigate) */}
      <div
        className="projection-stage-canvas"
        style={{ '--proj-font-scale': fontScale }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width * 0.3) {
            prev();
          } else {
            next();
          }
        }}
      >
        {!isBlank ? (
          <>
            {mode === 'beamer' && (
              <div className="projection-beamer-wrap">
                {showTitleOverlay && (
                  <div className="projection-beamer-meta">
                    <span className="projection-song-badge">{displayTitle}</span>
                    {currentSlide.section && (
                      <span className="projection-section-badge">{currentSlide.section}</span>
                    )}
                  </div>
                )}
                <div key={safeIndex} className="projection-beamer-content">
                  {currentSlide.text}
                </div>
              </div>
            )}

            {mode === 'lowerthirds' && (
              <div className="projection-lowerthirds-bar">
                <div className="projection-lowerthirds-header">
                  <span>{displayTitle}</span>
                  {currentSlide.section && <span>• {currentSlide.section}</span>}
                </div>
                <div key={safeIndex} className="projection-lowerthirds-text">
                  {currentSlide.text}
                </div>
              </div>
            )}

            {mode === 'confidence' && (
              <div className="confidence-monitor-layout">
                <div className="confidence-header">
                  <div>
                    <span className="confidence-song-title">{displayTitle}</span>
                    {currentSlide.section && (
                      <span className="confidence-section-pill">{currentSlide.section}</span>
                    )}
                  </div>
                  <span className="confidence-clock">{currentTime}</span>
                </div>

                {stageMessage && (
                  <div className="confidence-stage-alert">
                    📢 ԱՌԱՋՆՈՐԴԻ ԱԶԴԱՆՇԱՆ՝ {stageMessage}
                  </div>
                )}

                <div key={safeIndex} className="confidence-main-lyrics">
                  {currentSlide.text}
                </div>

                <div className="confidence-next-preview">
                  <strong>ՀԱՋՈՐԴԸ ({nextSlide ? nextSlide.section : 'Ավարտ'})՝</strong>{' '}
                  {nextSlide ? nextSlide.text : '— Երգի ավարտ —'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="projection-blackout-notice">
            <span>⬛ Էկրանը մարված է (Սեղմեք B՝ միացնելու համար)</span>
          </div>
        )}
      </div>

      {/* Bottom Stanza Quick-Jump & Slide Navigation Dock */}
      <div className="projection-bottom-dock" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="projection-nav-btn"
          onClick={prev}
          disabled={safeIndex <= 0}
        >
          ◀ Նախորդ
        </button>

        <div className="projection-stanza-pills">
          {slides.map((sl, idx) => (
            <button
              key={idx}
              type="button"
              className={`projection-stanza-pill ${idx === safeIndex ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
            >
              <span className="stanza-pill-num">{idx + 1}</span>
              <span>{sl.section}</span>
            </button>
          ))}
        </div>

        <span className="projection-slide-counter">
          {safeIndex + 1} / {slides.length}
        </span>

        <button
          type="button"
          className="projection-nav-btn"
          onClick={next}
          disabled={safeIndex >= slides.length - 1}
        >
          Հաջորդ ▶
        </button>
      </div>
    </div>
  );
}
