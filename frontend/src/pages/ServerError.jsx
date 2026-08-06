import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageReady } from '../hooks/usePageReady';
import './ErrorPages.css';

export default function ServerError() {
  const navigate = useNavigate();
  usePageReady(false);

  return (
    <div className="error-page-wrapper animate-fade-in">
      <div className="error-card danger-theme">
        <div className="error-hero-glow danger" />
        <div className="error-badge danger">500 SERVER ERROR</div>

        <h1 className="error-title">Սերվերի Անսպասելի Սխալ</h1>
        <p className="error-subtitle">
          Տեղի է ունեցել համակարգային սխալ կամ կապի խափանում: Մեր թիմն արդեն աշխատում է դրա վերացման ուղղությամբ:
        </p>

        <div className="error-actions">
          <button className="btn-error primary" onClick={() => window.location.reload()}>
            🔄 Թարմացնել Էջը
          </button>

          <button className="btn-error secondary" onClick={() => navigate('/')}>
            🏠 Գլխավոր Էջ
          </button>
        </div>
      </div>
    </div>
  );
}
