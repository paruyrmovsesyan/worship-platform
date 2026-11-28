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

      const isChunkOrCssError =
        /Unable to preload CSS/i.test(err?.message || '') ||
        /Failed to fetch dynamically imported module/i.test(err?.message || '') ||
        /Loading chunk .* failed/i.test(err?.message || '');

      if (!alreadyRetried) {
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch {}

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          // Retry import once before falling back to reload
          try {
            const retryMod = await importer();
            return retryMod;
          } catch {
            if (isChunkOrCssError) {
              window.location.reload();
              return new Promise(() => {});
            }
          }
        } else if (isChunkOrCssError && typeof window !== 'undefined') {
          // When offline and chunk/CSS preload fails, reload once network returns
          window.addEventListener('online', () => window.location.reload(), { once: true });
        }
      }
      throw err;
    }
  });
}
