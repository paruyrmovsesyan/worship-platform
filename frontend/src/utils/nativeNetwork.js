import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://worship.pmstudio.am'
  : '';

/**
 * Universal Native Network Bridge:
 * In Native App (iOS/Android):
 *   Uses CapacitorHttp native mobile HTTP layer which bypasses WebKit/Chromium
 *   CORS restrictions, same-origin limits, and handles HTTPS cookies natively.
 * In Web / PWA:
 *   Leaves standard window.fetch 100% untouched.
 */
export function setupNativeNetwork() {
  if (!Capacitor.isNativePlatform()) return;

  const originalFetch = window.fetch;

  window.fetch = async function (input, init = {}) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
    } else if (input && typeof input.toString === 'function') {
      url = input.toString();
    }

    // Resolve relative paths to production domain
    if (url.startsWith('/') && !url.startsWith('//')) {
      url = `${API_BASE_URL}${url}`;
    } else if (!/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url, window.location.href);
        if (parsed.origin === window.location.origin) {
          url = `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // Fallback
      }
    }

    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    // Headers processing
    const headers = {};
    if (input instanceof Request && input.headers) {
      input.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else if (typeof init.headers === 'object') {
        Object.assign(headers, init.headers);
      }
    }

    // Body processing
    let data = init.body;
    if (data === undefined && input instanceof Request) {
      try {
        data = await input.clone().text();
      } catch {}
    }

    // Parse JSON data if header specifies application/json and body is string
    if (typeof data === 'string' && (headers['Content-Type'] || headers['content-type'] || '').includes('application/json')) {
      try {
        data = JSON.parse(data);
      } catch {}
    }

    try {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data,
        webFetchExtra: {
          credentials: 'include'
        }
      });

      // Construct standard Response object for seamless compatibility with response.json(), response.text(), etc.
      let responseBody = response.data;
      if (typeof responseBody === 'object' && responseBody !== null) {
        responseBody = JSON.stringify(responseBody);
      } else if (responseBody === undefined || responseBody === null) {
        responseBody = '';
      } else {
        responseBody = String(responseBody);
      }

      return new Response(responseBody, {
        status: response.status || 200,
        statusText: response.status === 200 ? 'OK' : '',
        headers: new Headers(response.headers || {})
      });
    } catch (err) {
      console.warn('[NativeHttp] Native request failed, falling back to original fetch:', err);
      return originalFetch.call(this, input, init);
    }
  };
}
