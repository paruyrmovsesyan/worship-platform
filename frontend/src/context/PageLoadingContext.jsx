import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const PageLoadingContext = createContext(null);

export function PageLoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);

  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
    }
  }, []);

  return (
    <PageLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  return useContext(PageLoadingContext);
}
