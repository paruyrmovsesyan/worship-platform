import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Terms.css';

export default function Terms() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [termsData, setTermsData] = useState({
    title: 'Օգտագործման Պայմաններ',
    subtitle: 'Worship Platform-ից օգտվելու կանոնները, իրավունքներն ու պարտականությունները:',
    content: '',
    updated_at: ''
  });

  usePageReady(loading);

  useEffect(() => {
    fetch('/api.php?action=terms_config')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          setTermsData(data);
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
          <div className="terms-section-card" key={idx}>
            <h3>{heading}</h3>
            <p>{body}</p>
          </div>
        );
      }
      return (
        <div className="terms-section-card" key={idx}>
          <p>{block}</p>
        </div>
      );
    });
  };

  return (
    <div className="website-terms-page animate-fade-in">
      {/* HERO BANNER */}
      <section className="terms-hero">
        <div className="terms-hero-glow" />
        <div className="terms-hero-badge">📜 TERMS OF SERVICE</div>
        <h1>{termsData.title}</h1>
        <p>{termsData.subtitle}</p>

        {termsData.updated_at && (
          <div className="terms-updated-tag">
            <span>📅 Վերջին թարմացում՝ {new Date(termsData.updated_at).toLocaleDateString('hy-AM')}</span>
          </div>
        )}
      </section>

      {/* QUICK HIGHLIGHT CARDS */}
      <section className="terms-highlights-grid">
        <div className="highlight-card">
          <span className="highlight-icon">⚖️</span>
          <h4>Հեղինակային Իրավունք</h4>
          <p>Երգերն ու ակորդները տեղադրվում են ուսուցողական և հոգևոր ծառայության համար:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">🤝</span>
          <h4>Թիմային Համագործակցություն</h4>
          <p>Երգացանկերն ու խմբային չաթերը նախատեսված են թիմային աշխատանքը հեշտացնելու համար:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">🔒</span>
          <h4>Անվտանգ Օգտագործում</h4>
          <p>Յուրաքանչյուր օգտատեր պատասխանատու է իր հաշվի տվյալների անվտանգության համար:</p>
        </div>
      </section>

      {/* MAIN CONTENT SECTIONS */}
      <section className="terms-body-container">
        {formatContent(termsData.content)}
      </section>

      {/* CONTACT QUESTIONS FOOTER */}
      <section className="terms-contact-card">
        <h3>Ունե՞ք Հարցեր Պայմանների Վերաբերյալ</h3>
        <p>Եթե ունեք հարցեր կամ առաջարկություններ օգտագործման պայմանների վերաբերյալ, դիմեք մեր թիմին:</p>
        <button className="btn-terms-contact" onClick={() => navigate('/contact')}>
          💬 Կապ Հաստատել Մեզ Հետ
        </button>
      </section>
    </div>
  );
}
