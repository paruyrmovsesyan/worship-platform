import React from 'react';
import '../pages/ErrorPages.css';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in React ErrorBoundary:", error, errorInfo);
    try {
      const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;
      const nativePlatform = isNativeApp ? window.Capacitor.getPlatform() : null;
      const isPwa = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.includes('android-app://') ||
                    sessionStorage.getItem('wp_active_app_source') === 'pwa';

      let environment = 'web';
      if (isNativeApp && (nativePlatform === 'ios' || nativePlatform === 'android')) {
        environment = nativePlatform;
      } else if (isPwa) {
        environment = 'app';
      }
      
      let userId = null;
      let userEmail = null;
      try {
        const rawUser = localStorage.getItem('user') || localStorage.getItem('auth_user') || localStorage.getItem('worship_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed) {
            userId = parsed.id || null;
            userEmail = parsed.email || null;
          }
        }
      } catch {
        // Error reporting must not fail when storage is unavailable.
      }

      const fullStack = (error?.stack || String(error)) + (errorInfo?.componentStack ? '\n\nReact Component Stack:\n' + errorInfo.componentStack : '');
      const payload = {
        level: 'fatal',
        environment: environment,
        is_native: isNativeApp,
        message: 'React Error: ' + (error?.message || String(error)),
        file: error?.fileName || window.location.pathname,
        line: error?.lineNumber || null,
        url: window.location.href,
        stack_trace: fullStack,
        user_id: userId,
        user_email: userEmail,
        device_info: {
          screen: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          online: navigator.onLine !== false,
          userAgent: navigator.userAgent
        }
      };

      if (typeof window.reportAppError === 'function') {
        window.reportAppError(error, {
          level: 'fatal',
          prefix: 'React ErrorBoundary',
          stack: fullStack,
        });
      }

      const body = JSON.stringify(payload);
      try {
        fetch('/error_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(() => {});
      } catch {
        // The global reporter above remains the fallback transport.
      }
    } catch {
      // Never let diagnostic reporting replace the original render error.
    }

    this.recoverFromMixedBundle(error);
  }

  recoverFromMixedBundle(error) {
    const message = String(error?.message || error || '');
    const isProviderMismatch =
      /Cannot destructure property ['"](?:user|t)['"]/.test(message) ||
      /use(?:Navigate|Location)\(\) may be used only in the context of a <Router>/.test(message);

    if (!isProviderMismatch || navigator.onLine === false) return;

    const entryResource = performance
      .getEntriesByType('resource')
      .find((entry) => /\/assets\/index(?:-[a-zA-Z0-9_-]+)?\.js/.test(entry.name));
    let releaseToken = 'unknown';
    try {
      const parsed = new URL(entryResource?.name || window.location.href);
      releaseToken = parsed.searchParams.get('v') || parsed.pathname.split('/').pop() || 'unknown';
    } catch {
      // An unknown token still receives one guarded recovery attempt.
    }
    const recoveryKey = `wp_mixed_bundle_recovery_${releaseToken}`;
    try {
      if (sessionStorage.getItem(recoveryKey)) return;
      sessionStorage.setItem(recoveryKey, String(Date.now()));
    } catch {
      return;
    }

    // The service worker refreshes the entry asset in the background. A
    // single delayed reload then mounts the entry and lazy chunks from the
    // same release without creating a reload loop.
    window.setTimeout(() => window.location.reload(), 700);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page-wrapper">
          <div className="error-card danger-theme">
            <div className="error-hero-glow danger" />
            <div className="error-badge danger">APPLICATION ERROR</div>

            <h1 className="error-title">Ինչ-որ բան սխալ գնաց</h1>
            <p className="error-subtitle">
              Ծրագրում տեղի է ունեցել անսպասելի սխալ: Խնդրում ենք թարմացնել էջը կամ վերադառնալ գլխավոր էջ:
            </p>

            {this.state.error?.message && (
              <div style={{ margin: '14px 0', padding: '10px 14px', background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: '10px', color: '#ff6b81', fontSize: '0.82rem', textAlign: 'left', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                ⚠️ {this.state.error.message}
              </div>
            )}

            <div className="error-actions">
              <button className="btn-error primary" onClick={() => window.location.reload()}>
                🔄 Թարմացնել Էջը
              </button>
              <button className="btn-error secondary" onClick={() => window.location.href = '/'}>
                🏠 Գլխավոր Էջ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
