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
            { title: t('landing.footer.product'), links: [[t('landing.footer.songs'), '/songs'], [t('landing.footer.teams'), '/teams'], [t('landing.footer.setlists'), '/setlists']] },
            { title: t('landing.footer.company'), links: [[t('landing.footer.about'), '/about'], [t('landing.footer.blog'), '/blog'], [t('landing.footer.careers'), '/careers'], [t('landing.footer.community'), '/community']] },
            { title: t('landing.footer.resources'), links: [[t('landing.footer.documentation'), '/documentation'], [t('landing.footer.tutorials'), '/tutorials'], [t('landing.footer.support'), '/support']] },
            { title: t('landing.footer.legal'), links: [[t('landing.footer.privacyPolicy'), '/privacy'], [t('landing.footer.terms'), '/terms'], [t('landing.footer.cookies'), '/cookies']] },
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
