import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [planType, setPlanType] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetch('/user_api.php?action=get_profile')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.user) {
          setPlanType(data.user.plan_type);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching plan:', err);
        setLoading(false);
      });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="profile-page">
      
      <div className="profile-header">
        <h2>{t('Profile', 'Պրոֆիլ')}</h2>
        <p>{t('Manage your account and preferences.', 'Կառավարեք Ձեր հաշիվը և նախընտրությունները:')}</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="profile-info">
          <h3>{user.name}</h3>
          <p className="profile-email">{user.email}</p>
          {user.username && user.username !== user.name && (
            <p className="profile-username">@{user.username}</p>
          )}
        </div>
      </div>

      <div className="profile-plan-section">
        <div className="plan-info-left">
          <h3>{t('Current Plan', 'Ընթացիկ փաթեթ')}</h3>
          {loading ? (
            <span style={{color: 'var(--color-text-secondary)'}}>{t('Loading...', 'Բեռնվում է...')}</span>
          ) : (
            <span className={`plan-badge plan-${planType}`}>
              {planType.toUpperCase()}
            </span>
          )}
        </div>
        <button className="upgrade-btn" onClick={() => navigate('/pricing')}>
          {t('Upgrade Plan', 'Փոխել փաթեթը')}
        </button>
      </div>

      <div className="profile-links">
        <button className="profile-link-btn" onClick={() => navigate('/favorites')}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          {t('Saved Songs', 'Պահպանված երգեր')}
        </button>
        
        <button className="profile-link-btn" onClick={() => navigate('/teams')}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          {t('My Teams', 'Իմ թիմերը')}
        </button>

        <button className="profile-link-btn" onClick={() => navigate('/settings')}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.1a2 2 0 0 1-1.41-.59l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2 18.59v-.1a2 2 0 0 1 .59-1.41l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.41 2h.1a2 2 0 0 1 1.41.59l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.82V2a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 .33 1.82 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 22 5.41v.1a2 2 0 0 1-.59 1.41l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.39.66.6 1a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.82.33c-.21.34-.37.69-.6 1z"></path>
          </svg>
          {t('Account Settings', 'Կարգավորումներ')}
        </button>
      </div>

      <div className="logout-section">
        <button className="logout-btn" onClick={logout}>
          {t('Logout', 'Ելք')}
        </button>
      </div>

    </div>
  );
}
