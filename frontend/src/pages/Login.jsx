import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsPWA } from '../hooks/useIsPWA';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const isPWA = useIsPWA();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || (isPWA ? 'pwa' : 'web');
  const next = searchParams.get('next') || '/';
  
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { t, language, setLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // Apply visual viewport fix for iOS PWA keyboard
  useEffect(() => {
    const applyViewportHeight = () => {
      const vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.body.style.setProperty('--vv-height', vvh + 'px');
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyViewportHeight);
      window.visualViewport.addEventListener('scroll', applyViewportHeight);
      applyViewportHeight();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', applyViewportHeight);
        window.visualViewport.removeEventListener('scroll', applyViewportHeight);
      }
    };
  }, []);

  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/login_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
          remember_me: rememberMe,
          source
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const sep = next.includes('?') ? '&' : '?';
        const nextUrl = `${next}${sep}session_login=${rememberMe ? '0' : '1'}`;
        window.location.assign(nextUrl);
      } else {
        setError(data.error || t('auth.invalidLogin'));
        setIsLoading(false);
      }
    } catch (err) {
      setError(t('auth.networkError'));
      setIsLoading(false);
    }
  };

  const googleAuthUrl = `/social_auth.php?provider=google&action=login&next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`;

  return (
    <div className="login-page-container animate-fade-in">
      {/* Hero Section */}
      <div className="login-hero-section">
        <div className="login-hero-content">
          <span className="login-hero-badge">Worship Platform</span>
          <h1 className="login-hero-title">{t('auth.loginTitle')}</h1>
          <p className="login-hero-lead">{t('auth.loginSubtitle')}</p>
        </div>
        <LanguageSwitcher 
          style={{ position: 'absolute', top: '20px', right: '20px' }} 
        />
      </div>

      {/* Form Section */}
      <div className="login-form-section">
        <div className="login-form-container">
          {!isPWA && (
            <button className="login-back-link" onClick={() => navigate(-1)}>
              &larr; {t('auth.back')}
            </button>
          )}

          <div className="login-form-header">
            <h2>{t('auth.welcomeBack')}</h2>
            <p>{t('auth.welcomeBackDesc')}</p>
          </div>

          {error && <div className="login-error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-input-group">
              <input 
                type="text" 
                id="login" 
                required 
                placeholder=" "
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                onFocus={handleFocus}
                disabled={isLoading}
              />
              <label htmlFor="login">{t('auth.loginOrEmail')}</label>
            </div>

            <div className="login-input-group">
              <input 
                type="password" 
                id="password" 
                required 
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleFocus}
                disabled={isLoading}
              />
              <label htmlFor="password">{t('auth.password')}</label>
            </div>

            <div className="login-options-row">
              <label className="login-chk">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="login-chk-box" aria-hidden="true"></span>
                <span className="login-chk-text">{t('auth.rememberMe')}</span>
              </label>
              <a className="login-text-link" href={`/forgot_password.php?next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`}>
                {t('auth.forgotPassword')}
              </a>
            </div>

            <button type="submit" className="login-btn-primary" disabled={isLoading}>
              {isLoading ? t('auth.pleaseWait') : t('auth.loginBtn')}
            </button>
          </form>

          <div className="login-social-sep">{t('auth.orContinue')}</div>
          <div className="login-social-btns">
            <a className="login-social-btn" href={googleAuthUrl}>
              <span className="login-social-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
              </span>
              <span>
                {t('auth.googleLogin')}
                <small className="login-social-note">{t('auth.googleReady')}</small>
              </span>
            </a>
          </div>

          <div className="login-footer-link">
            {t('auth.noAccount')} <Link to={`/register?next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`}>{t('auth.createNow')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
