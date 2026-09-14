import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './CreateAccountReminder.css';

const REMINDER_COPY = {
  am: {
    title: 'Ստեղծի՛ր քո հաշիվը',
    desc: 'Պահպանիր սիրելի երգերը, կազմիր երգացանկեր և օգտվիր բոլոր հնարավորություններից։',
    createBtn: 'Ստեղծել հաշիվ',
    hasAccount: 'Արդեն ունե՞ս հաշիվ։',
    loginBtn: 'Մուտք',
    dismiss: 'Փակել',
  },
  en: {
    title: 'Create your account',
    desc: 'Save favorite songs, build setlists, and unlock all features.',
    createBtn: 'Create Account',
    hasAccount: 'Already have an account?',
    loginBtn: 'Log in',
    dismiss: 'Close',
  },
  ru: {
    title: 'Создайте свой аккаунт',
    desc: 'Сохраняйте любимые песни, создавайте сет-листы и пользуйтесь всеми возможностями.',
    createBtn: 'Создать аккаунт',
    hasAccount: 'Уже есть аккаунт?',
    loginBtn: 'Войти',
    dismiss: 'Закрыть',
  },
};

const DISMISS_STORAGE_KEY = 'wp_signup_reminder_dismissed_until';
const SESSION_DISMISS_KEY = 'wp_signup_reminder_session_dismissed';

export default function CreateAccountReminder() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  const langKey = (language === 'hy' || language === 'am') ? 'am' : (REMINDER_COPY[language] ? language : 'am');
  const copy = REMINDER_COPY[langKey] || REMINDER_COPY.am;

  useEffect(() => {
    // If user is logged in or auth is checking, do not show
    if (authLoading || user) {
      setIsDismissed(true);
      return;
    }

    // Check if dismissed in this session or within recent window
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setIsDismissed(true);
        return;
      }
      const until = Number(localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
      if (until > Date.now()) {
        setIsDismissed(true);
        return;
      }
    } catch (_) {}

    setIsDismissed(false);

    // Smooth delay before presenting the reminder
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, authLoading]);

  // Route exclusions
  const pathname = location.pathname;
  const isExcludedRoute = 
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/install' ||
    pathname.includes('/live') ||
    pathname.includes('/public');

  if (authLoading || user || isDismissed || isExcludedRoute) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
      // Dismiss for 3 days
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    } catch (_) {}
  };

  const handleActionClick = () => {
    setIsVisible(false);
  };

  return (
    <aside
      className={`create-account-reminder ${isVisible ? 'visible' : ''}`}
      aria-label="Create account reminder"
      role="region"
    >
      <div className="reminder-header">
        <div className="reminder-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="reminder-title-area">
          <h4 className="reminder-title">{copy.title}</h4>
          <p className="reminder-desc">{copy.desc}</p>
        </div>
        <button
          type="button"
          className="reminder-close-btn"
          onClick={handleDismiss}
          aria-label={copy.dismiss}
          title={copy.dismiss}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="reminder-actions">
        <Link
          to="/register"
          className="reminder-primary-btn"
          onClick={handleActionClick}
        >
          <span>{copy.createBtn}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="reminder-secondary-row">
          <span className="reminder-has-account">{copy.hasAccount}</span>
          <Link
            to="/login"
            className="reminder-login-link"
            onClick={handleActionClick}
          >
            {copy.loginBtn}
          </Link>
        </div>
      </div>
    </aside>
  );
}
