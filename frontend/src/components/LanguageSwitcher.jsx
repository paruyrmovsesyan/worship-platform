import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ className = '', style = {} }) {
  const { language, setLanguage } = useLanguage();
  const langs = ['am', 'en', 'ru'];

  return (
    <div className={`lang-switcher-pill ${className}`} style={style}>
      {langs.map((l) => (
        <button
          key={l}
          className={`lang-pill-btn ${language === l ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setLanguage(l);
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
      <div 
        className="lang-pill-glider" 
        style={{
          transform: `translateX(${langs.indexOf(language) * 100}%)`
        }} 
      />
    </div>
  );
}
