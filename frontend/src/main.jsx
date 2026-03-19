import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx'
import { initializeDatadog } from './lib/observability/datadog.js'

const applyPersistedThemeBeforeMount = () => {
  try {
    const raw = localStorage.getItem('wishtrail-api-store')
    if (!raw) return

    const parsed = JSON.parse(raw)
    const isDark = Boolean(parsed?.state?.isDarkMode)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch {
  }
}

applyPersistedThemeBeforeMount()

initializeDatadog()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </BrowserRouter>,
) 