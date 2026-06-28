import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePageReady } from '../hooks/usePageReady';

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
            setError(t('songRequest.songDataLoadError'));
          }
          setLoading(false);
        })
        .catch(() => {
          setError(t('songRequest.songDataLoadError'));
          setLoading(false);
        });
    }
  }, [songId, isEditMode, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(t('songRequest.needLogin'));
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess('');
    
    const payload = {
      request_type: isEditMode ? 'edit' : 'new',
      song_id: songId,
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
        setSuccess(data.message || t('songRequest.success'));
        if (!isEditMode) {
          setFormData({
            title_hy: '', title_lat: '', title_en: '', title_ru: '',
            artist: '', song_key: '', bpm: '', tags: '', chords: '', lyrics: '', submitted_message: ''
          });
        }
      } else {
        setError(data.message || 'Failed to submit request');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>{t('songRequest.needLogin')}</h2>
        <button className="btn btn-primary" onClick={() => navigate(`/login?next=/song-request?song_id=${songId}`)} style={{ marginTop: '24px' }}>
          {t('auth.loginBtn')}
        </button>
      </div>
    );
  }

  if (loading || authLoading) {
    return null;
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="icon-btn" onClick={() => navigate(-1)} style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>
          {isEditMode ? t('songRequest.titleEdit') : t('songRequest.titleNew')}
        </h1>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {error && <div className="toast-message" style={{ background: '#FF4A6A', position: 'relative', transform: 'none', marginBottom: '24px' }}>{error}</div>}
        {success && <div className="toast-message" style={{ background: '#60d394', position: 'relative', transform: 'none', marginBottom: '24px' }}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Basic Titles */}
          <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--color-surface-hover)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--color-accent-gold)' }}>Հիմնական Տվյալներ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.titleHy')} *</label>
                <input type="text" className="form-control w-100" name="title_hy" value={formData.title_hy} onChange={handleChange} required style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.titleLat')}</label>
                <input type="text" className="form-control w-100" name="title_lat" value={formData.title_lat} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.titleEn')}</label>
                <input type="text" className="form-control w-100" name="title_en" value={formData.title_en} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.titleRu')}</label>
                <input type="text" className="form-control w-100" name="title_ru" value={formData.title_ru} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            </div>
          </div>

          {/* Section 2: Musical Details */}
          <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--color-surface-hover)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--color-accent-cyan)' }}>Երաժշտական Մանրամասներ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.artist')}</label>
                <input type="text" className="form-control w-100" name="artist" value={formData.artist} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.songKey')}</label>
                <input type="text" className="form-control w-100" name="song_key" value={formData.song_key} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} placeholder="" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.bpm')}</label>
                <input type="number" className="form-control w-100" name="bpm" value={formData.bpm} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} placeholder="" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.tags')}</label>
                <input type="text" className="form-control w-100" name="tags" value={formData.tags} onChange={handleChange} style={{ background: 'rgba(255,255,255,0.03)' }} placeholder="" />
              </div>
            </div>
          </div>

          {/* Section 3: Lyrics & Chords */}
          <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--color-surface-hover)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.lyrics')}</label>
                <textarea className="form-control w-100" name="lyrics" value={formData.lyrics} onChange={handleChange} rows="8" style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)' }}></textarea>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.chords')}</label>
                <textarea className="form-control w-100" name="chords" value={formData.chords} onChange={handleChange} rows="8" style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)' }}></textarea>
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--color-surface-hover)' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t('songRequest.message')}</label>
            <textarea className="form-control w-100" name="submitted_message" value={formData.submitted_message} onChange={handleChange} rows="3" style={{ background: 'rgba(255,255,255,0.03)' }}></textarea>
          </div>

          <button type="submit" className="btn btn-primary w-100" style={{ padding: '16px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 600 }} disabled={submitting}>
            {submitting ? t('songRequest.submitting') : t('songRequest.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
