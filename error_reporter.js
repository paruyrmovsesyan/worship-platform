/**
 * Worship Platform — Deep Real-Time Error Reporter
 * Automatically captures frontend JavaScript runtime errors, React crashes,
 * unhandled promise rejections, console.error logs, failed API calls, and user breadcrumbs,
 * sending them to /error_api.php for instant real-time admin monitoring.
 * Fully optimized and resilient for Web, PWA, iOS, and Android.
 */
(function() {
  'use strict';

  if (window.__wp_error_reporter_initialized) return;
  window.__wp_error_reporter_initialized = true;

  const ENDPOINT = '/error_api.php';
  const OFFLINE_QUEUE_KEY = '__wp_offline_errors_queue';
  const recentErrors = new Map();
  let errorCount = 0;
  let errorWindowStart = Date.now();

  // ── 1. BREADCRUMBS BUFFER ──
  const MAX_BREADCRUMBS = 12;
  const breadcrumbs = [];

  function addBreadcrumb(type, category, message, data) {
    try {
      breadcrumbs.push({
        t: new Date().toISOString().substring(11, 19),
        type: type || 'default',
        category: category || 'app',
        message: String(message || '').slice(0, 160),
        data: data || null
      });
      if (breadcrumbs.length > MAX_BREADCRUMBS) {
        breadcrumbs.shift();
      }
    } catch (_) {}
  }

  window.__wp_add_breadcrumb = addBreadcrumb;

  // Track initial navigation
  let lastKnownUrl = window.location.pathname + window.location.search;
  addBreadcrumb('nav', 'route', lastKnownUrl);

  // Auto-track URL changes
  try {
    const origPushState = history.pushState;
    if (typeof origPushState === 'function') {
      history.pushState = function(...args) {
        const res = origPushState.apply(this, args);
        try {
          const nextUrl = window.location.pathname + window.location.search;
          if (nextUrl !== lastKnownUrl) {
            lastKnownUrl = nextUrl;
            addBreadcrumb('nav', 'route', nextUrl);
          }
        } catch (_) {}
        return res;
      };
    }

    const origReplaceState = history.replaceState;
    if (typeof origReplaceState === 'function') {
      history.replaceState = function(...args) {
        const res = origReplaceState.apply(this, args);
        try {
          const nextUrl = window.location.pathname + window.location.search;
          if (nextUrl !== lastKnownUrl) {
            lastKnownUrl = nextUrl;
            addBreadcrumb('nav', 'route', nextUrl);
          }
        } catch (_) {}
        return res;
      };
    }

    window.addEventListener('popstate', function() {
      try {
        const nextUrl = window.location.pathname + window.location.search;
        lastKnownUrl = nextUrl;
        addBreadcrumb('nav', 'route', nextUrl);
      } catch (_) {}
    });
  } catch (_) {}

  // Auto-track UI interactions (clicks on buttons/links)
  window.addEventListener('click', function(e) {
    try {
      const target = e.target ? (e.target.closest('button, a, [role="button"], input[type="submit"]') || e.target) : null;
      if (!target || !target.tagName) return;
      const tag = target.tagName.toLowerCase();
      let label = target.innerText ? target.innerText.trim().slice(0, 35) : (target.getAttribute('aria-label') || target.getAttribute('title') || target.id || target.className || '');
      addBreadcrumb('ui', 'click', `${tag}${target.id ? '#' + target.id : ''}${label ? ` ("${label}")` : ''}`);
    } catch (_) {}
  }, { capture: true, passive: true });

  // ── 2. PLATFORM & USER DETECTION ──
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

  function isNativeCapacitor() {
    try {
      return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  function getPlatformEnvironment() {
    try {
      if (isNativeCapacitor()) {
        const plat = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : '';
        if (plat === 'ios') return 'ios';
        if (plat === 'android') return 'android';
        return 'app';
      }
      return isStandaloneApp() ? 'app' : 'web';
    } catch (_) {
      return 'web';
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
          userId = parsed.id || parsed.user_id || null;
          userEmail = parsed.email || null;
        }
      }
    } catch (_) {}
    return { userId, userEmail };
  }

  function getDeviceInfo() {
    try {
      const ua = navigator.userAgent || '';
      let os = 'Unknown OS';
      if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
      else if (/Macintosh|Mac OS X/.test(ua) && navigator.maxTouchPoints > 1) os = 'iPadOS';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/Mac OS X/.test(ua)) os = 'macOS';
      else if (/Windows/i.test(ua)) os = 'Windows';
      else if (/Linux/i.test(ua)) os = 'Linux';

      return {
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        online: navigator.onLine !== false,
        platform: navigator.platform || '',
        os: os,
        standalone: isStandaloneApp(),
        native: isNativeCapacitor(),
        language: navigator.language || '',
      };
    } catch (_) {
      return {};
    }
  }

  // ── 3. OFFLINE QUEUE RESILIENCE ──
  function queueOfflineError(payload) {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      if (queue.length > 10) queue.shift();
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (_) {}
  }

  function flushOfflineErrors() {
    if (navigator.onLine === false) return;
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return;
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      const queue = JSON.parse(raw);
      if (Array.isArray(queue) && queue.length > 0) {
        queue.forEach(function(item) {
          sendErrorReport(item, true);
        });
      }
    } catch (_) {}
  }

  window.addEventListener('online', flushOfflineErrors);
  setTimeout(flushOfflineErrors, 3500);

  // ── 4. ERROR DISPATCHER ──
  function sendErrorReport(payload, isFlushingQueue = false) {
    try {
      if (!payload) return;
      const rawMsg = String(payload.message || '');
      const rawStack = String(payload.stack_trace || '');

      // Ignore transient background update polling drops and ServiceWorker registration notices
      if (
        rawMsg.includes('version_manifest') ||
        rawMsg.includes('Version manifest check') ||
        rawStack.includes('version-check.js') ||
        rawMsg.includes('Service worker registration') ||
        rawMsg.includes('service worker registration') ||
        rawMsg.includes('Failed to register a ServiceWorker') ||
        rawMsg.includes('Failed to update a ServiceWorker') ||
        rawMsg.includes('ServiceWorker') ||
        rawStack.includes('ServiceWorkerContainer')
      ) {
        return;
      }

      const now = Date.now();
      // Rate limiting: max 10 errors per 10 seconds
      if (now - errorWindowStart > 10000) {
        errorCount = 0;
        errorWindowStart = now;
      }
      if (++errorCount > 10 && !isFlushingQueue) {
        return;
      }

      // Deduplicate identical errors within 25 seconds
      const dedupKey = `${payload.level}|${payload.message}|${payload.file || ''}|${payload.line || 0}`;
      const lastSent = recentErrors.get(dedupKey);
      if (lastSent && (now - lastSent) < 25000 && !isFlushingQueue) {
        return;
      }
      recentErrors.set(dedupKey, now);

      if (recentErrors.size > 80) {
        for (const [k, t] of recentErrors.entries()) {
          if (now - t > 50000) recentErrors.delete(k);
        }
      }

      // Attach breadcrumbs snapshot & native flag
      if (!payload.breadcrumbs && breadcrumbs.length > 0) {
        payload.breadcrumbs = breadcrumbs.slice();
      }
      payload.is_native = isNativeCapacitor();

      // If user is offline, save to queue and flush when back online
      if (navigator.onLine === false && !isFlushingQueue) {
        queueOfflineError(payload);
        return;
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
      }).catch(function() {
        if (!isFlushingQueue) {
          queueOfflineError(payload);
        }
      });
    } catch (_) {}
  }

  // ── 5. GLOBAL EVENT LISTENERS ──

  // A. Uncaught JS Runtime Errors (Event listener)
  window.addEventListener('error', function(event) {
    try {
      if (event.message === 'Script error.' && !event.filename) {
        return;
      }

      // Ignore synthetic or DOM events with no message, no file, and no error object
      if (!event.message && !event.filename && !event.lineno && (!event.error || typeof event.error !== 'object')) {
        return;
      }

      const targetTag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
      if (targetTag === 'audio' || targetTag === 'video' || targetTag === 'source' || targetTag === 'iframe') {
        // Media elements manage their own playback and errors; do not report as JS code crashes
        return;
      }

      const isResourceError = targetTag === 'img' || targetTag === 'script' || targetTag === 'link';
      const { userId, userEmail } = getUserMeta();

      if (isResourceError) {
        const resourceElement = event.target;
        const resourceTag = targetTag;
        const sourceUrl = resourceElement.src || resourceElement.href || '';
        // Only log local application asset failures
        if (sourceUrl && (sourceUrl.includes(window.location.host) || sourceUrl.startsWith('/'))) {
          const reportResourceError = function() {
            addBreadcrumb('resource', 'error', `<${resourceTag}> ${sourceUrl}`);
            sendErrorReport({
              level: 'warning',
              environment: getPlatformEnvironment(),
              message: `Resource failed to load: <${resourceTag}> ${sourceUrl}`,
              file: sourceUrl,
              line: null,
              url: window.location.href,
              stack_trace: null,
              user_id: userId,
              user_email: userEmail,
              device_info: getDeviceInfo(),
            });
          };

          if (resourceTag !== 'img' || resourceElement.dataset.wpResourceRetried === '1') {
            reportResourceError();
            return;
          }

          // A cancelled navigation or brief mobile-network drop can emit an
          // image error even though the asset is healthy. Confirm availability
          // and retry the image once before logging it as an active problem.
          fetch(sourceUrl, {
            method: 'HEAD',
            cache: 'no-store',
            credentials: 'same-origin',
          }).then(function(response) {
            if (!response.ok) {
              reportResourceError();
              return;
            }

            resourceElement.dataset.wpResourceRetried = '1';
            const retryUrl = new URL(sourceUrl, window.location.href);
            retryUrl.searchParams.set('_wp_retry', String(Date.now()));
            resourceElement.src = retryUrl.href;
          }).catch(reportResourceError);
        }
        return;
      }

      const errorObj = event.error || {};
      const errMsg = event.message || (errorObj.message ? String(errorObj.message) : 'Uncaught JavaScript error');
      addBreadcrumb('error', 'uncaught', errMsg);

      sendErrorReport({
        level: 'error',
        environment: getPlatformEnvironment(),
        message: errMsg,
        file: event.filename || null,
        line: event.lineno || null,
        url: window.location.href,
        stack_trace: errorObj.stack || null,
        user_id: userId,
        user_email: userEmail,
        device_info: getDeviceInfo(),
      });
    } catch (_) {}
  }, true);

  // B. Unhandled Promise Rejections
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

      // Ignore transient ServiceWorker background update/registration network drops & version manifest polling
      if (
        message.includes('Failed to update a ServiceWorker') ||
        message.includes('Failed to register a ServiceWorker') ||
        message.includes('An unknown error occurred when fetching the script') ||
        message.includes('The Service Worker script failed to load') ||
        message.includes('service worker registration') ||
        message.includes('version_manifest') ||
        message.includes('Version manifest check')
      ) {
        return;
      }

      const { userId, userEmail } = getUserMeta();
      addBreadcrumb('error', 'promise', message);

      sendErrorReport({
        level: 'promise',
        environment: getPlatformEnvironment(),
        message: message,
        file: file,
        line: line,
        url: window.location.href,
        stack_trace: stack,
        user_id: userId,
        user_email: userEmail,
        device_info: getDeviceInfo(),
      });
    } catch (_) {}
  });

  // C. Intercept console.error (Captures React errors and third-party failures)
  const origConsoleError = console.error;
  console.error = function(...args) {
    try {
      origConsoleError.apply(console, args);
      const text = args.map(a => {
        if (a instanceof Error) return (a.message || '') + '\n' + (a.stack || '');
        if (typeof a === 'object' && a !== null) {
          try { return JSON.stringify(a); } catch (_) { return String(a); }
        }
        return String(a);
      }).join(' ');

      // Ignore normal dev warnings, version manifest polling & service worker registration notices
      if (
        text &&
        !text.includes('Download the React DevTools') &&
        !text.includes('[Fast Refresh]') &&
        !text.includes('React Router Future Flag Warning') &&
        !text.includes('version_manifest') &&
        !text.includes('Version manifest check') &&
        !text.includes('Service worker registration') &&
        !text.includes('service worker registration') &&
        !text.includes('ServiceWorkerContainer') &&
        !text.includes('Failed to register a ServiceWorker')
      ) {
        const firstErr = args.find(a => a instanceof Error);
        const { userId, userEmail } = getUserMeta();
        addBreadcrumb('console', 'error', text.slice(0, 120));

        sendErrorReport({
          level: 'error',
          environment: getPlatformEnvironment(),
          message: text.length > 500 ? text.slice(0, 500) + '...' : text,
          file: firstErr?.fileName || window.location.pathname,
          line: firstErr?.lineNumber || null,
          url: window.location.href,
          stack_trace: firstErr?.stack || text,
          user_id: userId,
          user_email: userEmail,
          device_info: getDeviceInfo(),
        });
      }
    } catch (_) {}
  };

  // D. Intercept fetch to track breadcrumbs and report 500 server crashes
  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch;
    window.fetch = function(...args) {
      const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      const reqMethod = (args[1] && args[1].method ? args[1].method : 'GET').toUpperCase();

      return origFetch.apply(this, args).then(function(res) {
        try {
          if (!reqUrl.includes('error_api.php')) {
            const cleanUrl = reqUrl.split('?')[0];
            addBreadcrumb('http', 'fetch', `${reqMethod} ${cleanUrl} [${res.status}]`);
          }

          const isOfflineResponse =
            navigator.onLine === false ||
            res.statusText === 'Offline' ||
            res.headers?.get('X-SW-Offline') === '1' ||
            res.headers?.get('x-sw-offline') === '1';

          // Only report real server crashes (5xx), ignoring simulated offline SW responses
          if (!res.ok && res.status >= 500 && !reqUrl.includes('error_api.php') && !isOfflineResponse) {
            const { userId, userEmail } = getUserMeta();
            sendErrorReport({
              level: 'fatal',
              environment: getPlatformEnvironment(),
              message: `HTTP Server Error ${res.status} ${res.statusText} on ${reqUrl}`,
              file: reqUrl,
              line: null,
              url: window.location.href,
              stack_trace: `Failed endpoint: ${reqUrl}\nStatus: ${res.status} (${res.statusText})`,
              user_id: userId,
              user_email: userEmail,
              device_info: getDeviceInfo(),
            });
          }
        } catch (_) {}
        return res;
      }).catch(function(err) {
        try {
          if (!reqUrl.includes('error_api.php')) {
            addBreadcrumb('http', 'failed', `${reqMethod} ${reqUrl.split('?')[0]} (${err.message || 'Failed'})`);
          }
        } catch (_) {}
        throw err;
      });
    };
  }

  // E. Global manual reporter
  window.reportAppError = function(error, context) {
    try {
      const { userId, userEmail } = getUserMeta();
      const message = (error instanceof Error) ? error.message : String(error);
      const stack = (error instanceof Error) ? error.stack : null;

      addBreadcrumb('manual', 'report', message);

      sendErrorReport({
        level: (context && context.level) || 'error',
        environment: context?.environment || getPlatformEnvironment(),
        message: context?.prefix ? `[${context.prefix}] ${message}` : message,
        file: context?.file || null,
        line: context?.line || null,
        url: window.location.href,
        stack_trace: stack || (context?.stack ? String(context.stack) : null),
        user_id: userId,
        user_email: userEmail,
        device_info: Object.assign(getDeviceInfo(), context || {}),
        breadcrumbs: breadcrumbs.slice(),
      });
    } catch (_) {}
  };

})();
