import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-glow"></div>
      <div className="container footer-content">
        <div className="footer-brand">
          <h3>WORSHIP PLATFORM</h3>
          <p>Երգեր • Ակորդներ • Ծառայություն<br />ստեղծված worship թիմերի համար</p>
          <div className="pill">v3.0</div>
        </div>
        
        <div className="footer-links">
          <h4>Բաժիններ</h4>
          <Link to="/">ԳԼԽԱՎՈՐ</Link>
          <Link to="/#features">ՀՆԱՐԱՎՈՐՈՒԹՅՈՒՆՆԵՐ</Link>
          <Link to="/songs">ԵՐԳԵՐ</Link>
          <Link to="/news">ՆՈՐՈՒԹՅՈՒՆՆԵՐ</Link>
        </div>

        <div className="footer-links">
          <h4>Հետևիր մեզ</h4>
          <a href="#">Instagram</a>
          <a href="#">YouTube</a>
          <a href="#">Telegram</a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2026 Worship Platform</p>
      </div>
    </footer>
  );
}
