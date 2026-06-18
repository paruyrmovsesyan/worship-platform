import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-glow"></div>
      <div className="rich-footer">
        <div className="footer-content">
          <div className="footer-brand">
          <div className="footer-logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="url(#fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="fg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9D72FF"/>
                  <stop offset="1" stopColor="#00F0FF"/>
                </linearGradient>
              </defs>
            </svg>
            Worship Platform
          </div>
          <div className="social-icons">
            <span className="icon">f</span>
            <span className="icon">ig</span>
            <span className="icon">tw</span>
            <span className="icon">yt</span>
          </div>
        </div>
        <div className="footer-links">
          {[
            { title: 'Product', links: [['Songs', '/songs'], ['Teams', '/teams'], ['Pricing', '/pricing'], ['Setlists', '/setlists']] },
            { title: 'Company', links: [['About', '/about'], ['Blog', '/blog'], ['Careers', '/careers'], ['Community', '/community']] },
            { title: 'Resources', links: [['Documentation', '/documentation'], ['Tutorials', '/tutorials'], ['Pricing', '/pricing'], ['Support', '/support']] },
            { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies']] },
          ].map(group => (
            <div key={group.title} className="link-group">
              <h4>{group.title}</h4>
              {group.links.map(([label, path]) => (
                path.startsWith('/') && !path.includes('.php')
                  ? <Link key={label} to={path}>{label}</Link>
                  : <a key={label} href={path}>{label}</a>
              ))}
            </div>
          ))}
        </div>
        </div>
        <div className="footer-bottom">
          <p>{t('landing.footerRights')}</p>
        </div>
      </div>
    </footer>
  );
}
