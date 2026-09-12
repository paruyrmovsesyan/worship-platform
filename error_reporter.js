/**
 * Worship Platform — Real-Time Error Reporter
 * Automatically captures frontend JavaScript errors, unhandled promise rejections,
 * and sends them to /error_api.php for real-time admin monitoring.
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.__wp_error_reporter_initialized) return;
  window.__wp_error_reporter_initialized = true;

  const ENDPOINT = '/error_api.php';
  const recentErrors = new Map();
  let errorCount = 0;
  let errorWindowStart = Date.now();

  function isStandaloneApp() {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://') ||
        sessionStorage.getItem('wp_active_app_source') === 'pwa'
      );
    } catch (_) {
      return false;
    }
  }

  function getUserMeta() {
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
    return { userId, userEmail };
  }

  function getDeviceInfo() {
    try {
      return {
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        online: navigator.onLine !== false,
        platform: navigator.platform || '',
        language: navigator.language || '',
      };
    } catch (_) {
      return {};
    }
  }

  function sendErrorReport(payload) {
    try {
      // Rate limiting: max 6 errors per 10 seconds
      const now = Date.now();
      if (now - errorWindowStart > 10000) {
        errorCount = 0;
        errorWindowStart = now;
      }
      if (++errorCount > 6) {
        return;
      }

      // Deduplicate identical errors within 30 seconds
      const dedupKey = `${payload.level}|${payload.message}|${payload.file || ''}|${payload.line || 0}`;
      const lastSent = recentErrors.get(dedupKey);
      if (lastSent && (now - lastSent) < 30000) {
        return;
      }
      recentErrors.set(dedupKey, now);

      // Clean old entries
      if (recentErrors.size > 50) {
        for (const [k, t] of recentErrors.entries()) {
          if (now - t > 60000) recentErrors.delete(k);
        }
      }

      const body = JSON.stringify(payload);

      if (typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        const sent = navigator.sendBeacon(ENDPOINT, blob);
        if (sent) return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
      }).catch(function() {});
    } catch (_) {}
  }

  // 1. Uncaught JS Runtime Errors
  window.addEventListener('error', function(event) {
    try {
      // Ignore cross-origin script error noise without details
      if (event.message === 'Script error.' && !event.filename) {
        return;
      }

      const isResourceError = event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK');
      const { userId, userEmail } = getUserMeta();

      if (isResourceError) {
        const sourceUrl = event.target.src || event.target.href || '';
        sendErrorReport({
          level: 'warning',
          environment: isStandaloneApp() ? 'app' : 'web',
          message: `Resource failed to load: <${event.target.tagName.toLowerCase()}> ${sourceUrl}`,
          file: sourceUrl,
          line: null,
          url: window.location.href,
          stack: null,
          user_id: userId,
          user_email: userEmail,
          device_info: getDeviceInfo(),
        });
        return;
      }

      const errorObj = event.error || {};
      sendErrorReport({
        level: 'error',
        environment: isStandaloneApp() ? 'app' : 'web',
        message: event.message || (errorObj.message ? String(errorObj.message) : 'Uncaught JavaScript error'),
        file: event.filename || null,
        line: event.lineno || null,
        url: window.location.href,
        stack: errorObj.stack || null,
        user_id: userId,
        user_email: userEmail,
        device_info: getDeviceInfo(),
      });
    } catch (_) {}
  }, true);

  // 2. Unhandled Promise Rejections (Fetch failures, async crashes)
  window.addEventListener('unhandledrejection', function(event) {
    try {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack = null;
      let file = null;
      let line = null;

      if (reason instanceof Error) {
        message = `Unhandled Promise Rejection: ${reason.message || reason.name}`;
        stack = reason.stack || null;
      } else if (typeof reason === 'string') {
        message = `Unhandled Promise Rejection: ${reason}`;
      } else if (reason && typeof reason === 'object') {
        try {
          message = `Unhandled Promise Rejection: ${JSON.stringify(reason)}`;
        } catch (_) {
          message = 'Unhandled Promise Rejection: [Object]';
        }
      }

      const { userId, userEmail } = getUserMeta();

      sendErrorReport({
        level: 'promise',
        environment: isStandaloneApp() ? 'app' : 'web',
        message: message,
        file: file,
        line: line,
        url: window.location.href,
        stack: stack,
        user_id: userId,
        user_email: userEmail,
        device_info: getDeviceInfo(),
      });
    } catch (_) {}
  });

  // 3. Global manual reporter
  window.reportAppError = function(error, context) {
    try {
      const { userId, userEmail } = getUserMeta();
      const message = (error instanceof Error) ? error.message : String(error);
      const stack = (error instanceof Error) ? error.stack : null;

      sendErrorReport({
        level: (context && context.level) || 'error',
        environment: isStandaloneApp() ? 'app' : 'web',
        message: context?.prefix ? `[${context.prefix}] ${message}` : message,
        file: context?.file || null,
        line: context?.line || null,
        url: window.location.href,
        stack: stack || (context?.stack ? String(context.stack) : null),
        user_id: userId,
        user_email: userEmail,
        device_info: Object.assign(getDeviceInfo(), context || {}),
      });
    } catch (_) {}
  };

})();
