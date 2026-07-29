import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';
import { getSongCoverStyle } from '../utils/songCover';
import './SetlistPublicWeb.css';

export default function SetlistPublicWeb() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const token = searchParams.get('token')
    || searchParams.get('t')
    || searchParams.get('share')
    || (window.location.hash ? window.location.hash.replace('#', '') : '');

  const [setlist, setSetlist] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  usePageReady(isLoading);

  useEffect(() => {
    if (!token) {
      setError(t('setlists.invalidToken', 'Անվավեր կամ բացակայող հղում։'));
      setIsLoading(false);
      return;
    }

    fetch(`/setlists_api.php?action=get_public_setlist&token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.setlist) {
          setSetlist(data.setlist);
          setItems(Array.isArray(data.items) ? data.items : []);
          setError(null);
        } else {
          setError(data.error || t('setlists.notFound', 'Երգացանկը չի գտնվել'));
        }
      })
      .catch(err => {
        console.error(err);
        setError(t('setlists.errorLoad', 'Չհաջողվեց բեռնել երգացանկի տվյալները։'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + `/setlists/public?token=${token}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => console.error(err));
  };

  const handleSaveToAccount = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!setlist || isImporting) return;
    setIsImporting(true);

    try {
      // Create new setlist based on public setlist
      const createRes = await fetch('/setlists_api.php?action=create_setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${setlist.name} (${t('setlists.importedTag', 'Պատճեն')})`,
          service_date: setlist.service_date || ''
        })
      });
      const createData = await createRes.json();

      if (!createData.ok || !createData.id) {
        throw new Error(createData.error || 'Failed to create setlist');
      }

      const newId = createData.id;

      // Duplicate/Add items
      for (const item of items) {
        if (item.item_type === 'section') {
          await fetch('/setlists_api.php?action=add_section_to_setlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setlist_id: newId,
              title: item.title || 'Section'
            })
          });
        } else if (item.song_id) {
          await fetch('/setlists_api.php?action=add_song_to_setlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setlist_id: newId,
              song_id: item.song_id,
              target_key: item.target_key || item.original_key || '',
              capo: item.capo || 0,
              is_required: item.is_required || 0,
              notes: item.notes || ''
            })
          });
        }
      }

      navigate(`/setlists/${newId}`);
    } catch (err) {
      alert(err.message || 'Error copying setlist');
    } finally {
      setIsImporting(false);
    }
  };

  const openSong = (songId, targetKey, capo) => {
    if (!songId) return;
    let url = `/song/${songId}`;
    const params = new URLSearchParams();
    if (targetKey) params.set('key', targetKey);
    if (capo > 0) {
      params.set('capo', String(capo));
      params.set('capo_mode', '1');
    }
    const qStr = params.toString();
    if (qStr) url += `?${qStr}`;
    navigate(url);
  };

  const songsCount = items.filter(i => i.item_type !== 'section').length;
  const sectionsCount = items.filter(i => i.item_type === 'section').length;
  const requiredCount = items.filter(i => i.item_type !== 'section' && Number(i.is_required)).length;

  if (error && !isLoading) {
    return (
      <div className="pub-setlist-page animate-fade-in">
        <div className="pub-setlist-container">
          <div className="pub-error-card">
            <div className="error-icon-glow">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2>{t('setlists.errorTitle', 'Երգացանկը հասանելի չէ')}</h2>
            <p>{error}</p>
            <div className="error-actions">
              <Link to="/setlists" className="pub-btn primary">
                {t('setlists.allSetlists', 'Դիտել Երգացանկերը')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pub-setlist-page animate-fade-in">
      <div className="pub-setlist-container">
        
        {/* Navigation Breadcrumb */}
        <div className="pub-breadcrumb">
          <Link to="/setlists" className="back-link">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>{t('setlists.backToSetlists', 'Երգացանկեր')}</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="pub-hero">
          <div className="pub-hero-main">
            <div className="pub-badge">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span>{t('setlists.publicBadge', 'Հանրային Երգացանկ')}</span>
            </div>

            <h1 className="pub-title">{setlist?.name || '...'}</h1>
            
            {setlist?.description && (
              <p className="pub-description">{setlist.description}</p>
            )}

            <div className="pub-meta-row">
              {setlist?.service_date && (
                <div className="pub-meta-chip">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{setlist.service_date}</span>
                </div>
              )}

              {setlist?.service_type && (
                <div className="pub-meta-chip">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <span>{setlist.service_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pub-hero-actions">
            {setlist?.id && (
              <button
                className="pub-btn primary glow"
                onClick={() => navigate(`/setlists/${setlist.id}/live${token ? `?token=${encodeURIComponent(token)}` : ''}`)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>{t('setlists.liveMode', 'Live Ռեժիմ')}</span>
              </button>
            )}

            <button
              className="pub-btn secondary"
              onClick={handleSaveToAccount}
              disabled={isImporting}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>{isImporting ? t('setlists.saving', 'Պահպանվում է...') : t('setlists.saveToAccount', 'Պահպանել իմ հաշվում')}</span>
            </button>

            <button
              className="pub-btn secondary"
              onClick={handleCopyLink}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>{copied ? t('setlists.copied', 'Պատճենված է!') : t('setlists.copyLink', 'Պատճենել հղումը')}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="pub-stats-bar">
            <div className="pub-stat">
              <span className="val">{items.length}</span>
              <span className="lbl">{t('setlists.statItems', 'Տարրեր')}</span>
            </div>
            <div className="divider"></div>
            <div className="pub-stat">
              <span className="val">{songsCount}</span>
              <span className="lbl">{t('setlists.statSongs', 'Երգեր')}</span>
            </div>
            {sectionsCount > 0 && (
              <>
                <div className="divider"></div>
                <div className="pub-stat">
                  <span className="val">{sectionsCount}</span>
                  <span className="lbl">{t('setlists.statSections', 'Բաժիններ')}</span>
                </div>
              </>
            )}
            {requiredCount > 0 && (
              <>
                <div className="divider"></div>
                <div className="pub-stat">
                  <span className="val text-gold">{requiredCount}</span>
                  <span className="lbl">{t('setlists.statRequired', 'Պարտադիր')}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Setlist Items List */}
        <div className="pub-items-container">
          <div className="pub-items-header">
            <h3>{t('setlists.itemsTitle', 'Երգացանկի Երգեր')}</h3>
            <span className="pub-count-badge">{songsCount} {t('setlists.songsCount', 'երգ')}</span>
          </div>

          {items.length === 0 ? (
            <div className="pub-empty-items">
              <p>{t('setlists.emptySetlist', 'Երգացանկը դեռ դատարկ է։')}</p>
            </div>
          ) : (
            <div className="pub-items-list">
              {items.map((item, idx) => {
                if (item.item_type === 'section') {
                  return (
                    <div key={item.id || idx} className="pub-section-header animate-fade-in">
                      <div className="section-icon">📌</div>
                      <span className="section-title">{item.title || t('setlists.section', 'Բաժին')}</span>
                    </div>
                  );
                }

                const songTitle = item.song_title || item.title || `Song #${item.song_id}`;
                const targetKey = item.target_key || item.original_key || '';
                const artist = item.song_artist || '';

                return (
                  <div
                    key={item.id || idx}
                    className="pub-song-card animate-fade-in"
                    style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
                    onClick={() => openSong(item.song_id, targetKey, item.capo)}
                  >
                    <div className="song-card-num">{idx + 1}</div>

                    <div className="song-card-cover" style={getSongCoverStyle(item.song_id || idx, songTitle)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                    </div>

                    <div className="song-card-content">
                      <div className="title-row">
                        <h4 className="song-name">{songTitle}</h4>
                        {Number(item.is_required) === 1 && (
                          <span className="required-star-badge" title="Required song">
                            ★ {t('setlists.required', 'Պարտադիր')}
                          </span>
                        )}
                      </div>

                      {artist && <p className="song-artist">{artist}</p>}

                      <div className="chips-row">
                        {targetKey && (
                          <span className="key-chip">
                            {t('setlists.keyLabel', 'Տոն')}: <strong>{targetKey}</strong>
                          </span>
                        )}
                        {Number(item.capo || 0) > 0 && (
                          <span className="capo-chip">
                            Capo {item.capo}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <div className="song-note-box">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="song-card-arrow">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
