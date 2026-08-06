import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageReady } from '../hooks/usePageReady';
import './ErrorPages.css';

export default function Forbidden() {
  const navigate = useNavigate();
  usePageReady(false);

  return (
    <div className="error-page-wrapper animate-fade-in">
      <div className="error-card warning-theme">
        <div className="error-hero-glow warning" />
        <div className="error-badge warning">403 FORBIDDEN</div>

        <h1 className="error-title">Մուտքն Արգելված է</h1>
        <p className="error-subtitle">
          Այս էջը կամ ռեսուրսը դիտելու համար անհրաժեշտ է համապատասխան թույլտվություն կամ մուտք համակարգ:
        </p>

        <div className="error-actions">
          <button className="btn-error primary" onClick={() => navigate('/login')}>
            🔑 Մուտք Գործել
          </button>

          <button className="btn-error secondary" onClick={() => navigate('/')}>
            🏠 Գլխավոր Էջ
          </button>
        </div>
      </div>
    </div>
  );
}
