import { useState, useEffect } from 'react';
import { usePageLoading } from '../context/PageLoadingContext';

export default function TopLoader() {
  const ctx = usePageLoading();
  const isLoading = ctx?.isLoading ?? false;
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const raf = requestAnimationFrame(() => setFinishing(true));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => setFinishing(false), 260);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!isLoading && !finishing) return null;

  return (
    <div
      className={`wp-top-loader-root ${isLoading ? 'is-active' : 'is-finishing'}`}
      aria-hidden="true"
    >
      <div className="wp-top-loader-bar">
        <div className="wp-top-loader-bar-fill" />
      </div>
    </div>
  );
}
