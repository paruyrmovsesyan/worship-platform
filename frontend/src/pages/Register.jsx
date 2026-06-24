import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useIsPWA } from '../hooks/useIsPWA';
import { useLanguage } from '../context/LanguageContext';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const isPWA = useIsPWA();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || (isPWA ? 'pwa' : 'web');
  const next = searchParams.get('next') || '/';
  
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters.'); // TODO: add to translation if needed, or leave generic error
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/register_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          login: login.trim(),
          password,
          remember_me: rememberMe,
          source
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Successful registration
        const sep = next.includes('?') ? '&' : '?';
        const nextUrl = `${next}${sep}session_login=${rememberMe ? '0' : '1'}`;
        window.location.assign(nextUrl);
      } else {
        setError(data.error || t('auth.invalidLogin')); // Generic register error
        setIsLoading(false);
      }
    } catch (err) {
      setError(t('auth.networkError'));
      setIsLoading(false);
    }
  };

  const googleAuthUrl = `/social_auth.php?provider=google&action=register&next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`;

  return (
    <div className="register-page-container animate-fade-in">
      {/* Hero Section */}
      <div className="register-hero-section">
        <div className="register-hero-content">
          <span className="register-hero-badge">Worship Platform</span>
          <h1 className="register-hero-title">{t('auth.registerTitle')}</h1>
          <p className="register-hero-lead">{t('auth.registerSubtitle')}</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="register-form-section">
        <div className="register-form-container">
          {!isPWA && (
            <button className="register-back-link" onClick={() => navigate(-1)}>
              &larr; {t('auth.back')}
            </button>
          )}

          <div className="register-form-header">
            <h2>{t('auth.joinCommunity')}</h2>
            <p>{t('auth.joinDesc')}</p>
          </div>

          {error && <div className="register-error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="register-input-group">
              <input 
                type="text" 
                id="name" 
                placeholder=" "
                maxLength="120"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={handleFocus}
                disabled={isLoading}
              />
              <label htmlFor="name">{t('auth.fullName')}</label>
            </div>

            <div className="register-input-group">
              <input 
                type="text" 
                id="login" 
                required 
                placeholder=" "
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                onFocus={handleFocus}
                disabled={isLoading}
              />
              <label htmlFor="login">{t('auth.loginOrEmail')}</label>
            </div>

            <div className="register-input-group">
              <input 
                type="password" 
                id="password" 
                required 
                placeholder=" "
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handleFocus}
                disabled={isLoading}
              />
              <label htmlFor="password">{t('auth.password')} (&gt;= 8)</label>
            </div>

            <div className="register-options-row">
              <label className="register-chk">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="register-chk-box" aria-hidden="true"></span>
                <span className="register-chk-text">{t('auth.rememberMe')}</span>
              </label>
            </div>

            <button type="submit" className="register-btn-primary" disabled={isLoading}>
              {isLoading ? t('auth.pleaseWait') : t('auth.registerBtn')}
            </button>
          </form>

          <div className="register-social-sep">{t('auth.orContinue')}</div>
          <div className="register-social-btns">
            <a className="register-social-btn" href={googleAuthUrl}>
              <span className="register-social-icon">
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
                <small className="register-social-note">{t('auth.googleReady')}</small>
              </span>
            </a>
          </div>

          <div className="register-footer-link">
            {t('auth.hasAccount')} <Link to={`/login?next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`}>{t('auth.loginNow')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
