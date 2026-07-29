import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useIsPWA } from '../hooks/useIsPWA';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './Login.css';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

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
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const loadSocialStatus = async () => {
      try {
        const response = await fetch('/social_auth.php?action=status', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!cancelled) {
          setGoogleEnabled(Boolean(data?.providers?.google?.enabled));
        }
      } catch {
        if (!cancelled) {
          setGoogleEnabled(false);
        }
      }
    };

    loadSocialStatus();
    return () => {
      cancelled = true;
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

    if (!isValidEmail(login)) {
      setError(t('auth.invalidEmail'));
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
    } catch {
      setError(t('auth.networkError'));
      setIsLoading(false);
    }
  };

  const googleAuthUrl = `/social_auth.php?provider=google&mode=login&next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}&remember=${rememberMe ? '1' : '0'}`;
  const handleGoogleClick = (event) => {
    if (!googleEnabled || isLoading) {
      event.preventDefault();
      setError(t('auth.googleDisabled'));
    }
  };

  const [viewMode, setViewMode] = useState(() => {
    if (searchParams.get('mode') === 'login') return 'login';
    return isPWA ? 'welcome' : 'login';
  });
  const [isQsOpen, setIsQsOpen] = useState(false);
  const [qsTheme, setQsThemeState] = useState(() => localStorage.getItem('theme') || 'dark');
  const [qsOled, setQsOledState] = useState(() => localStorage.getItem('oledMode') === 'true');
  const [qsChordColor, setQsChordColorState] = useState(() => localStorage.getItem('chordColor') || 'gold');
  const [qsOutlined, setQsOutlinedState] = useState(() => localStorage.getItem('outlinedChords') === 'true');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [viewMode]);

  const handleSetTheme = (mode) => {
    if (mode === 'light') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('oled-mode');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('oledMode', 'false');
      setQsThemeState('light');
      setQsOledState(false);
      if (qsChordColor === 'white') {
        setQsChordColorState('gold');
        localStorage.setItem('chordColor', 'gold');
      }
    } else if (mode === 'oled') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('oled-mode');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('oledMode', 'true');
      setQsThemeState('dark');
      setQsOledState(true);
      if (qsChordColor === 'black') {
        setQsChordColorState('gold');
        localStorage.setItem('chordColor', 'gold');
      }
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.remove('oled-mode');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('oledMode', 'false');
      setQsThemeState('dark');
      setQsOledState(false);
      if (qsChordColor === 'black') {
        setQsChordColorState('gold');
        localStorage.setItem('chordColor', 'gold');
      }
    }
  };

  const handleSetChordColor = (color) => {
    ['gold', 'blue', 'green', 'red', 'white', 'black'].forEach((c) => {
      document.body.classList.remove(`chord-color-${c}`);
    });
    if (color !== 'gold') {
      document.body.classList.add(`chord-color-${color}`);
    }
    localStorage.setItem('chordColor', color);
    setQsChordColorState(color);
  };

  const handleSetOutlined = (enable) => {
    if (enable) {
      document.body.classList.add('outlined-chords');
      localStorage.setItem('outlinedChords', 'true');
    } else {
      document.body.classList.remove('outlined-chords');
      localStorage.setItem('outlinedChords', 'false');
    }
    setQsOutlinedState(enable);
  };

  return (
    <div className={`login-page-container animate-fade-in ${isPWA ? 'pwa-login-page' : 'web-login-page'} ${viewMode === 'welcome' ? 'is-welcome' : 'is-login-form'}`}>
      {isPWA && (
        <>
      {/* Pre-Login Topbar */}
      <div className="prelogin-topbar">
        <Link to="/" className="prelogin-brand">
          <img src="/user_uploaded_logo.png" alt="" className="prelogin-brand-logo" />
          <span>Worship Platform</span>
        </Link>
        <div className="prelogin-actions">
          <button type="button" className="qs-btn" onClick={() => setIsQsOpen(true)} aria-label={t('settings.title')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>{t('settings.title')}</span>
          </button>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Quick Settings Modal Overlay */}
      <div className={`qs-modal-overlay ${isQsOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setIsQsOpen(false); }}>
        <div className="qs-modal-card">
          <div className="qs-modal-header">
            <h3>{t('settings.title', 'Ծրագրի կարգավորումներ')}</h3>
            <button type="button" className="qs-close-btn" onClick={() => setIsQsOpen(false)}>✕</button>
          </div>

          {/* Theme Mode */}
          <div className="qs-group">
            <span className="qs-group-title">{t('settings.app.themeMode')}</span>
            <div className="qs-options-row">
              <button type="button" className={`qs-opt-btn ${qsTheme === 'light' ? 'active' : ''}`} onClick={() => handleSetTheme('light')}>{t('settings.app.lightTheme')}</button>
              <button type="button" className={`qs-opt-btn ${qsTheme === 'dark' && !qsOled ? 'active' : ''}`} onClick={() => handleSetTheme('dark')}>{t('settings.app.darkTheme')}</button>
              <button type="button" className={`qs-opt-btn ${qsOled ? 'active' : ''}`} onClick={() => handleSetTheme('oled')}>OLED</button>
            </div>
          </div>

          {/* Chord Color */}
          <div className="qs-group">
            <span className="qs-group-title">{t('settings.app.chordColor')}</span>
            <div className="qs-options-row">
              <button type="button" className={`qs-opt-btn ${qsChordColor === 'gold' ? 'active' : ''}`} onClick={() => handleSetChordColor('gold')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3A2DFF', display: 'inline-block' }}></span>{t('settings.app.colorGold')}</button>
              <button type="button" className={`qs-opt-btn ${qsChordColor === 'blue' ? 'active' : ''}`} onClick={() => handleSetChordColor('blue')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00D4FF', display: 'inline-block' }}></span>{t('settings.app.colorBlue')}</button>
              <button type="button" className={`qs-opt-btn ${qsChordColor === 'green' ? 'active' : ''}`} onClick={() => handleSetChordColor('green')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }}></span>{t('settings.app.colorGreen')}</button>
              <button type="button" className={`qs-opt-btn ${qsChordColor === 'red' ? 'active' : ''}`} onClick={() => handleSetChordColor('red')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF4A4A', display: 'inline-block' }}></span>{t('settings.app.colorRed')}</button>
              {qsTheme !== 'light' && (
                <button type="button" className={`qs-opt-btn ${qsChordColor === 'white' ? 'active' : ''}`} onClick={() => handleSetChordColor('white')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFFFFF', border: '1px solid #ccc', display: 'inline-block' }}></span>{t('settings.app.colorWhite')}</button>
              )}
              {qsTheme === 'light' && (
                <button type="button" className={`qs-opt-btn ${qsChordColor === 'black' ? 'active' : ''}`} onClick={() => handleSetChordColor('black')}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#000000', border: '1px solid #555', display: 'inline-block' }}></span>{t('settings.app.colorBlack')}</button>
              )}
            </div>
          </div>

          {/* Outlined Chords */}
          <div className="qs-group">
            <span className="qs-group-title">{t('settings.app.chordStyle')}</span>
            <div className="qs-options-row">
              <button type="button" className={`qs-opt-btn ${!qsOutlined ? 'active' : ''}`} onClick={() => handleSetOutlined(false)}>{t('settings.app.standardChords')}</button>
              <button type="button" className={`qs-opt-btn ${qsOutlined ? 'active' : ''}`} onClick={() => handleSetOutlined(true)}>{t('settings.app.outlinedChords')}</button>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Hero Section */}
      <div className="login-hero-section">
        <div className="login-hero-content">
          <span className="login-hero-badge">Worship Platform</span>
          <h1 className="login-hero-title">{t('auth.loginTitle')}</h1>
          <p className="login-hero-lead">{t('auth.loginSubtitle')}</p>
        </div>
      </div>

      {/* Form Section */}
      <div className="login-form-section">
        <div className="login-form-container">
          {viewMode === 'welcome' ? (
            <div className="welcome-landing-wrap">
              <div className="welcome-intro">
                <img src="/user_uploaded_logo.png" alt="" className="welcome-app-logo" />
                <span className="welcome-badge-tag">{t('auth.guestEyebrow')}</span>
                <h1 className="welcome-heading">Worship Platform</h1>
                <p className="welcome-sub">{t('auth.guestDescription')}</p>
              </div>

              <div className="welcome-song-preview" aria-label={t('auth.guestPreviewLabel')}>
                <div className="welcome-preview-head">
                  <div>
                    <span className="welcome-preview-kicker">{t('auth.guestPreviewLabel')}</span>
                    <strong>{t('auth.guestPreviewTitle')}</strong>
                  </div>
                  <span className="welcome-key-badge">{t('auth.guestKey')} D</span>
                </div>
                <div className="welcome-chord-sheet" aria-hidden="true">
                  <span>Verse</span>
                  <strong><b>D</b><i>|</i><b>G</b><i>|</i><b>Bm</b><i>|</i><b>A</b></strong>
                  <span>Chorus</span>
                  <strong><b>G</b><i>|</i><b>D</b><i>|</i><b>A</b><i>|</i><b>Bm</b></strong>
                </div>
                <button type="button" className="welcome-transpose-link" onClick={() => navigate('/transpose')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 4 4 7l3 3M20 17H4m13-3 3 3-3 3" /></svg>
                  {t('auth.guestOpenTransposer')}
                </button>
              </div>

              <div className="welcome-actions-stack">
                <button type="button" className="btn-welcome-primary" onClick={() => setViewMode('login')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
                  {t('auth.guestLogin')}
                </button>
                <button type="button" className="btn-welcome-secondary" onClick={() => navigate('/songs')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>
                  {t('auth.guestBrowseSongs')}
                </button>
                <Link className="welcome-register-link" to={`/register?next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`}>
                  {t('auth.noAccount')} <span>{t('auth.createNow')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {isPWA && (
                <button type="button" className="login-back-link" onClick={() => setViewMode('welcome')}>
                  &larr; {t('auth.back', 'Վերադառնալ')}
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
                    type="email"
                    id="login"
                    required
                    placeholder=" "
                    autoComplete="email"
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
                <a
                  className={`login-social-btn ${!googleEnabled ? 'is-disabled' : ''}`}
                  href={googleEnabled ? googleAuthUrl : '#'}
                  onClick={handleGoogleClick}
                  aria-disabled={!googleEnabled}
                >
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
                    <small className="login-social-note">
                      {googleEnabled ? t('auth.googleReady') : t('auth.googleDisabledShort')}
                    </small>
                  </span>
                </a>
              </div>

              <div className="login-footer-link">
                {t('auth.noAccount')} <Link to={`/register?next=${encodeURIComponent(next)}&source=${encodeURIComponent(source)}`}>{t('auth.createNow')}</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
