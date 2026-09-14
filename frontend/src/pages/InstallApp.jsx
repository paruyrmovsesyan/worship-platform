import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    iosIntro: 'Այս քայլերը կատարիր Safari բրաուզերում։',
    iosSteps: ['Բացիր այս էջը Safari-ում։', 'Սեղմիր Share (Կիսվել) կոճակը։', 'Ընտրիր Add to Home Screen։', 'Միացրու Open as Web App-ը և սեղմիր Add։'],
    androidTitle: 'Տեղադրում Android-ում',
    androidIntro: 'Chrome-ում կարող ես տեղադրել ծրագիրը հենց այս էջից։',
    androidSteps: ['Սեղմիր ներքևի «Տեղադրել հիմա» կոճակը։', 'Բրաուզերի բացված պատուհանում ընտրիր Install։', 'Worship-ի նշանը կհայտնվի գլխավոր էկրանին։'],
    installNow: 'Տեղադրել հիմա',
    promptReady: 'Արագ տեղադրումը պատրաստ է։',
    promptWaiting: 'Եթե կոճակը դեռ ակտիվ չէ, Chrome-ի մենյուից ընտրիր Install app կամ Add to Home screen։',
    copied: 'Հղումը պատճենված է',
    copyLink: 'Պատճենել հղումը',
    installed: 'Ծրագիրն արդեն տեղադրված է այս սարքում։',
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
    iosIntro: 'Complete these steps in Safari.',
    iosSteps: ['Open this page in Safari.', 'Tap the Share button.', 'Choose Add to Home Screen.', 'Turn on Open as Web App, then tap Add.'],
    androidTitle: 'Install on Android',
    androidIntro: 'In Chrome, you can install the app directly from this page.',
    androidSteps: ['Tap “Install now” below.', 'Choose Install in the browser prompt.', 'The Worship icon will appear on your Home Screen.'],
    installNow: 'Install now',
    promptReady: 'Quick install is ready.',
    promptWaiting: 'If the button is not active yet, choose Install app or Add to Home screen from Chrome’s menu.',
    copied: 'Link copied',
    copyLink: 'Copy link',
    installed: 'The app is already installed on this device.',
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
    iosIntro: 'Выполните эти шаги в Safari.',
    iosSteps: ['Откройте эту страницу в Safari.', 'Нажмите кнопку «Поделиться».', 'Выберите «На экран Домой».', 'Включите «Открыть как веб-приложение» и нажмите «Добавить».'],
    androidTitle: 'Установка на Android',
    androidIntro: 'В Chrome приложение можно установить прямо с этой страницы.',
    androidSteps: ['Нажмите кнопку «Установить сейчас» ниже.', 'Выберите Install в окне браузера.', 'Значок Worship появится на главном экране.'],
    installNow: 'Установить сейчас',
    promptReady: 'Быстрая установка готова.',
    promptWaiting: 'Если кнопка ещё не активна, выберите Install app или Add to Home screen в меню Chrome.',
    copied: 'Ссылка скопирована',
    copyLink: 'Скопировать ссылку',
    installed: 'Приложение уже установлено на этом устройстве.',
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
  const { language } = useLanguage();
  const copy = INSTALL_COPY[language] || INSTALL_COPY.hy;
  const detectedDevice = detectDevice();
  const [device, setDevice] = useState(detectedDevice);
  const [installPrompt, setInstallPrompt] = useState(() => window.__wpDeferredInstallPrompt || null);
  const [message, setMessage] = useState('');
  const isPWA = useIsPWA();

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      window.__wpDeferredInstallPrompt = event;
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      window.__wpDeferredInstallPrompt = null;
      setInstallPrompt(null);
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
      setMessage(choice?.outcome === 'accepted' ? copy.accepted : copy.dismissed);
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

            {isPWA ? <div className="install-status success">✓ {copy.installed}</div> : null}
            {!isIos && !isPWA ? (
              <>
                <button className="install-primary-action" type="button" onClick={startInstall} disabled={!installPrompt}>
                  <span aria-hidden="true">↓</span> {copy.installNow}
                </button>
                <p className={`install-prompt-note ${installPrompt ? 'ready' : ''}`}>
                  {installPrompt ? copy.promptReady : copy.promptWaiting}
                </p>
              </>
            ) : null}

            {isIos && !isPWA ? (
              <button className="install-secondary-action" type="button" onClick={copyPageLink}>
                {copy.copyLink}
              </button>
            ) : null}

            {message ? <div className="install-status">{message}</div> : null}
            <Link className="install-back-link" to="/">← {copy.back}</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
