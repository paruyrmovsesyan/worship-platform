import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useIsPWA } from '../hooks/useIsPWA';
import './InstallApp.css';

const INSTALL_COPY = {
  hy: {
    eyebrow: 'Worship-ը՝ քո հեռախոսում',
    title: 'Պահպանիր կայքը որպես ծրագիր',
    subtitle: 'Բացիր Worship-ը մեկ հպումով՝ առանց ամեն անգամ հասցեն որոնելու։ Ընտրիր հեռախոսիդ տեսակը և հետևիր կարճ քայլերին։',
    iphone: 'iPhone',
    android: 'Android',
    recommended: 'Քո սարքի համար',
    iosTitle: 'Պահպանում iPhone-ում',
    iosIntro: 'Այս քայլերը կարող ես կատարել ցանկացած բրաուզերում (կապ չունի՝ Safari, Chrome, թե այլ)։',
    iosSteps: ['Բացիր այս էջը քո բրաուզերում։', 'Սեղմիր Share (Կիսվել) կամ մենյուի կոճակը։', 'Ընտրիր Add to Home Screen (Ավելացնել հիմնական էկրանին)։', 'Միացրու Open as Web App-ը (եթե կա) և սեղմիր Add։'],
    androidTitle: 'Տեղադրում Android-ում',
    androidIntro: 'Chrome-ում կարող ես տեղադրել ծրագիրը հենց այս էջից։',
    androidSteps: ['Սեղմիր ներքևի «Տեղադրել հիմա» կոճակը։', 'Բրաուզերի բացված պատուհանում ընտրիր Install։', 'Worship-ի նշանը կհայտնվի գլխավոր էկրանին։'],
    installNow: 'Տեղադրել հիմա',
    promptReady: 'Արագ տեղադրումը պատրաստ է։',
    promptWaiting: 'Եթե կոճակը դեռ ակտիվ չէ, Chrome-ի մենյուից ընտրիր Install app կամ Add to Home screen։',
    copied: 'Հղումը պատճենված է',
    copyLink: 'Պատճենել հղումը',
    installed: 'Ծրագիրն արդեն տեղադրված է այս սարքում։',
    openApp: 'Բացել ծրագիրը',
    openAppNote: 'Եթե ծրագիրը չբացվեց ավտոմատ, բացիր այն հեռախոսիդ գլխավոր էկրանից կամ ծրագրերի ցանկից։',
    accepted: 'Գերազանց․ տեղադրումն սկսվեց։',
    dismissed: 'Տեղադրումը չավարտվեց։ Կարող ես կրկին փորձել։',
    back: 'Վերադառնալ գլխավոր էջ',
    benefitFast: 'Արագ բացում',
    benefitOffline: 'Օֆլայն հասանելիություն',
    benefitNative: 'Առանձին ծրագրի տեսք',
  },
  en: {
    eyebrow: 'Worship on your phone',
    title: 'Save the website as an app',
    subtitle: 'Open Worship in one tap without searching for the address each time. Choose your phone and follow the short steps.',
    iphone: 'iPhone',
    android: 'Android',
    recommended: 'For your device',
    iosTitle: 'Save on iPhone',
    iosIntro: 'You can complete these steps in any browser (Safari, Chrome, etc.).',
    iosSteps: ['Open this page in your browser.', 'Tap the Share or menu button.', 'Choose Add to Home Screen.', 'Turn on Open as Web App (if available), then tap Add.'],
    androidTitle: 'Install on Android',
    androidIntro: 'In Chrome, you can install the app directly from this page.',
    androidSteps: ['Tap “Install now” below.', 'Choose Install in the browser prompt.', 'The Worship icon will appear on your Home Screen.'],
    installNow: 'Install now',
    promptReady: 'Quick install is ready.',
    promptWaiting: 'If the button is not active yet, choose Install app or Add to Home screen from Chrome’s menu.',
    copied: 'Link copied',
    copyLink: 'Copy link',
    installed: 'The app is already installed on this device.',
    openApp: 'Open app',
    openAppNote: 'If the app does not open automatically, open it from your Home Screen or app drawer.',
    accepted: 'Great — installation has started.',
    dismissed: 'Installation was not completed. You can try again.',
    back: 'Back to home',
    benefitFast: 'Quick launch',
    benefitOffline: 'Offline access',
    benefitNative: 'App-like experience',
  },
  ru: {
    eyebrow: 'Worship на телефоне',
    title: 'Сохраните сайт как приложение',
    subtitle: 'Открывайте Worship одним касанием, не вводя адрес каждый раз. Выберите тип телефона и выполните короткие шаги.',
    iphone: 'iPhone',
    android: 'Android',
    recommended: 'Для вашего устройства',
    iosTitle: 'Сохранение на iPhone',
    iosIntro: 'Вы можете выполнить эти шаги в любом браузере (Safari, Chrome и др.).',
    iosSteps: ['Откройте эту страницу в вашем браузере.', 'Нажмите кнопку «Поделиться» или меню.', 'Выберите «На экран Домой» (Add to Home Screen).', 'Включите «Открыть как веб-приложение» (если есть) и нажмите «Добавить».'],
    androidTitle: 'Установка на Android',
    androidIntro: 'В Chrome приложение можно установить прямо с этой страницы.',
    androidSteps: ['Нажмите кнопку «Установить сейчас» ниже.', 'Выберите Install в окне браузера.', 'Значок Worship появится на главном экране.'],
    installNow: 'Установить сейчас',
    promptReady: 'Быстрая установка готова.',
    promptWaiting: 'Если кнопка ещё не активна, выберите Install app или Add to Home screen в меню Chrome.',
    copied: 'Ссылка скопирована',
    copyLink: 'Скопировать ссылку',
    installed: 'Приложение уже установлено на этом устройстве.',
    openApp: 'Открыть приложение',
    openAppNote: 'Если приложение не открылось автоматически, откройте его с главного экрана или из списка приложений.',
    accepted: 'Отлично — установка началась.',
    dismissed: 'Установка не завершена. Можно попробовать снова.',
    back: 'Вернуться на главную',
    benefitFast: 'Быстрый запуск',
    benefitOffline: 'Работа офлайн',
    benefitNative: 'Вид приложения',
  },
};

function detectDevice() {
  if (typeof navigator === 'undefined') return 'android';
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android';
}

function PhoneIcon({ type }) {
  return type === 'ios' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 19h2"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8Z"/><path d="m9 5-1.5-2M15 5l1.5-2M9 8V6h6v2M10 18h4"/></svg>
  );
}

export default function InstallApp() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy = INSTALL_COPY[language] || INSTALL_COPY.hy;
  const detectedDevice = detectDevice();
  const [device, setDevice] = useState(detectedDevice);
  const [installPrompt, setInstallPrompt] = useState(() => window.__wpDeferredInstallPrompt || null);
  const [message, setMessage] = useState('');
  const isPWA = useIsPWA();
  const [isInstalled, setIsInstalled] = useState(() => {
    if (isPWA) return true;
    try {
      return localStorage.getItem('wp_install_confirmed') === '1' ||
             localStorage.getItem('wp_pwa_installed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mounted = true;

    if (isPWA) {
      setIsInstalled(true);
      try {
        localStorage.setItem('wp_install_confirmed', '1');
        localStorage.setItem('wp_pwa_installed', '1');
      } catch {}
      return;
    }

    try {
      if (localStorage.getItem('wp_install_confirmed') === '1' || localStorage.getItem('wp_pwa_installed') === '1') {
        setIsInstalled(true);
      }
    } catch {}

    if (typeof navigator !== 'undefined' && typeof navigator.getInstalledRelatedApps === 'function') {
      navigator.getInstalledRelatedApps().then((apps) => {
        if (!mounted) return;
        if (Array.isArray(apps) && apps.length > 0) {
          setIsInstalled(true);
          try {
            localStorage.setItem('wp_install_confirmed', '1');
            localStorage.setItem('wp_pwa_installed', '1');
          } catch {}
        }
      }).catch(() => {});
    }

    fetch('/install_api.php?action=current_device_status&scope=main', {
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data && data.installed === true) {
          setIsInstalled(true);
          try {
            localStorage.setItem('wp_install_confirmed', '1');
            localStorage.setItem('wp_pwa_installed', '1');
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [isPWA]);

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      window.__wpDeferredInstallPrompt = event;
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      window.__wpDeferredInstallPrompt = null;
      setInstallPrompt(null);
      setIsInstalled(true);
      try {
        localStorage.setItem('wp_install_confirmed', '1');
        localStorage.setItem('wp_pwa_installed', '1');
      } catch {}
      setMessage(copy.installed);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [copy.installed]);

  const startInstall = async () => {
    const prompt = installPrompt || window.__wpDeferredInstallPrompt;
    if (!prompt) return;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setIsInstalled(true);
        try {
          localStorage.setItem('wp_install_confirmed', '1');
          localStorage.setItem('wp_pwa_installed', '1');
        } catch {}
        setMessage(copy.accepted);
      } else {
        setMessage(copy.dismissed);
      }
    } catch {
      setMessage(copy.promptWaiting);
    } finally {
      window.__wpDeferredInstallPrompt = null;
      setInstallPrompt(null);
    }
  };

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setMessage(copy.copied);
    } catch {
      setMessage(window.location.origin);
    }
  };

  const handleOpenApp = (e) => {
    if (isPWA) {
      e.preventDefault();
      navigate('/');
      return;
    }
    setTimeout(() => {
      setMessage(copy.openAppNote);
    }, 1200);
  };

  const isIos = device === 'ios';
  const steps = isIos ? copy.iosSteps : copy.androidSteps;

  return (
    <div className="install-app-page">
      <div className="install-app-glow install-app-glow-one" aria-hidden="true" />
      <div className="install-app-glow install-app-glow-two" aria-hidden="true" />

      <main className="install-app-shell">
        <section className="install-app-intro">
          <span className="install-app-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>

          <div className="install-app-benefits" aria-label="Benefits">
            <span>⚡ {copy.benefitFast}</span>
            <span>↓ {copy.benefitOffline}</span>
            <span>▣ {copy.benefitNative}</span>
          </div>

          <div className="install-app-visual" aria-hidden="true">
            <div className="install-app-orbit" />
            <div className="install-app-phone">
              <div className="install-app-speaker" />
              <img src="/apple-touch-icon-v7.png" alt="" />
              <strong>Worship</strong>
              <small>Platform</small>
            </div>
          </div>
        </section>

        <section className="install-guide-card" aria-live="polite">
          <div className="install-device-tabs" role="tablist" aria-label="Phone type">
            {['ios', 'android'].map(type => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={device === type}
                className={device === type ? 'active' : ''}
                onClick={() => { setDevice(type); setMessage(''); }}
              >
                <PhoneIcon type={type} />
                <span>{type === 'ios' ? copy.iphone : copy.android}</span>
                {detectedDevice === type ? <small>{copy.recommended}</small> : null}
              </button>
            ))}
          </div>

          <div className="install-guide-content" role="tabpanel">
            <div className="install-guide-heading">
              <span className="install-guide-icon"><PhoneIcon type={device} /></span>
              <div>
                <h2>{isIos ? copy.iosTitle : copy.androidTitle}</h2>
                <p>{isIos ? copy.iosIntro : copy.androidIntro}</p>
              </div>
            </div>

            <ol className="install-steps">
              {steps.map((step, index) => (
                <li key={step}><span>{index + 1}</span><p>{step}</p></li>
              ))}
            </ol>

            {isInstalled ? (
              <div className="install-installed-actions">
                <div className="install-status success">✓ {copy.installed}</div>
                <div style={{ marginTop: '14px' }}>
                  {isPWA ? (
                    <button className="install-primary-action" type="button" onClick={() => navigate('/')}>
                      <span aria-hidden="true">↗</span> {copy.openApp}
                    </button>
                  ) : !isIos ? (
                    <a
                      className="install-primary-action"
                      href="intent://worship.pmstudio.am/#Intent;scheme=https;S.browser_fallback_url=https%3A%2F%2Fworship.pmstudio.am%2F;end"
                      onClick={handleOpenApp}
                    >
                      <span aria-hidden="true">↗</span> {copy.openApp}
                    </a>
                  ) : (
                    <button className="install-secondary-action" type="button" onClick={copyPageLink}>
                      {copy.copyLink}
                    </button>
                  )}
                  {!isPWA && !isIos && (
                    <p className="install-prompt-note ready" style={{ marginTop: '10px' }}>
                      {copy.openAppNote}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!isIos ? (
                  <>
                    <button className="install-primary-action" type="button" onClick={startInstall} disabled={!installPrompt}>
                      <span aria-hidden="true">↓</span> {copy.installNow}
                    </button>
                    <p className={`install-prompt-note ${installPrompt ? 'ready' : ''}`}>
                      {installPrompt ? copy.promptReady : copy.promptWaiting}
                    </p>
                  </>
                ) : (
                  <button className="install-secondary-action" type="button" onClick={copyPageLink}>
                    {copy.copyLink}
                  </button>
                )}
              </>
            )}

            {message ? <div className="install-status">{message}</div> : null}
            <Link className="install-back-link" to="/">← {copy.back}</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
