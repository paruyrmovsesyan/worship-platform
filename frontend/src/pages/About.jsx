import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePageReady } from '../hooks/usePageReady';
import './About.css';

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [aboutData, setAboutData] = useState({
    hero_title: 'Մեր Մասին',
    hero_subtitle: 'Worship Platform-ը երաժիշտների, պաշտամունքի թիմերի և առաջնորդների համար ստեղծված միասնական հարթակ է:',
    mission_title: 'Մեր Առաքելությունը',
    mission_text: 'Մեր նպատակն է ապահովել պաշտամունքի թիմերին ժամանակակից թվային գործիքներով՝ ակորդներ, երգացանկեր, տրանսպոզիցիա և իրական ժամանակում թիմային համագործակցություն:',
    vision_title: 'Մեր Տեսլականը',
    vision_text: 'Ստեղծել հզոր համայնք, որտեղ յուրաքանչյուր երաժիշտ և թիմ կկարողանա հեշտությամբ կազմակերպել իրենց ծառայությունը:',
    stat1_number: '1000+',
    stat1_label: 'Ակտիվ Երգեր',
    stat2_number: '500+',
    stat2_label: 'Պաշտամունքի Թիմեր',
    stat3_number: '10,000+',
    stat3_label: 'Օգտատերեր'
  });

  usePageReady(loading);

  useEffect(() => {
    fetch('/api.php?action=about_config')
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          setAboutData(prev => ({ ...prev, ...data }));
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="website-about-page animate-fade-in">
      {/* HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero-glow" />
        <div className="about-hero-badge">ℹ️ WORSHIP PLATFORM</div>
        <h1>{aboutData.hero_title}</h1>
        <p>{aboutData.hero_subtitle}</p>

        <div className="about-hero-actions">
          <button className="btn-about primary" onClick={() => navigate('/songs')}>
            🎵 {t('landing.browseSongs', 'Տեսնել Երգերը')}
          </button>
          <button className="btn-about secondary" onClick={() => navigate('/contact')}>
            💬 {t('nav.contact', 'Կապ Հաստատել')}
          </button>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="about-stats-grid">
        <div className="about-stat-card">
          <strong>{aboutData.stat1_number}</strong>
          <span>{aboutData.stat1_label}</span>
        </div>
        <div className="about-stat-card">
          <strong>{aboutData.stat2_number}</strong>
          <span>{aboutData.stat2_label}</span>
        </div>
        <div className="about-stat-card">
          <strong>{aboutData.stat3_number}</strong>
          <span>{aboutData.stat3_label}</span>
        </div>
      </section>

      {/* MISSION & VISION BENTO */}
      <section className="about-bento-grid">
        <div className="bento-card mission">
          <div className="bento-icon">🎯</div>
          <h3>{aboutData.mission_title}</h3>
          <p>{aboutData.mission_text}</p>
        </div>

        <div className="bento-card vision">
          <div className="bento-icon">🚀</div>
          <h3>{aboutData.vision_title}</h3>
          <p>{aboutData.vision_text}</p>
        </div>
      </section>

      {/* KEY FEATURES HIGHLIGHT */}
      <section className="about-features-section">
        <h2 className="section-title">✨ Հարթակի Առավելությունները</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🎼</span>
            <h4>Ակորդներ & Տրանսպոզիցիա</h4>
            <p>Փոխեք երգի տոնայնությունը (Key) և Capo-ն մեկ սեղմումով՝ ակնթարթային ավտոմատ ակորդների թարմացմամբ:</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">📋</span>
            <h4>Թիմային Երգացանկեր</h4>
            <p>Կազմեք կիրակնօրյա երգացանկեր, կիսվեք թիմակիցների հետ և պատրաստվեք պաշտամունքին միասին:</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">💬</span>
            <h4>Իրական Ժամանակում Չաթ</h4>
            <p>Կապվեք Ձեր թիմի անդամների հետ, քննարկեք երգացանկերը և ուղարկեք հաղորդագրություններ:</p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">📲</span>
            <h4>Multi-platform & PWA</h4>
            <p>Օգտագործեք հարթակը ցանկացած սարքից՝ համակարգչից (Web) կամ հեռախոսից (PWA app)։</p>
          </div>
        </div>
      </section>

      {/* JOIN COMMUNITY CTA */}
      <section className="about-cta-card">
        <h2>Միացեք Worship Platform-ին Այսօր</h2>
        <p>Սկսեք կազմակերպել Ձեր պաշտամունքի ծառայությունը ժամանակակից թվային գործիքներով:</p>
        <button className="btn-about primary" onClick={() => navigate('/login')}>
          🚀 Միանալ Հարթակին
        </button>
      </section>
    </div>
  );
}
