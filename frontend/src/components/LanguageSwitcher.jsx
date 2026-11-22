import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Glass } from 'glisse';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ className = '', style = {} }) {
  const { language, setLanguage } = useLanguage();
  const langs = ['am', 'en', 'ru'];

  return (
    <Glass className={`lang-switcher-pill ${className}`} style={style}>
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
      <Glass 
        className="lang-pill-glider" 
        style={{
          transform: `translateX(${langs.indexOf(language) * 100}%)`
        }} 
        aria-hidden="true"
      />
    </Glass>
  );
}
