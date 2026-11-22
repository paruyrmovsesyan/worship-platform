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
  const startLoading = ctx?.startLoading;
  const stopLoading = ctx?.stopLoading;

  useEffect(() => {
    if (!startLoading || !stopLoading) return undefined;
    if (isPageLoading) {
      startLoading();
    } else {
      stopLoading();
    }

    return () => {
      // Cleanup: always stop when component unmounts
      stopLoading();
    };
  }, [isPageLoading, startLoading, stopLoading]);
}
