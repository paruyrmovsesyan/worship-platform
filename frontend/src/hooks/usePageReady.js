import { useEffect } from 'react';
import { usePageLoading } from '../context/PageLoadingContext';

/**
 * usePageReady — call this in any page that has a local `loading` state.
 * Pass the page's loading boolean; TopLoader will show/hide automatically.
 *
 * Usage:
 *   const [loading, setLoading] = useState(true);
 *   usePageReady(loading);
 */
export function usePageReady(isPageLoading) {
  const ctx = usePageLoading();

  useEffect(() => {
    if (!ctx) return;
    if (isPageLoading) {
      ctx.startLoading();
    } else {
      ctx.stopLoading();
    }

    return () => {
      // Cleanup: always stop when component unmounts
      ctx.stopLoading();
    };
  }, [isPageLoading]);
}
