import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { liveStageSync } from '../utils/liveStageSync';
import './LiveProjection.css';

export default function LiveProjection() {
  const { songId, sessionId } = useParams();
  const [searchParams] = useSearchParams();

  // Mode: 'beamer' (projector), 'lowerthirds' (OBS stream), 'confidence' (stage monitor)
  const [mode, setMode] = useState(searchParams.get('mode') || 'beamer');
  const [song, setSong] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isBlank, setIsBlank] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock tick for Confidence Monitor
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch song details if songId provided
  useEffect(() => {
    if (songId) {
      fetch(`/songs.php?action=get_song&id=${songId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.lyrics || data.chords)) {
            setSong(data);
          }
        })
        .catch((e) => console.error('Failed to load song for projection:', e));
    }
  }, [songId]);

  // If live stage session provided, sync with live session
  useEffect(() => {
    if (sessionId) {
      liveStageSync.joinSession(sessionId);
      const unsub = liveStageSync.subscribe((state) => {
        if (state && state.song_id && (!song || song.id !== state.song_id)) {
          fetch(`/songs.php?action=get_song&id=${state.song_id}`)
            .then((r) => r.json())
            .then((s) => {
              if (s) {
                setSong(s);
                if (typeof state.section_index === 'number') {
                  setCurrentSlideIndex(state.section_index);
                }
              }
            })
            .catch((e) => console.error('Stage session song fetch failed:', e));
        } else if (state && typeof state.section_index === 'number') {
          setCurrentSlideIndex(state.section_index);
        }
      });
      return () => {
        unsub();
        liveStageSync.leaveSession();
      };
    }
  }, [sessionId, song]);

  // Parse lyrics into slides
  const slides = useMemo(() => {
    const rawText = song?.lyrics || song?.chords || '';
    if (!rawText.trim()) return ['No lyrics available'];

    // Split by double newline or bracket headers e.g. [Տուն 1]
    const chunks = rawText.split(/\n\s*\n+/);
    const cleaned = chunks
      .map((chunk) => {
        // Strip chord lines if chords were pasted
        return chunk
          .split('\n')
          .filter((line) => {
            const trimmed = line.trim();
            // Filter pure chord lines like "C G Am F"
            const isChordsOnly = /^([A-G][#b]?(?:m|maj|dim|aug|sus\d?|7|9|add\d?)?(?:\/[A-G][#b]?)?\s*)+$/.test(trimmed);
            return !isChordsOnly;
          })
          .join('\n')
          .trim();
      })
      .filter((chunk) => chunk.length > 0);

    return cleaned.length > 0 ? cleaned : [rawText];
  }, [song]);

  const currentSlide = slides[currentSlideIndex] || '';
  const nextSlide = slides[currentSlideIndex + 1] || '';

  const next = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (['ArrowRight', 'ArrowDown', 'Space', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBlank((b) => !b);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev]);

  return (
    <div className={`projection-root mode-${mode}`}>
      {/* Discreet Control Toolbar */}
      <div className="projection-toolbar">
        <button
          type="button"
          className={`projection-tool-btn ${mode === 'beamer' ? 'active' : ''}`}
          onClick={() => setMode('beamer')}
        >
          📽️ Beamer
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
          ⏱️ Confidence Monitor
        </button>
        <button
          type="button"
          className={`projection-tool-btn ${isBlank ? 'active' : ''}`}
          onClick={() => setIsBlank(!isBlank)}
        >
          {isBlank ? 'Show' : 'Blackout (B)'}
        </button>
      </div>

      {!isBlank && (
        <>
          {mode === 'beamer' && (
            <div className="projection-beamer-content">
              {currentSlide}
            </div>
          )}

          {mode === 'lowerthirds' && (
            <div className="projection-lowerthirds-bar">
              <div className="projection-lowerthirds-text">
                {currentSlide}
              </div>
            </div>
          )}

          {mode === 'confidence' && (
            <>
              <div className="confidence-header">
                <span className="confidence-song-title">
                  {song?.title || 'Worship'}
                </span>
                <span className="confidence-clock">{currentTime}</span>
              </div>
              <div className="confidence-main-lyrics">
                {currentSlide}
              </div>
              {nextSlide && (
                <div className="confidence-next-preview">
                  <strong>NEXT:</strong> {nextSlide}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
