import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './Cookies.css';

export default function Cookies() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [cookiesData, setCookiesData] = useState({
    title: 'Cookie-ների Քաղաքականություն',
    subtitle: 'Ինչպես ենք օգտագործում Cookie ֆայլերն ու տեղային պահոցը (LocalStorage) Ձեր փորձառությունը բարելավելու համար:',
    content: '',
    updated_at: ''
  });

  usePageReady(loading);

  useEffect(() => {
    fetch('/api.php?action=cookies_config')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          setCookiesData(data);
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
          <div className="cookies-section-card" key={idx}>
            <h3>{heading}</h3>
            <p>{body}</p>
          </div>
        );
      }
      return (
        <div className="cookies-section-card" key={idx}>
          <p>{block}</p>
        </div>
      );
    });
  };

  return (
    <div className="website-cookies-page animate-fade-in">
      {/* HERO BANNER */}
      <section className="cookies-hero">
        <div className="cookies-hero-glow" />
        <div className="cookies-hero-badge">🍪 COOKIE POLICY</div>
        <h1>{cookiesData.title}</h1>
        <p>{cookiesData.subtitle}</p>

        {cookiesData.updated_at && (
          <div className="cookies-updated-tag">
            <span>📅 Վերջին թարմացում՝ {new Date(cookiesData.updated_at).toLocaleDateString('hy-AM')}</span>
          </div>
        )}
      </section>

      {/* QUICK HIGHLIGHT CARDS */}
      <section className="cookies-highlights-grid">
        <div className="highlight-card">
          <span className="highlight-icon">🔐</span>
          <h4>Անվտանգ Սեսիա</h4>
          <p>Cookie-ներն ապահովում են Ձեր ավտորիզացված մուտքն ու հաշվի պաշտպանությունը:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">⚡</span>
          <h4>Արագ Offline Cache</h4>
          <p>LocalStorage-ը թույլ է տալիս երգերն ու ակորդները դիտել նույնիսկ առանց ինտերնետի:</p>
        </div>
        <div className="highlight-card">
          <span className="highlight-icon">🚫</span>
          <h4>Առանց Գովազդների</h4>
          <p>Մենք չենք օգտագործում հետևող (tracking) կամ գովազդային cookie ֆայլեր:</p>
        </div>
      </section>

      {/* MAIN CONTENT SECTIONS */}
      <section className="cookies-body-container">
        {formatContent(cookiesData.content)}
      </section>

      {/* CONTACT QUESTIONS FOOTER */}
      <section className="cookies-contact-card">
        <h3>Հարցեր Ունե՞ք Cookie-ների Վերաբերյալ</h3>
        <p>Եթե ցանկանում եք ավելին իմանալ մեր տվյալների պաշտպանության կամ Cookie-ների մասին, կապ հաստատեք մեզ հետ:</p>
        <button className="btn-cookies-contact" onClick={() => navigate('/contact')}>
          💬 Կապ Հաստատել Մեզ Հետ
        </button>
      </section>
    </div>
  );
}
