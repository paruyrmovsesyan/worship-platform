import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function SongRequest() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const songIdParam = searchParams.get('song_id');
  const songId = songIdParam ? parseInt(songIdParam, 10) : 0;
  const isEditMode = songId > 0;
  
  const [loading, setLoading] = useState(isEditMode);
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

  const translations = {
    am: {
      titleNew: 'Ավելացնել նոր երգ',
      titleEdit: 'Խմբագրել երգը',
      needLogin: 'Հարցում ուղարկելու համար նախ մուտք գործիր։',
      songDataLoadError: 'Չհաջողվեց բեռնել երգի տվյալները:',
      titleHy: 'Վերնագիր (Հայերեն)',
      titleLat: 'Վերնագիր (Լատինատառ)',
      titleEn: 'Վերնագիր (Անգլերեն)',
      titleRu: 'Վերնագիր (Ռուսերեն)',
      artist: 'Հեղինակ / Խումբ',
      songKey: 'Տոնայնություն (Օր. C, Dm)',
      bpm: 'BPM',
      tags: 'Թեգեր',
      chords: 'Ակորդներ (ստանդարտ ֆորմատով)',
      lyrics: 'Բառեր (առանց ակորդների)',
      message: 'Նշում մոդերատորին (ոչ պարտադիր)',
      submit: 'Ուղարկել',
      submitting: 'Ուղարկվում է...',
      success: 'Հարցումը հաջողությամբ ուղարկվեց:'
    },
    en: {
      titleNew: 'Request New Song',
      titleEdit: 'Edit Song',
      needLogin: 'Please log in to submit a request.',
      songDataLoadError: 'Failed to load song data.',
      titleHy: 'Title (Armenian)',
      titleLat: 'Title (Latin)',
      titleEn: 'Title (English)',
      titleRu: 'Title (Russian)',
      artist: 'Artist / Band',
      songKey: 'Key (e.g. C, Dm)',
      bpm: 'BPM',
      tags: 'Tags',
      chords: 'Chords (standard format)',
      lyrics: 'Lyrics (without chords)',
      message: 'Message to moderator (optional)',
      submit: 'Submit Request',
      submitting: 'Submitting...',
      success: 'Request submitted successfully!'
    },
    ru: {
      titleNew: 'Добавить новую песню',
      titleEdit: 'Редактировать песню',
      needLogin: 'Пожалуйста, войдите, чтобы отправить запрос.',
      songDataLoadError: 'Не удалось загрузить данные песни.',
      titleHy: 'Название (Армянский)',
      titleLat: 'Название (Латиница)',
      titleEn: 'Название (Английский)',
      titleRu: 'Название (Русский)',
      artist: 'Исполнитель / Группа',
      songKey: 'Тональность (Напр. C, Dm)',
      bpm: 'BPM',
      tags: 'Теги',
      chords: 'Аккорды',
      lyrics: 'Слова',
      message: 'Сообщение модератору (необязательно)',
      submit: 'Отправить',
      submitting: 'Отправка...',
      success: 'Запрос успешно отправлен!'
    }
  };

  const msg = translations[language] || translations.en;

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
            setError(msg.songDataLoadError);
          }
          setLoading(false);
        })
        .catch(() => {
          setError(msg.songDataLoadError);
          setLoading(false);
        });
    }
  }, [songId, isEditMode, msg.songDataLoadError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(msg.needLogin);
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
        setSuccess(data.message || msg.success);
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
        <h2>{msg.needLogin}</h2>
        <button className="btn btn-primary" onClick={() => window.location.href = `/loginuser.php?next=/song-request?song_id=${songId}`} style={{ marginTop: '24px' }}>
          Login
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="page-container loading-state"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="icon-btn" onClick={() => navigate(-1)} style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '800', letterSpacing: '-0.03em', color: '#eef3ff' }}>
          {isEditMode ? msg.titleEdit : msg.titleNew}
        </h1>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(17, 24, 45, 0.76), rgba(11, 16, 32, 0.58))', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.24)' }}>
        {error && <div className="toast-message" style={{ background: '#FF4A6A', position: 'relative', transform: 'none', marginBottom: '24px' }}>{error}</div>}
        {success && <div className="toast-message" style={{ background: '#60d394', position: 'relative', transform: 'none', marginBottom: '24px' }}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.titleHy}</label>
              <input type="text" className="form-control w-100" name="title_hy" value={formData.title_hy} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.titleLat}</label>
              <input type="text" className="form-control w-100" name="title_lat" value={formData.title_lat} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.titleEn}</label>
              <input type="text" className="form-control w-100" name="title_en" value={formData.title_en} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.titleRu}</label>
              <input type="text" className="form-control w-100" name="title_ru" value={formData.title_ru} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.artist}</label>
              <input type="text" className="form-control w-100" name="artist" value={formData.artist} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.songKey}</label>
              <input type="text" className="form-control w-100" name="song_key" value={formData.song_key} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.bpm}</label>
              <input type="number" className="form-control w-100" name="bpm" value={formData.bpm} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.tags}</label>
              <input type="text" className="form-control w-100" name="tags" value={formData.tags} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.chords}</label>
            <textarea className="form-control w-100" name="chords" value={formData.chords} onChange={handleChange} rows="6" style={{ fontFamily: 'monospace' }}></textarea>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.lyrics}</label>
            <textarea className="form-control w-100" name="lyrics" value={formData.lyrics} onChange={handleChange} rows="6" style={{ fontFamily: 'monospace' }}></textarea>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{msg.message}</label>
            <textarea className="form-control w-100" name="submitted_message" value={formData.submitted_message} onChange={handleChange} rows="3"></textarea>
          </div>

          <button type="submit" className="btn btn-primary w-100" style={{ marginTop: '16px', padding: '14px', borderRadius: '16px' }} disabled={submitting}>
            {submitting ? msg.submitting : msg.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
