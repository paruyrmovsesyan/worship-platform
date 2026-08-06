import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';
import { renderWithChords } from '../utils/chordTransposer';
import './SongRequest.css';

const COMMON_KEYS = [
  '', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
];

export default function SongRequest() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const songIdParam = searchParams.get('song_id');
  const songId = songIdParam ? parseInt(songIdParam, 10) : 0;
  const isEditMode = songId > 0;
  
  const [loading, setLoading] = useState(isEditMode);
  usePageReady(loading || authLoading);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  
  const [formData, setFormData] = useState({
    title_hy: '',
    title_lat: '',
    title_en: '',
    title_ru: '',
    artist: '',
    song_key: '',
    bpm: '',
    tags: '',
    chords: '',
    lyrics: '',
    submitted_message: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetch(`/api.php?id=${songId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            setFormData(prev => ({
              ...prev,
              title_hy: data.title_hy || data.title || '',
              title_lat: data.title_lat || '',
              title_en: data.title_en || '',
              title_ru: data.title_ru || '',
              artist: data.artist || '',
              song_key: data.song_key || '',
              bpm: data.bpm || '',
              tags: data.tags || '',
              chords: data.chords || '',
              lyrics: data.lyrics || ''
            }));
          } else {
            setError(t('songRequest.songDataLoadError', 'Չհաջողվեց բեռնել երգի տվյալները'));
          }
          setLoading(false);
        })
        .catch(() => {
          setError(t('songRequest.songDataLoadError', 'Չհաջողվեց բեռնել երգի տվյալները'));
          setLoading(false);
        });
    }
  }, [songId, isEditMode, t]);

  const [requestMode, setRequestMode] = useState(isEditMode ? 'full' : 'quick');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(t('songRequest.needLogin', 'Հարցում ուղարկելու համար նախ մուտք գործիր։'));
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess('');
    
    const payload = {
      request_type: isEditMode ? 'edit' : 'new',
      song_id: songId,
      request_mode: requestMode,
      ...formData,
      bpm: formData.bpm ? parseInt(formData.bpm, 10) : 0
    };
    
    try {
      const res = await fetch('/song_requests_api.php?action=submit_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.ok !== false) {
        setSuccess(data.message || t('songRequest.success', 'Հարցումը հաջողությամբ ուղարկվեց:'));
        if (!isEditMode) {
          setFormData({
            title_hy: '', title_lat: '', title_en: '', title_ru: '',
            artist: '', song_key: '', bpm: '', tags: '', chords: '', lyrics: '', submitted_message: ''
          });
        }
      } else {
        setError(data.message || t('songRequest.submitError', 'Չհաջողվեց ուղարկել հարցումը'));
      }
    } catch (err) {
      setError(t('songRequest.networkError', 'Ցանցային սխալ'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="song-request-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>{t('songRequest.needLogin', 'Հարցում ուղարկելու համար նախ մուտք գործիր։')}</h2>
        <button className="song-request-submit-btn" onClick={() => navigate(`/login?next=/song-request?song_id=${songId}`)} style={{ maxWidth: '280px', margin: '24px auto 0' }}>
          {t('auth.loginBtn', 'Մուտք')}
        </button>
      </div>
    );
  }

  if (loading || authLoading) {
    return null;
  }

  return (
    <div className="song-request-container animate-fade-in">
      <div className="song-request-header">
        <button className="song-request-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="song-request-title-area">
          <span className={`song-request-badge ${isEditMode ? 'badge-edit' : 'badge-new'}`}>
            {isEditMode ? t('songRequest.badgeEdit', '✏️ Խմբագրման Առաջարկ') : t('songRequest.badgeNew', '✨ Նոր Երգի Առաջարկ')}
          </span>
          <h1 className="song-request-title">
            {isEditMode ? t('songRequest.titleEdit', 'Խմբագրել երգը') : t('songRequest.titleNew', 'Առաջարկել Նոր Երգ')}
          </h1>
        </div>
      </div>

      {!isEditMode && (
        <div className="song-request-tabs">
          <button
            type="button"
            className={`song-request-tab-btn ${requestMode === 'quick' ? 'active' : ''}`}
            onClick={() => setRequestMode('quick')}
          >
            {t('songRequest.modeQuick', '⚡ Արագ Հարցում')}
          </button>
          <button
            type="button"
            className={`song-request-tab-btn ${requestMode === 'full' ? 'active' : ''}`}
            onClick={() => setRequestMode('full')}
          >
            {t('songRequest.modeFull', '🎼 Ամբողջական Տվյալներ')}
          </button>
        </div>
      )}

      {error && (
        <div className="song-request-banner banner-err">
          <span>⚠️ {error}</span>
          <button className="song-popover-close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {success && (
        <div className="song-request-banner banner-ok">
          <span>✅ {success}</span>
          {isEditMode && (
            <button className="preview-toggle-btn" onClick={() => navigate(`/song/${songId}`)}>
              {t('songRequest.backToSong', 'Վերադառնալ երգին')}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        {/* Quick Mode Layout */}
        {!isEditMode && requestMode === 'quick' ? (
          <>
            <div className="song-request-hint-box">
              💡 {t('songRequest.quickHint', 'Գրեք երգի վերնագիրը, հեղինակին կամ YouTube / MP3 հղումը։ Մեր թիմը կգտնի երգը, կտրանսպոզավորի ակորդները և կավելացնի։')}
            </div>

            <div className="song-request-card">
              <div className="song-request-card-header">
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">🎵</span>
                  {t('songRequest.basicsSection', 'Հիմնական Տվյալներ')}
                </h3>
              </div>
              <div className="song-request-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="song-request-field">
                  <label className="song-request-label">
                    {t('songRequest.titleHy', 'Վերնագիր / Երգի անուն')} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="title_hy"
                    value={formData.title_hy}
                    onChange={handleChange}
                    placeholder={t('songRequest.quickTitlePlaceholder', 'Օրինակ՝ Օրհնիր Տեր կամ Hillsong - Oceans')}
                    required
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.artist', 'Հեղինակ / Խումբ')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    placeholder="Օրինակ՝ Hillsong Worship"
                  />
                </div>
              </div>
            </div>

            <div className="song-request-card">
              <div className="song-request-card-header" style={{ marginBottom: '12px' }}>
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">🔗</span>
                  YouTube / MP3 Հղում կամ նշումներ
                </h3>
              </div>
              <textarea
                className="song-request-textarea"
                name="submitted_message"
                value={formData.submitted_message}
                onChange={handleChange}
                rows="4"
                placeholder={t('songRequest.quickNotesPlaceholder', 'Տեղադրեք YouTube / MP3 հղում կամ նշումներ (օրինակ՝ "Խնդրում եմ ավելացնել G տոնայնությամբ")...')}
              />
            </div>
          </>
        ) : (
          /* Full Mode / Edit Mode Layout */
          <>
            {/* Section 1: Basic Titles */}
            <div className="song-request-card">
              <div className="song-request-card-header">
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">🎵</span>
                  {t('songRequest.basicsSection', 'Հիմնական Տվյալներ')}
                </h3>
              </div>
              <div className="song-request-grid">
                <div className="song-request-field">
                  <label className="song-request-label">
                    {t('songRequest.titleHy', 'Վերնագիր (Հայերեն)')} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="title_hy"
                    value={formData.title_hy}
                    onChange={handleChange}
                    placeholder="Օրինակ՝ Օրհնիր Տեր"
                    required
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.titleLat', 'Վերնագիր (Լատինատառ)')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="title_lat"
                    value={formData.title_lat}
                    onChange={handleChange}
                    placeholder="Օրինակ՝ Orhnir Ter"
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.titleEn', 'Վերնագիր (Անգլերեն)')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="title_en"
                    value={formData.title_en}
                    onChange={handleChange}
                    placeholder="Example: Bless the Lord"
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.titleRu', 'Վերնագիր (Ռուսերեն)')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="title_ru"
                    value={formData.title_ru}
                    onChange={handleChange}
                    placeholder="Пример: Благослови Господь"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Musical Details */}
            <div className="song-request-card">
              <div className="song-request-card-header">
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">🎼</span>
                  {t('songRequest.musicSection', 'Երաժշտական Մանրամասներ')}
                </h3>
              </div>
              <div className="song-request-grid">
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.artist', 'Հեղինակ / Խումբ')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    placeholder="Օրինակ՝ Hillsong Worship"
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.songKey', 'Տոնայնություն')}</label>
                  <select
                    className="song-request-select"
                    name="song_key"
                    value={formData.song_key}
                    onChange={handleChange}
                  >
                    <option value="">{t('songRequest.selectKeyPlaceholder', '-- Ընտրել Տոնայնությունը --')}</option>
                    {COMMON_KEYS.filter(Boolean).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.bpm', 'BPM (Տեմպ)')}</label>
                  <input
                    type="number"
                    className="song-request-input"
                    name="bpm"
                    value={formData.bpm}
                    onChange={handleChange}
                    placeholder="72"
                  />
                </div>
                <div className="song-request-field">
                  <label className="song-request-label">{t('songRequest.tags', 'Թեգեր')}</label>
                  <input
                    type="text"
                    className="song-request-input"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="Worship, Fast, Praise"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Lyrics & Chords */}
            <div className="song-request-card">
              <div className="song-request-card-header">
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">📜</span>
                  {t('songRequest.lyricsAndChordsSection', 'Ակորդներ և Տեքստ')}
                </h3>
                {formData.chords && (
                  <button
                    type="button"
                    className={`preview-toggle-btn ${isPreviewActive ? 'active' : ''}`}
                    onClick={() => setIsPreviewActive(p => !p)}
                  >
                    {isPreviewActive ? t('songRequest.edit', '✏️ Խմբագրել') : t('songRequest.preview', '👁️ Նախադիտում')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {isPreviewActive ? (
                  <div className="song-request-field">
                    <label className="song-request-label">{t('songRequest.chordsPreview', 'Ակորդների Նախադիտում')}</label>
                    <div
                      className="chords-preview-block"
                      dangerouslySetInnerHTML={{ __html: renderWithChords(formData.chords, 0, false) }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="song-request-field">
                      <label className="song-request-label">{t('songRequest.chords', 'Ակորդներ (ստանդարտ ֆորմատով)')}</label>
                      <textarea
                        className="song-request-textarea code-font"
                        name="chords"
                        value={formData.chords}
                        onChange={handleChange}
                        rows="9"
                        placeholder="[Verse 1]&#10;Am        F        C        G&#10;..."
                      />
                    </div>
                    <div className="song-request-field">
                      <label className="song-request-label">{t('songRequest.lyrics', 'Բառեր (առանց ակորդների)')}</label>
                      <textarea
                        className="song-request-textarea"
                        name="lyrics"
                        value={formData.lyrics}
                        onChange={handleChange}
                        rows="7"
                        placeholder="[Verse 1]&#10;..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Notes */}
            <div className="song-request-card">
              <div className="song-request-card-header" style={{ marginBottom: '12px' }}>
                <h3 className="song-request-card-title">
                  <span className="song-request-card-icon">💬</span>
                  {t('songRequest.message', 'Նշում մոդերատորին (ոչ պարտադիր)')}
                </h3>
              </div>
              <textarea
                className="song-request-textarea"
                name="submitted_message"
                value={formData.submitted_message}
                onChange={handleChange}
                rows="3"
                placeholder={t('songRequest.notesPlaceholder', 'Գրեք լրացուցիչ նշումներ կամ մեկնաբանություններ մոդերատորների համար...')}
              />
            </div>
          </>
        )}

        <button type="submit" className="song-request-submit-btn" disabled={submitting}>
          {submitting
            ? t('songRequest.submitting', 'Ուղարկվում է...')
            : (isEditMode ? t('songRequest.submitBtnEdit', 'Պահպանել & Ուղարկել Խմբագրումը') : t('songRequest.submitBtnNew', 'Ուղարկել Առաջարկը'))}
        </button>
      </form>
    </div>
  );
}
