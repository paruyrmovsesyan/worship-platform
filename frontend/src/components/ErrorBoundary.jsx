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
      const isApp = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.includes('android-app://') ||
                    sessionStorage.getItem('wp_active_app_source') === 'pwa';
      
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
      } catch (_) {}

      const fullStack = (error?.stack || String(error)) + (errorInfo?.componentStack ? '\n\nReact Component Stack:\n' + errorInfo.componentStack : '');
      const payload = {
        level: 'fatal',
        environment: isApp ? 'app' : 'web',
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
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/error_api.php', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/error_api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(() => {});
      }
    } catch (_) {}
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
