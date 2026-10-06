import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { PageLoadingProvider } from './context/PageLoadingContext.jsx'
import { CallProvider } from './context/CallContext.jsx'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import './index.css'
import './styles/LightTheme.css'

const prepareNativeRuntime = Capacitor.isNativePlatform()
  ? import('./utils/nativeNetwork.js').then(({ setupNativeNetwork }) => setupNativeNetwork())
  : Promise.resolve();

prepareNativeRuntime.finally(() => {
  const app = (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <CallProvider>
            <PageLoadingProvider>
              <App />
            </PageLoadingProvider>
          </CallProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );

  // React StrictMode intentionally mounts effects twice in development. In a
  // native WebView that duplicates Capacitor listeners and plugin setup.
  ReactDOM.createRoot(document.getElementById('root')).render(
    Capacitor.isNativePlatform() ? app : <React.StrictMode>{app}</React.StrictMode>,
  );
});
