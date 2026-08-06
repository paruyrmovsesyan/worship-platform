import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Privacy.css';

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [privacyData, setPrivacyData] = useState({
    title: 'Գաղտնիության Քաղաքականություն',
    subtitle: 'Ձեր անձնական տվյալների պաշտպանությունն ու գաղտնիությունը մեր առաջնահերթությունն է:',
    content: '',
    updated_at: ''
  });

  usePageReady(loading);

  useEffect(() => {
    fetch('/api.php?action=privacy_config')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          setPrivacyData(data);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  // Parse markdown headings (### 1. Title) into formatted sections
  const formatContent = (rawText) => {
    if (!rawText) return null;
    const blocks = rawText.split('\n\n');
    return blocks.map((block, idx) => {
      if (block.startsWith('### ')) {
        const lines = block.split('\n');
        const heading = lines[0].replace('### ', '');
        const body = lines.slice(1).join('\n');
        return (
          <div className="privacy-section-card" key={idx}>
            <h3>{heading}</h3>
            <p>{body}</p>
          </div>
        );
      }
      return (
        <div className="privacy-section-card" key={idx}>
          <p>{block}</p>
        </div>
      );
    });
  };

  return (
    <div className="website-privacy-page animate-fade-in">
      {/* HERO BANNER */}
      <section className="privacy-hero">
        <div className="privacy-hero-glow" />
        <div className="privacy-hero-badge">🔒 LEGAL & PRIVACY POLICY</div>
        <h1>{privacyData.title}</h1>
        <p>{privacyData.subtitle}</p>

        {privacyData.updated_at && (
          <div className="privacy-updated-tag">
            <span>📅 Վերջին թարմացում՝ {new Date(privacyData.updated_at).toLocaleDateString('hy-AM')}</span>
          </div>
        )}
      </section>

      {/* QUICK HIGHLIGHT CARDS */}
      <section className="privacy-highlights-grid">
        <div className="highlight-card">
          <span className="highlight-icon">🛡️</span>
          <h4>SSL/TLS Ծածկագրում</h4>
          <p>Բոլոր տվյալներն ու փոխանցումները պաշտպանված են անվտանգ ծածկագրմամբ:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">🚫</span>
          <h4>Երրորդ անձանց Չենք Փոխանցում</h4>
          <p>Ձեր անձնական տվյալները կամ երգացանկերը չեն վաճառվում կամ փոխանցվում:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">⚙️</span>
          <h4>Լիակատար Վերահսկողություն</h4>
          <p>Դուք ցանկացած պահի կարող եք թարմացնել կամ ջնջել Ձեր հաշիվը:</p>
        </div>
      </section>

      {/* MAIN CONTENT SECTIONS */}
      <section className="privacy-body-container">
        {formatContent(privacyData.content)}
      </section>

      {/* CONTACT QUESTIONS FOOTER */}
      <section className="privacy-contact-card">
        <h3>Հարցեր ունե՞ք Գաղտնիության Վերաբերյալ</h3>
        <p>Եթե ունեք հարցեր Ձեր տվյալների պաշտպանության կամ քաղաքականության վերաբերյալ, դիմեք մեր թիմին:</p>
        <button className="btn-privacy-contact" onClick={() => navigate('/contact')}>
          💬 Կապ Հաստատել Մեզ Հետ
        </button>
      </section>
    </div>
  );
}
