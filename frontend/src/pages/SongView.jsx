import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { renderWithChords, transposeRoot, noteIndex } from '../utils/chordTransposer';
import { getLocalizedTitle } from '../utils/titleParser';
import './SongView.css';

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls state
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('song_font_size') || '18', 10));
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('song_view_mode') || 'chords');
  const [semi, setSemi] = useState(0);
  const [capo, setCapo] = useState(() => parseInt(localStorage.getItem(`capo_${id}`) || '0', 10));
  const [useFlats, setUseFlats] = useState(false);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [targetKey, setTargetKey] = useState(null); 
  const [favMsg, setFavMsg] = useState('');
  
  const [setlistNavData, setSetlistNavData] = useState(null);

  const copyShareLink = async () => {
    try {
      const url = new URL(window.location.href);
      if (targetKey) url.searchParams.set('tkey', targetKey);
      else url.searchParams.delete('tkey');
      
      if (capo > 0) url.searchParams.set('capo', String(capo));
      else url.searchParams.delete('capo');
      
      url.searchParams.set('view', viewMode);
      url.searchParams.set('font', String(fontSize));
      
      await navigator.clipboard.writeText(url.toString());
      setFavMsg(t('songView.linkCopied'));
      setTimeout(() => setFavMsg(''), 2000);
    } catch (e) {
      setFavMsg(t('songView.linkCopyError'));
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login?next=' + window.location.pathname);
      return;
    }
    const newState = !isFavorite;
    setIsFavorite(newState);
    setFavMsg(newState ? t('songView.added') : t('songView.removed'));
    setTimeout(() => setFavMsg(''), 2000);
    try {
      await fetch('/user_favorites_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, action: newState ? 'add' : 'remove' }),
      });
    } catch {}
  };

  useEffect(() => {
    fetch(`/api.php?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.id) throw new Error('Song not found');
        setSong(data);
        setLoading(false);
        
        const params = new URLSearchParams(window.location.search);
        const urlTkey = params.get('tkey');
        const urlCapo = params.get('capo');
        
        let initialTargetKey = null;

        if (user) {
          fetch(`/user_favorites_api.php?action=get_favorite&song_id=${id}`)
            .then(r => r.json())
            .then(favData => {
              setIsFavorite(favData.favorite);
              initialTargetKey = urlTkey || favData.target_key;
              if (initialTargetKey) {
                setTargetKey(initialTargetKey);
                if (data.song_key) {
                  const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                  let fromIdx = KEYS.indexOf(data.song_key);
                  let toIdx = KEYS.indexOf(initialTargetKey);
                  if (fromIdx !== -1 && toIdx !== -1) {
                    let diff = toIdx - fromIdx;
                    if (diff > 6) diff -= 12;
                    if (diff < -5) diff += 12;
                    setSemi(diff);
                  }
                }
              }
            }).catch(() => {});
        } else if (urlTkey) {
          setTargetKey(urlTkey);
          if (data.song_key) {
            const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            let fromIdx = KEYS.indexOf(data.song_key);
            let toIdx = KEYS.indexOf(urlTkey);
            if (fromIdx !== -1 && toIdx !== -1) {
              let diff = toIdx - fromIdx;
              if (diff > 6) diff -= 12;
              if (diff < -5) diff += 12;
              setSemi(diff);
            }
          }
        }
        
        if (urlCapo) {
          setCapo(parseInt(urlCapo, 10) || 0);
        } else {
          try {
            const legacyCapoPref = localStorage.getItem(`song_capo_pref:${id}`);
            if (legacyCapoPref) {
              const parsed = JSON.parse(legacyCapoPref);
              setCapo(parsed.capo || 0);
            }
          } catch(e) {}
        }
        
        if (user) {
          fetch('/account_api.php?action=add_recent_view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: id })
          }).catch(()=>{});
        }
      })
      .catch(err => {
        setError(t('songView.error'));
        setLoading(false);
      });
  }, [id, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setlistId = params.get('setlist_id');
    const setlistToken = params.get('setlist_token');
    const setlistItemId = params.get('setlist_item_id');

    if (setlistId || setlistToken) {
      let url = `/setlists_api.php?action=get_setlist_song_nav&song_id=${id}`;
      if (setlistId) url += `&setlist_id=${setlistId}`;
      if (setlistToken) url += `&token=${setlistToken}`;
      if (setlistItemId) url += `&item_id=${setlistItemId}`;
      
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (!data.error && data.current) {
            setSetlistNavData(data);
          }
        }).catch(() => {});
    }

    const listQuery = params.get('list');
    if (listQuery && listQuery.startsWith('setlist_')) {
      const setId = listQuery.split('_')[1];
      fetch(`/setlists_api.php?action=get_setlist_items&setlist_id=${setId}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.setlist && d.setlist.team_role === 'vocalist' && !localStorage.getItem('view_mode_overridden')) {
            setViewMode('lyrics');
          }
        });
    }
  }, [id, user]);

  const increaseFontSize = () => { 
    setFontSize(prev => {
      const v = Math.min(prev + 2, 40);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  const decreaseFontSize = () => { 
    setFontSize(prev => {
      const v = Math.max(prev - 2, 14);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('song_view_mode', mode);
    localStorage.setItem('view_mode_overridden', 'true');
  };

  const getTransposedFullKey = (originalKey, semitones) => {
    if (!originalKey) return '';
    const trimmed = originalKey.trim();
    const rootMatch = trimmed.match(/^([A-G](?:#|b)?)(.*)$/i);
    if (!rootMatch) return trimmed;
    const newRoot = transposeRoot(rootMatch[1], semitones, useFlats);
    return newRoot + (rootMatch[2] || '');
  };

  const soundingKey = getTransposedFullKey(song?.song_key, semi);
  const playingKey = getTransposedFullKey(song?.song_key, semi - capo);
  const isKeySaved = isFavorite && targetKey === playingKey;
  
  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const handleKeyClick = (targetKeyStr) => {
    if (!song?.song_key) return;
    const trimmed = song.song_key.trim();
    const rootMatch = trimmed.match(/^([A-G](?:#|b)?)/i);
    let fromRoot = rootMatch ? rootMatch[1] : trimmed;
    let fromIdx = noteIndex(fromRoot);
    let toIdx = noteIndex(targetKeyStr);
    if (fromIdx !== -1 && toIdx !== -1) {
      let diff = toIdx - fromIdx;
      if (diff > 6) diff -= 12;
      if (diff < -5) diff += 12;
      setSemi(diff);
    }
  };

  const saveFavoriteKey = async (currentPlayKey) => {
    if (!user || !isFavorite) return;
    try {
      const res = await fetch('/user_favorites_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_favorite_key', song_id: id, target_key: currentPlayKey })
      });
      const data = await res.json();
      if (data.ok) {
        setTargetKey(currentPlayKey);
        setFavMsg(t('songView.keySavedAlert'));
        setTimeout(() => setFavMsg(''), 2000);
      }
    } catch {}
  };

  const navigateToSetlistSong = (item) => {
    let url = `/song/${item.id}?`;
    if (item.target_key) url += `tkey=${encodeURIComponent(item.target_key)}&`;
    const pref = JSON.parse(localStorage.getItem(`song_capo_pref:${item.id}`) || '{"capo":0,"capo_mode":0}');
    if (pref.capo_mode === 1 && pref.capo > 0) url += `capo=${pref.capo}&capo_mode=1&`;
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('setlist_id')) url += `setlist_id=${params.get('setlist_id')}&`;
    if (params.get('setlist_token')) url += `setlist_token=${params.get('setlist_token')}&`;
    if (item.item_id) url += `setlist_item_id=${item.item_id}&`;
    
    navigate(url);
  };

  const currentChords = song?.chords ? renderWithChords(song.chords, semi - capo, useFlats) : '';
  const currentLyrics = song?.lyrics || t('songView.noLyrics');

  if (loading || authLoading) {
    return (
      <div className="song-view-page">
        <div className="sl-placeholder animate-fade-in">
          <div className="spinner"></div>
          <p>{t('songView.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="song-view-page">
        <div className="sl-placeholder empty-state animate-fade-in">
          <p style={{color: 'var(--color-accent-red)'}}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{marginTop: '16px'}}>{t('songView.back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="song-view-page animate-fade-in">
      {/* Top Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '12px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div className="sv-title-area">
            <h1 className="sv-title">{getLocalizedTitle(song, language)}</h1>
            <p className="sv-artist">{song.artist}</p>
          </div>
        </div>

        <div className="sv-header-actions">
          <button className={`icon-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill={isFavorite ? '#FF4A6A' : 'none'} stroke={isFavorite ? '#FF4A6A' : 'currentColor'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="sv-meta-row">
        <div className="sv-meta-pill key-pill">{t('songView.keyPrefix')} {soundingKey || song.song_key || '?'}</div>
        {song.bpm && <div className="sv-meta-pill">BPM: {song.bpm}</div>}
        <button className="icon-btn" onClick={copyShareLink} style={{ marginLeft: 'auto', opacity: 0.6, padding: '4px' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        </button>
      </div>

      {/* Web Controls (Hidden in PWA) */}
      <div className="sv-inline-controls">
        <div className="sv-keys-scroll">
          {KEYS.map(k => {
            let isActive = false;
            if (soundingKey) {
              const rootMatch = soundingKey.match(/^([A-G](?:#|b)?)/i);
              const activeRoot = rootMatch ? rootMatch[1] : soundingKey;
              isActive = noteIndex(activeRoot) === noteIndex(k);
            }
            return (
              <button key={k} className={`sv-key-btn ${isActive ? 'active' : ''}`} onClick={() => handleKeyClick(k)}>
                {k}
              </button>
            );
          })}
        </div>
        
        <div className="sv-secondary-controls">
          <div className="sv-control-item">
            <label className="checkbox-label" style={{ margin: 0, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <input type="checkbox" checked={useFlats} onChange={e => setUseFlats(e.target.checked)} /> {t('songView.useFlats')}
            </label>
          </div>

          <div className="sv-control-item sv-capo-item">
            <select 
              className="sv-capo-select" 
              value={capo} 
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                setCapo(v);
                localStorage.setItem(`capo_${id}`, v);
                localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
              }}
            >
              <option value="0">{t('songView.noCapo')}</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>Capo {n}</option>)}
            </select>
          </div>

          <div className="sv-control-item sv-font-item">
            <button className="sv-font-btn" onClick={decreaseFontSize}>A-</button>
            <span className="sv-font-val">{fontSize}</span>
            <button className="sv-font-btn" onClick={increaseFontSize}>A+</button>
          </div>
        </div>
      </div>

      {/* Premium Controls Panel (Hidden in Web, Shown in PWA) */}
      <div className="sv-control-panel">
        <div className="sv-control-row">
          <div className="sv-stepper-group">
            <span className="sv-stepper-label">{t('songView.transpose')}</span>
            <div className="sv-stepper">
              <button className="sv-step-btn" onClick={() => setSemi(s => s - 1)}>-</button>
              <select 
                className="sv-step-val" 
                value={soundingKey ? getTransposedFullKey(soundingKey, 0) : ''}
                onChange={(e) => handleKeyClick(e.target.value)}
                style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', outline: 'none', color: 'var(--color-accent-cyan)', textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <option value="" disabled>?</option>
                {KEYS.map(k => {
                  const displayK = getTransposedFullKey(k, 0);
                  return <option key={k} value={displayK} style={{background: 'var(--color-surface)', color: 'var(--color-text-primary)'}}>{displayK}</option>;
                })}
              </select>
              <button className="sv-step-btn" onClick={() => setSemi(s => s + 1)}>+</button>
            </div>
          </div>
          <div className="sv-stepper-group">
            <span className="sv-stepper-label">{t('songView.capoSub')}</span>
            <div className="sv-stepper">
              <button className="sv-step-btn" onClick={() => {
                const v = Math.max(0, capo - 1);
                setCapo(v);
                localStorage.setItem(`capo_${id}`, v);
                localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
              }} disabled={capo <= 0}>-</button>
              <select 
                className="sv-step-val" 
                value={capo}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setCapo(v);
                  localStorage.setItem(`capo_${id}`, v);
                  localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
                }}
                style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', outline: 'none', color: 'var(--color-accent-cyan)', textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <option value="0" style={{background: 'var(--color-surface)', color: 'var(--color-text-primary)'}}>{t('songView.noCapo')}</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n} style={{background: 'var(--color-surface)', color: 'var(--color-text-primary)'}}>Capo {n}</option>)}
              </select>
              <button className="sv-step-btn" onClick={() => {
                const v = Math.min(12, capo + 1);
                setCapo(v);
                localStorage.setItem(`capo_${id}`, v);
                localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
              }} disabled={capo >= 12}>+</button>
            </div>
          </div>
        </div>
        <div className="sv-control-row" style={{ marginTop: '16px' }}>
          <div className="sv-stepper-group">
            <span className="sv-stepper-label">{t('songView.fontSize')}</span>
            <div className="sv-stepper">
              <button className="sv-step-btn" onClick={decreaseFontSize}>A-</button>
              <div className="sv-step-val">{fontSize}</div>
              <button className="sv-step-btn" onClick={increaseFontSize}>A+</button>
            </div>
          </div>
          <div className="sv-stepper-group">
            <span className="sv-stepper-label">{t('songView.signs')}</span>
            <button 
              className={`sv-toggle-btn ${useFlats ? 'active' : ''}`}
              onClick={() => setUseFlats(!useFlats)}
            >
              {useFlats ? t('songView.flats') : t('songView.sharps')}
            </button>
          </div>
        </div>
        
        {isFavorite && targetKey !== playingKey && (
          <button className="btn btn-primary btn-sm w-100" style={{ marginTop: '12px' }} onClick={() => saveFavoriteKey(playingKey)}>
            {t('songView.saveKey')}
          </button>
        )}
      </div>

      {/* Segmented Control for View Mode */}
      <div className="sv-segment-control">
        <button className={`sv-segment ${viewMode === 'lyrics' ? 'active' : ''}`} onClick={() => handleViewModeChange('lyrics')}>{t('songView.lyricsOnly')}</button>
        <button className={`sv-segment ${viewMode === 'chords' ? 'active' : ''}`} onClick={() => handleViewModeChange('chords')}>{t('songView.chordsOnly')}</button>
        <button className={`sv-segment ${viewMode === 'both' ? 'active' : ''}`} onClick={() => handleViewModeChange('both')}>{t('songView.bothModes')}</button>
      </div>

      {/* Sheet Music / Lyrics Content */}
      <div className={`sv-sheet ${viewMode === 'lyrics' ? 'lyrics-mode' : ''}`} style={{ fontSize: `${fontSize}px` }}>
        {viewMode === 'chords' && song.chords ? (
          <pre className="chords-block" dangerouslySetInnerHTML={{ __html: currentChords }} />
        ) : viewMode === 'both' && song.chords ? (
          <>
            <pre className="chords-block" dangerouslySetInnerHTML={{ __html: currentChords }} />
            <div className="sv-divider"></div>
            <pre className="lyrics-block">{currentLyrics}</pre>
          </>
        ) : (
          <pre className="lyrics-block">{currentLyrics}</pre>
        )}
      </div>

      {/* Setlist Navigation */}
      {setlistNavData && (
        <div className="seq-nav">
          <button className="seq-btn" disabled={!setlistNavData.prev} onClick={() => navigateToSetlistSong(setlistNavData.prev)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div className="seq-info">
            <span className="seq-count">{setlistNavData.current.index} / {setlistNavData.total}</span>
            <span className="seq-title">{t('songView.setlistTitle')}</span>
          </div>
          <button className="seq-btn" disabled={!setlistNavData.next} onClick={() => navigateToSetlistSong(setlistNavData.next)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0 24px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/song-request?song_id=${song.id}`)} style={{ gap: '8px', padding: '10px 20px', borderRadius: '20px', opacity: 0.8, fontSize: '0.9rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          {t('songView.requestEdit')}
        </button>
      </div>

      {favMsg && <div className="toast-message animate-fade-in">{favMsg}</div>}
    </div>
  );
}
