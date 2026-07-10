import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { renderWithChords, transposeRoot, noteIndex } from '../utils/chordTransposer';
import { getLocalizedTitle } from '../utils/titleParser';
import { usePageReady } from '../hooks/usePageReady';
import './SongView.css';

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  usePageReady(loading || authLoading);
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
  const [touchStartX, setTouchStartX] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareChats, setShareChats] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add('song-view-active');
    
    // Wake Lock
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && localStorage.getItem('keepAwake') === 'true') {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.body.classList.remove('song-view-active');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) wakeLock.release().catch(() => {});
    };
  }, []);

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
      setFavMsg(t('songView.linkCopied', 'Հղումը պատճենված է'));
      setTimeout(() => setFavMsg(''), 2000);
    } catch (e) {
      setFavMsg(t('songView.linkCopyError', 'Սխալ պատճենման ժամանակ'));
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  const copySongContent = async () => {
    try {
      let text = `${getLocalizedTitle(song.title, language)}\n`;
      
      const keyToCopy = targetKey || playingKey;
      if (keyToCopy) {
        text += `${t('songView.key', 'Key')}: ${keyToCopy}\n`;
      }
      
      text += '\n';

      if (song.chords) {
        const rawChords = renderWithChords(song.chords, semi - capo, useFlats).replace(/<[^>]*>?/gm, '');
        text += `--- ${t('songView.chords', 'Chords')} ---\n`;
        text += rawChords + '\n\n';
      }

      if (song.lyrics) {
        text += `--- ${t('songView.lyrics', 'Lyrics')} ---\n`;
        text += song.lyrics + '\n';
      }

      await navigator.clipboard.writeText(text.trim());
      setFavMsg(t('songView.copied', 'Պատճենվեց'));
      setTimeout(() => setFavMsg(''), 2000);
    } catch (err) {
      setFavMsg(t('songView.copyError', 'Սխալ պատճենման ժամանակ'));
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  const openShareModal = async () => {
    if (!user) {
      navigate('/login?next=' + window.location.pathname);
      return;
    }
    setIsShareModalOpen(true);
    setShareLoading(true);
    try {
      const res = await fetch('/chat_api.php?action=list_chats');
      const data = await res.json();
      if (data.ok) setShareChats(data.chats || []);
    } catch (e) {
      console.error(e);
    }
    setShareLoading(false);
  };

  const handleShareToChat = async (chatId) => {
    const title = song.title.replace(/[\[\]\|]/g, ''); // strip reserved chars
    const msg = `[SONG|id:${id}|key:${semi}|capo:${capo}|title:${title}]`;
    
    try {
      const res = await fetch('/chat_api.php?action=send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message: msg }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsShareModalOpen(false);
        setFavMsg(t('chat.sent', 'Ուղարկված է'));
        setTimeout(() => setFavMsg(''), 2000);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error');
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
      await fetch('/user_favorites_api.php?action=toggle_favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id }),
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
    if (listQuery === 'favorites' && user) {
      fetch('/user_favorites_api.php?action=get_favorites')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const idx = data.findIndex(s => String(s.id) === String(id));
            if (idx !== -1) {
              setSetlistNavData({
                current: { id, index: idx + 1 },
                total: data.length,
                prev: idx > 0 ? data[idx - 1] : null,
                next: idx < data.length - 1 ? data[idx + 1] : null,
              });
            }
          }
        }).catch(() => {});
    } else if (listQuery && listQuery.startsWith('setlist_')) {
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
      const res = await fetch('/user_favorites_api.php?action=update_favorite_key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, target_key: currentPlayKey })
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
    if (params.get('list')) url += `list=${params.get('list')}&`;
    if (params.get('setlist_id')) url += `setlist_id=${params.get('setlist_id')}&`;
    if (params.get('setlist_token')) url += `setlist_token=${params.get('setlist_token')}&`;
    if (item.item_id) url += `setlist_item_id=${item.item_id}&`;
    
    navigate(url);
  };

  const currentChords = song?.chords ? renderWithChords(song.chords, semi - capo, useFlats) : '';
  const currentLyrics = song?.lyrics || t('songView.noLyrics');

  if (loading || authLoading) {
    return null;
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

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 70) {
      if (diff > 0 && setlistNavData?.next) {
        navigateToSetlistSong(setlistNavData.next);
      } else if (diff < 0 && setlistNavData?.prev) {
        navigateToSetlistSong(setlistNavData.prev);
      }
    }
    setTouchStartX(null);
  };

  return (
    <>
    <div className={`song-view-page animate-fade-in ${setlistNavData ? 'has-seq-nav' : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Top Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '12px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div className="sv-title-area">
            <h1 className="sv-title">{getLocalizedTitle(song.title, language)}</h1>
            <p className="sv-artist">{song.artist}</p>
          </div>
        </div>

      </div>

      {/* Meta Bar */}
      <div className="sv-meta-row">
        <div className="sv-meta-pill key-pill">{t('songView.keyPrefix')} {soundingKey || song.song_key || '?'}</div>
        {song.bpm && <div className="sv-meta-pill">BPM: {song.bpm}</div>}
        
        <div className="sv-header-actions" style={{ marginLeft: 'auto' }}>
            {setlistNavData?.current?.id && (
              <button 
                className="icon-btn highlight-btn"
                onClick={() => navigate(`/setlists/${setlistNavData.current.setlist_id}`)}
                title={t('songView.backToSetlist')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            )}
            <button className="icon-btn" onClick={copySongContent} title={t('songView.copyContent', 'Copy Song')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button className="icon-btn" onClick={openShareModal} title={t('chat.send', 'Ուղարկել Չաթով')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
            <button className="icon-btn" onClick={copyShareLink} title={t('songView.copyLink')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </button>
            <button className={`icon-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite} title={isFavorite ? t('songView.removeFav') : t('songView.addFav')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
        </div>
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
                <option value="" disabled>{song?.song_key || t('songView.originalKey', 'Սկզբնական')}</option>
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
      </div>

    {/* Setlist Navigation */}
    {setlistNavData && createPortal(
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
      </div>,
      document.body
    )}

    <div className="sv-edit-action">
      <button className="btn btn-secondary sv-edit-btn" onClick={() => navigate(`/song-request?song_id=${song.id}`)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        {t('songView.requestEdit')}
      </button>
    </div>

    {favMsg && createPortal(
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(28, 28, 30, 0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        padding: '16px 32px',
        borderRadius: '100px',
        fontWeight: '600',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 2147483647,
        fontSize: '1.05rem',
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>{favMsg}</div>, 
      document.body
    )}

    {isShareModalOpen && createPortal(
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }} onClick={() => setIsShareModalOpen(false)}>
        <div style={{
          background: '#1a1a2e',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{t('chat.send', 'Ուղարկել Չաթով')}</h3>
            <button onClick={() => setIsShareModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shareLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#aaa' }}>Loading...</div>
            ) : shareChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#aaa' }}>{t('chat.emptySubtitle', 'Չաթեր չկան')}</div>
            ) : (
              shareChats.map(chat => (
                <div key={chat.id} onClick={() => handleShareToChat(chat.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
                    {chat.type === 'group' ? '👥' : (chat.participant_names ? chat.participant_names.charAt(0).toUpperCase() : '👤')}
                  </div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                    {chat.type === 'group' ? chat.name : chat.participant_names}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

    </>
  );
}
