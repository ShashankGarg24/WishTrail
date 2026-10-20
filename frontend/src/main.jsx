import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx'
import { preloadHomeBanner } from './utils/homeBanner.js'

import { applyTheme, readThemeMode, resolveDarkMode } from './utils/theme'

applyTheme(resolveDarkMode(readThemeMode()))
preloadHomeBanner()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </BrowserRouter>,
)
