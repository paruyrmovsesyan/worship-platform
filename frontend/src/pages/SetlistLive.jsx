import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedTitle } from '../utils/titleParser';
import './SetlistLive.css';

export default function SetlistLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [setlist, setSetlist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMetronomeItemId, setActiveMetronomeItemId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const beatCountRef = useRef(0);
  const clockRef = useRef(null);

  const playClick = (isAccent = false) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1500 : 1000, ctx.currentTime);
    gain.gain.setValueAtTime(isAccent ? 1 : 0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  };

  const stopMetronome = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveMetronomeItemId(null);
  };

  const startMetronome = (itemId, bpm) => {
    stopMetronome();
    setActiveMetronomeItemId(itemId);
    beatCountRef.current = 0;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    playClick(true);
    const msPerBeat = 60000 / bpm;
    intervalRef.current = setInterval(() => {
      beatCountRef.current = (beatCountRef.current + 1) % 4;
      playClick(beatCountRef.current === 0);
    }, msPerBeat);
  };

  const toggleMetronome = (e, item) => {
    e.stopPropagation();
    const bpm = item.bpm && parseInt(item.bpm) > 0
      ? parseInt(item.bpm)
      : (item.original_bpm && parseInt(item.original_bpm) > 0 ? parseInt(item.original_bpm) : 0);
    if (!bpm) return;
    if (activeMetronomeItemId === item.id) {
      stopMetronome();
    } else {
      startMetronome(item.id, bpm);
    }
  };

  const getEffectiveBpm = (item) => {
    if (item.bpm && parseInt(item.bpm) > 0) return parseInt(item.bpm);
    if (item.original_bpm && parseInt(item.original_bpm) > 0) return parseInt(item.original_bpm);
    return 0;
  };

  useEffect(() => {
    document.body.classList.add('live-mode-active');
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      document.body.classList.remove('live-mode-active');
      stopMetronome();
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || '';

    let url = `/setlists_api.php?action=get_setlist_items&setlist_id=${id}`;
    if (token) {
      url = `/setlists_api.php?action=get_public_setlist&token=${encodeURIComponent(token)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'Failed to load');
        setSetlist(data.setlist);
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(t('setlists.errorFetch') || 'Error fetching setlist');
        setLoading(false);
      });
  }, [id, t]);

  const songItems = items.filter(i => i.item_type !== 'section');
  const totalSongs = songItems.length;

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) return (
    <div className="sll-loading">
      <div className="sll-spinner" />
    </div>
  );
  if (error) return <div className="sll-error">{error}</div>;

  const activeItem = activeMetronomeItemId ? items.find(i => i.id === activeMetronomeItemId) : null;
  let songCounter = 0;

  return (
    <div className="sll-container">

      {/* ── Header ── */}
      <header className="sll-header">
        <button className="sll-back" onClick={() => navigate(`/setlists/${id}`)} title="Դուրս գալ">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="sll-header-center">
          <div className="sll-live-indicator">
            <span className="sll-pulse-ring" />
            <span className="sll-pulse-dot" />
            <span className="sll-live-label">LIVE</span>
          </div>
          <h1 className="sll-setlist-name">{setlist?.name}</h1>
          <div className="sll-header-sub">
            <span className="sll-song-count">{totalSongs} երգ</span>
          </div>
        </div>

        <div className="sll-clock">{formatTime(currentTime)}</div>
      </header>

      {/* ── Song List ── */}
      <main className="sll-list">
        {items.map((item, idx) => {

          /* Section Header */
          if (item.item_type === 'section') {
            return (
              <div key={item.id} className="sll-section">
                <div className="sll-section-inner">
                  <div className="sll-section-line" />
                  <span className="sll-section-title">{item.title}</span>
                  <div className="sll-section-line" />
                </div>
                {item.duration && (
                  <span className="sll-section-dur">⏱ {item.duration} ր</span>
                )}
              </div>
            );
          }

          /* Song Card */
          songCounter++;
          const bpm = getEffectiveBpm(item);
          const isActive = activeMetronomeItemId === item.id;

          return (
            <React.Fragment key={item.id}>
              <div
                className={`sll-card${isActive ? ' sll-card--active' : ''}`}
                onClick={() => navigate(`/song/${item.song_id}`)}
              >
                {/* Number */}
                <div className={`sll-card-num${isActive ? ' sll-card-num--active' : ''}`}>
                  {String(songCounter).padStart(2, '0')}
                </div>

                {/* Body */}
                <div className="sll-card-body">
                  <div className="sll-card-title">{getLocalizedTitle(item, language)}</div>
                  {(item.artist || item.song_artist) && (
                    <div className="sll-card-artist">{item.artist || item.song_artist}</div>
                  )}

                  {/* Chips */}
                  {(item.target_key || bpm > 0 || item.duration) && (
                    <div className="sll-card-chips">
                      {item.target_key && (
                        <span className="sll-chip sll-chip--key">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3"/></svg>
                          {item.target_key}
                        </span>
                      )}
                      {bpm > 0 && (
                        <button
                          className={`sll-chip sll-chip--bpm${isActive ? ' sll-chip--bpm-active' : ''}`}
                          onClick={e => toggleMetronome(e, item)}
                          title="Մետրոնոմ"
                        >
                          {isActive
                            ? <><span className="sll-beat-dot" /><span className="sll-beat-dot sll-beat-dot--2" /><span className="sll-beat-dot sll-beat-dot--3" /></>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1zm0 4c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm1-8h-2v5h5v-2h-3V9z"/></svg>
                          }
                          {bpm} BPM
                        </button>
                      )}
                      {item.duration && (
                        <span className="sll-chip sll-chip--dur">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {item.duration} ր
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="sll-card-notes">{item.notes}</div>
                  )}

                  {/* Role Assignments */}
                  {item.assignments && item.assignments.length > 0 && (
                    <div className="sll-card-roles">
                      {item.assignments.map(a => (
                        <span key={a.id} className="sll-role-tag">
                          <span className="sll-role-name">{a.role_name}</span>
                          <span className="sll-role-user">{a.user_name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="sll-card-arrow">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* Transition */}
              {item.transition_type && idx < items.length - 1 && (
                <div className="sll-transition">
                  {item.transition_type === 'crossfade' && (
                    <><span className="sll-tr-icon">⇌</span> Սահուն անցում</>
                  )}
                  {item.transition_type === 'stop' && (
                    <><span className="sll-tr-icon">■</span> Դադար</>
                  )}
                  {item.transition_type !== 'crossfade' && item.transition_type !== 'stop' && (
                    <><span className="sll-tr-icon">💬</span> Խոսք / Աղոթք</>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="sll-end-marker">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
          Ավարտ
        </div>
      </main>

      {/* ── Floating Metronome Bar ── */}
      {activeItem && (() => {
        const bpm = getEffectiveBpm(activeItem);
        return (
          <div className="sll-metro">
            <div className="sll-metro-visual">
              <span className="sll-metro-dot sll-metro-dot--a" />
              <span className="sll-metro-dot sll-metro-dot--b" />
              <span className="sll-metro-dot sll-metro-dot--c" />
            </div>
            <div className="sll-metro-info">
              <span className="sll-metro-song">{getLocalizedTitle(activeItem, language)}</span>
              <span className="sll-metro-bpm">{bpm} <small>BPM</small></span>
            </div>
            <button className="sll-metro-stop" onClick={stopMetronome} aria-label="Stop">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        );
      })()}
    </div>
  );
}
