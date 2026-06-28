import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { PageLoadingProvider } from './context/PageLoadingContext.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <PageLoadingProvider>
            <App />
          </PageLoadingProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
