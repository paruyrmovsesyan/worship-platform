import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { renderWithChords, transposeRoot, noteIndex } from '../utils/chordTransposer';
import './SongView.css';

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  
  const msg = {
    am: { added: 'Ավելացվեց նախընտրածներում ♥', removed: 'Հեռացվեց նախընտրածներից', loading: 'Բեռնվում է...', error: 'Չհաջողվեց բեռնել երգի տվյալները', back: 'Հետ գնալ', useFlats: 'Բեմոլներ (b)', transpose: 'Տրանսպոզիցիա', capoSub: 'Գիթառի դիրք', fontSize: 'Տառաչափ', downloadTxt: 'Ներբեռնել TXT', requestEdit: 'Խմբագրել երգը', chordsOnly: 'Միայն ակորդներ', lyricsOnly: 'Միայն բառեր', bothModes: 'Ակորդներ + բառեր', noCapo: 'Առանց Capo', clear: 'Ջնջել', keyPrefix: 'Տոնայնություն:', playAs: 'Նվագել որպես:', keySavedAlert: 'Տոնայնությունը պահպանվեց', keyIsSaved: '✓ Տոնայնությունը պահպանված է', saveKey: '💾 Պահպանել տոնայնությունը', semitones: 'կիսատոն', reset: 'Reset' },
    en: { added: 'Added to Favorites ♥', removed: 'Removed from Favorites', loading: 'Loading...', error: 'Failed to fetch song', back: 'Go Back', useFlats: 'Use flats (b)', transpose: 'Transpose', capoSub: 'Guitar position', fontSize: 'Font size', downloadTxt: 'Download TXT', requestEdit: 'Request Edit', chordsOnly: 'Chords only', lyricsOnly: 'Lyrics only', bothModes: 'Chords + lyrics', noCapo: 'No Capo', clear: 'Clear', keyPrefix: 'Key:', playAs: 'Play as:', keySavedAlert: 'Key saved', keyIsSaved: '✓ Key is saved', saveKey: '💾 Save key', semitones: 'semitones', reset: 'Reset' },
    ru: { added: 'Добавлено в избранное ♥', removed: 'Удалено из избранного', loading: 'Загрузка...', error: 'Не удалось загрузить данные песни', back: 'Назад', useFlats: 'Бемоли (b)', transpose: 'Транспозиция', capoSub: 'Позиция гитары', fontSize: 'Размер шрифта', downloadTxt: 'Скачать TXT', requestEdit: 'Предложить правку', chordsOnly: 'Только аккорды', lyricsOnly: 'Только слова', bothModes: 'Аккорды + слова', noCapo: 'Без Capo', clear: 'Очистить', keyPrefix: 'Тональность:', playAs: 'Играть как:', keySavedAlert: 'Тональность сохранена', keyIsSaved: '✓ Тональность сохранена', saveKey: '💾 Сохранить тональность', semitones: 'полутонов', reset: 'Сброс' }
  }[language] || { added: 'Added to Favorites ♥', removed: 'Removed from Favorites', loading: 'Loading...', error: 'Failed to fetch song', back: 'Go Back', useFlats: 'Use flats (b)', transpose: 'Transpose', capoSub: 'Guitar position', fontSize: 'Font size', downloadTxt: 'Download TXT', requestEdit: 'Request Edit', chordsOnly: 'Chords only', lyricsOnly: 'Lyrics only', bothModes: 'Chords + lyrics', noCapo: 'No Capo', clear: 'Clear', keyPrefix: 'Key:', playAs: 'Play as:', keySavedAlert: 'Key saved', keyIsSaved: '✓ Key is saved', saveKey: '💾 Save key', semitones: 'semitones', reset: 'Reset' };

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Musician Controls
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('song_font_size') || '18', 10));
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('song_view_mode') || 'chords'); // 'chords' or 'lyrics'
  const [semi, setSemi] = useState(0);
  const [capo, setCapo] = useState(() => parseInt(localStorage.getItem(`capo_${id}`) || '0', 10));
  const [useFlats, setUseFlats] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [targetKey, setTargetKey] = useState(null); // The saved favorite key
  const [favMsg, setFavMsg] = useState('');
  
  // Sequential Navigation State
  const [navList, setNavList] = useState([]);
  const [navIndex, setNavIndex] = useState(-1);
  const [listType, setListType] = useState(null);
  
  // Setlist Nav State
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
      setFavMsg('Հղումը պատճենվեց');
      setTimeout(() => setFavMsg(''), 2000);
    } catch (e) {
      setFavMsg('Չհաջողվեց պատճենել հղումը');
      setTimeout(() => setFavMsg(''), 2000);
    }
  };

  // Toggle favorite via API or localStorage fallback
  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) {
      window.location.href = '/loginuser.php?next=' + window.location.pathname;
      return;
    }
    const newState = !isFavorite;
    setIsFavorite(newState);
    setFavMsg(newState ? msg.added : msg.removed);
    setTimeout(() => setFavMsg(''), 2000);
    try {
      await fetch('/user_favorites_api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: id, action: newState ? 'add' : 'remove' }),
      });
    } catch {}
  };


  // Fetch Song and context (favorite / nav)
  useEffect(() => {
    // 1. Fetch song
    fetch(`/api.php?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.id) throw new Error('Song not found');
        setSong(data);
        setLoading(false);
        
        // Parse URL params for tkey, capo
        const params = new URLSearchParams(window.location.search);
        const urlTkey = params.get('tkey');
        const urlCapo = params.get('capo');
        
        let initialTargetKey = null;

        // 2. Fetch favorite status and target_key
        if (user) {
          fetch(`/user_favorites_api.php?action=get_favorite&song_id=${id}`)
            .then(r => r.json())
            .then(favData => {
              setIsFavorite(favData.favorite);
              initialTargetKey = urlTkey || favData.target_key;
              if (initialTargetKey) {
                setTargetKey(initialTargetKey);
                // Calculate semi
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
        
        // Handle Capo from URL or Legacy Storage
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
        
        // Add to recently viewed
        if (user) {
          fetch('/account_api.php?action=add_recent_view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: id })
          }).catch(()=>{});
        }
      })
      .catch(err => {
        setError(msg.error);
        setLoading(false);
      });
  }, [id, user]);

  useEffect(() => {
    // Fetch Setlist Nav from legacy URL structure
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

    // List logic for native react app
    const listQuery = params.get('list');
    if (listQuery) {
      setListType(listQuery);
      if (listQuery === 'favorites' && user) {
        fetch('/user_favorites_api.php?action=get_favorites')
          .then(r => r.json())
          .then(d => {
            if (Array.isArray(d)) {
              setNavList(d);
              setNavIndex(d.findIndex(s => String(s.id) === String(id)));
            }
          });
      } else if (listQuery.startsWith('setlist_')) {
        const setId = listQuery.split('_')[1];
        fetch(`/setlists_api.php?action=get_setlist_items&setlist_id=${setId}`)
          .then(r => r.json())
          .then(d => {
            if (d && d.items && d.setlist) {
              setNavList(d.items);
              setNavIndex(d.items.findIndex(s => String(s.song_id) === String(id)));
              
              // Role-based automatic view mode
              if (d.setlist.team_role === 'vocalist' && !localStorage.getItem('view_mode_overridden')) {
                setViewMode('lyrics');
              }
            }
          });
      }
    }
  }, [id, user]);

  const toggleToolbar = () => setToolbarVisible(!toolbarVisible);

  const increaseFontSize = (e) => { 
    e.stopPropagation(); 
    setFontSize(prev => {
      const v = Math.min(prev + 2, 40);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  const decreaseFontSize = (e) => { 
    e.stopPropagation(); 
    setFontSize(prev => {
      const v = Math.max(prev - 2, 14);
      localStorage.setItem('song_font_size', v);
      return v;
    }); 
  };
  
  const changeTranspose = (amount, e) => {
    e.stopPropagation();
    setSemi(prev => prev + amount);
  };
  const resetTranspose = (e) => {
    e.stopPropagation();
    setSemi(0);
    setCapo(0);
    localStorage.setItem(`capo_${id}`, 0);
  };
  
  const changeCapo = (amount, e) => {
    if (e) e.stopPropagation();
    setCapo(prev => {
      const v = Math.max(0, Math.min(prev + amount, 11));
      localStorage.setItem(`capo_${id}`, v);
      localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
      return v;
    });
  };

  const toggleViewMode = (e) => {
    if (!e) return;
    e.stopPropagation();
    setViewMode(prev => {
      let next = 'chords';
      if (prev === 'chords') next = 'lyrics';
      else if (prev === 'lyrics') next = 'both';
      localStorage.setItem('song_view_mode', next);
      return next;
    });
  };

  // Touch Swipe for Navigation
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };
  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStart.x;
    const dy = touchEndY - touchStart.y;
    
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

    if (setlistNavData) {
      if (dx > 0 && setlistNavData.prev) navigateToSetlistSong(setlistNavData.prev);
      else if (dx < 0 && setlistNavData.next) navigateToSetlistSong(setlistNavData.next);
    } else if (navList.length > 0 && navIndex >= 0) {
      if (dx > 0 && navIndex > 0) {
        navigate(`/song/${listType.startsWith('setlist_') ? navList[navIndex-1].song_id : navList[navIndex-1].id}?list=${listType}`);
      } else if (dx < 0 && navIndex < navList.length - 1) {
        navigate(`/song/${listType.startsWith('setlist_') ? navList[navIndex+1].song_id : navList[navIndex+1].id}?list=${listType}`);
      }
    }
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

  const saveFavoriteKey = async (e, currentPlayKey) => {
    e.stopPropagation();
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
        setFavMsg(msg.keySavedAlert);
        setTimeout(() => setFavMsg(''), 2000);
      }
    } catch {}
  };

  const toggleAutoScroll = (e) => {
    e.stopPropagation();
    setIsAutoScrolling(!isAutoScrolling);
    setToolbarVisible(true);
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('song_view_mode', mode);
    localStorage.setItem('view_mode_overridden', 'true');
  };

  if (loading || authLoading) {
    return (
      <div className="stage-reader loading-state">
        <p>{msg.loading}</p>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="stage-reader error-state">
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>{msg.back}</button>
      </div>
    );
  }
  
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

  const currentChords = song.chords ? renderWithChords(song.chords, semi - capo, useFlats) : '';
  const currentLyrics = song.lyrics || 'Բառերը հասանելի չեն';

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadTxt = () => {
    const text = viewMode === 'chords' 
      ? currentChords.replace(/<[^>]*>?/gm, '') 
      : currentLyrics;
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const fileName = `${song.title || 'song'} (${soundingKey || song.song_key || ''}).txt`.replace(/[\\/:*?"<>|]+/g, '');
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = fileName; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url);
  };

  const getRequestEditUrl = () => {
    if (!id) return '#';
    return `/song-request?song_id=${encodeURIComponent(String(id))}`;
  };

  return (
    <div className="page-container song-view-page">
      <div className="song-view-main">
        {/* Left Column: Song Content */}
        <div className="song-content">
          <div className="card glass-panel" style={{ padding: '24px' }}>
            <div className="song-header">
              <div className="song-header-main">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <h1 className="song-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h1>
                    <div className="song-artist">{song.artist}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="icon-btn" onClick={copyShareLink} title="Կիսվել (Share)" style={{ color: 'var(--color-text-dim)' }}>
                      ⤴
                    </button>
                    <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen" style={{ color: 'var(--color-text-dim)' }}>
                      ⛶
                    </button>
                    <button className={`icon-btn fav-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite} title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill={isFavorite ? '#FF4A6A' : 'none'} stroke={isFavorite ? '#FF4A6A' : 'currentColor'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="info-row">

                  <div className="info-pill">{msg.keyPrefix} {soundingKey || '?'}</div>
                  {song.bpm && <div className="info-pill">BPM: {song.bpm}</div>}
                  {song.tags && <div className="info-pill">{song.tags}</div>}
                  {capo > 0 && <div className="info-pill" style={{color: '#ffcc00'}}>{msg.playAs} {playingKey} (Capo {capo})</div>}
                  <Link to={getRequestEditUrl()} className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    {msg.requestEdit}
                  </Link>
                </div>
              </div>
            </div>

            <div className={`chords-container ${viewMode === 'lyrics' ? 'lyrics-only-mode' : ''}`} style={{ fontSize: `${fontSize}px` }}>
              {viewMode === 'chords' && song.chords ? (
                <pre className="chords-block" dangerouslySetInnerHTML={{ __html: currentChords }} />
              ) : viewMode === 'both' && song.chords ? (
                <>
                  <pre className="chords-block" dangerouslySetInnerHTML={{ __html: currentChords }} />
                  <pre className="lyrics-block" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>{currentLyrics}</pre>
                </>
              ) : (
                <pre className="lyrics-block">{currentLyrics}</pre>
              )}
            </div>
            
            <div className="view-modes">
              <button className={`btn btn-sm ${viewMode === 'chords' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleViewModeChange('chords')}>{msg.chordsOnly}</button>
              <button className={`btn btn-sm ${viewMode === 'lyrics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleViewModeChange('lyrics')}>{msg.lyricsOnly}</button>
              <button className={`btn btn-sm ${viewMode === 'both' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleViewModeChange('both')}>{msg.bothModes}</button>
            </div>
          </div>
        </div>

        {/* Right Column: Controls Panel */}
        <div className="song-control-panel">
          <div className="card glass-panel control-panel-inner">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title">{msg.transpose}</div>
              <label className="checkbox-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                <input type="checkbox" checked={useFlats} onChange={e => setUseFlats(e.target.checked)} /> {msg.useFlats}
              </label>
            </div>
            
            <div className="keys-grid">
              {KEYS.map(k => {
                let isActive = false;
                if (soundingKey) {
                  const rootMatch = soundingKey.match(/^([A-G](?:#|b)?)/i);
                  const activeRoot = rootMatch ? rootMatch[1] : soundingKey;
                  // Handle enharmonic equivalents for active state (e.g. Bb == A#)
                  isActive = noteIndex(activeRoot) === noteIndex(k);
                }
                return (
                  <button 
                    key={k} 
                    className={`key-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleKeyClick(k)}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            
            <input 
              type="range" 
              min="-11" max="11" 
              value={semi} 
              onChange={e => setSemi(parseInt(e.target.value, 10))}
              style={{ width: '100%', margin: '12px 0 4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '12px' }}>
              <span>{semi} {msg.semitones}</span>
              <span style={{ cursor: 'pointer', color: 'var(--color-accent-cyan)' }} onClick={() => setSemi(0)}>{msg.reset}</span>
            </div>

            {isFavorite && (
              <div style={{ marginTop: '16px' }}>
                <button 
                  className={`btn w-100 ${isKeySaved ? 'btn-secondary' : 'btn-primary'}`} 
                  onClick={(e) => saveFavoriteKey(e, playingKey)}
                  disabled={isKeySaved}
                >
                  {isKeySaved ? msg.keyIsSaved : msg.saveKey}
                </button>
              </div>
            )}

            <div className="capo-wrap" style={{marginTop: '16px'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Capo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{msg.capoSub}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="form-control" 
                  value={capo} 
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setCapo(v);
                    localStorage.setItem(`capo_${id}`, v);
                    localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: v, capo_mode: v > 0 ? 1 : 0 }));
                  }}
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '0.9rem', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="0">{msg.noCapo}</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>Capo {n}</option>
                  ))}
                </select>
                {capo > 0 && (
                  <button className="btn btn-secondary" style={{ padding: '0 16px', borderRadius: '10px', backgroundColor: 'rgba(255,74,106,0.1)', color: '#FF4A6A', border: '1px solid rgba(255,74,106,0.2)' }} onClick={() => { 
                    setCapo(0); 
                    localStorage.setItem(`capo_${id}`, 0); 
                    localStorage.setItem(`song_capo_pref:${id}`, JSON.stringify({ capo: 0, capo_mode: 0 }));
                  }}>✕ {msg.clear}</button>
                )}
              </div>
            </div>

            <div className="font-panel" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{msg.fontSize}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={decreaseFontSize}>A-</button>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '30px', textAlign: 'center' }}>{fontSize}</span>
                <button className="btn btn-secondary btn-sm" onClick={increaseFontSize}>A+</button>
              </div>
            </div>

            <button className="btn btn-secondary w-100" style={{ marginTop: '12px' }} onClick={handleDownloadTxt}>
              {msg.downloadTxt}
            </button>

          </div>
        </div>
      </div>

      {/* Legacy Setlist API Navigation */}
      {setlistNavData && (
        <div className="seq-nav">
          <button 
            className="seq-btn" 
            disabled={!setlistNavData.prev}
            onClick={() => navigateToSetlistSong(setlistNavData.prev)}
          >
            ←
          </button>
          <div className="seq-info">
            <div className="seq-count">{setlistNavData.index} / {setlistNavData.total}</div>
            <div className="seq-title">{setlistNavData.setlist?.name || 'Setlist'}</div>
          </div>
          <button 
            className="seq-btn" 
            disabled={!setlistNavData.next}
            onClick={() => navigateToSetlistSong(setlistNavData.next)}
          >
            →
          </button>
        </div>
      )}

      {/* Sequential Navigation (Bottom Floating Bar) */}
      {!setlistNavData && navList.length > 0 && navIndex >= 0 && (
        <div className="seq-nav">
          <button 
            className="seq-btn" 
            disabled={navIndex === 0}
            onClick={() => navigate(`/song/${listType.startsWith('setlist_') ? navList[navIndex-1].song_id : navList[navIndex-1].id}?list=${listType}`)}
          >
            ←
          </button>
          <div className="seq-info">
            <div className="seq-count">{navIndex + 1} / {navList.length}</div>
            <div className="seq-title">{listType === 'favorites' ? 'Պահպանվածներ' : 'Երգացանկ'}</div>
          </div>
          <button 
            className="seq-btn" 
            disabled={navIndex === navList.length - 1}
            onClick={() => navigate(`/song/${listType.startsWith('setlist_') ? navList[navIndex+1].song_id : navList[navIndex+1].id}?list=${listType}`)}
          >
            →
          </button>
        </div>
      )}

      {favMsg && (
        <div className="toast-message">{favMsg}</div>
      )}
    </div>
  );
}
