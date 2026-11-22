import React from 'react';

/**
 * React.lazy wrapper that gracefully retries once if a dynamic chunk fails
 * to load right after a new deployment (stale chunk URL).
 */
export function lazyWithRetry(importer, chunkKey = '') {
  return React.lazy(async () => {
    const storageKey = `wp_chunk_retry_${chunkKey || 'default'}`;
    try {
      const mod = await importer();
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      return mod;
    } catch (err) {
      let alreadyRetried = false;
      try {
        alreadyRetried = sessionStorage.getItem(storageKey) === '1';
      } catch {}

      if (!alreadyRetried && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch {}
        // Retry import once before falling back to reload
        try {
          const retryMod = await importer();
          return retryMod;
        } catch {
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw err;
    }
  });
}
