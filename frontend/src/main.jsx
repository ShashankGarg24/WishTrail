import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx'
import { initializeDatadog } from './lib/observability/datadog.js'

initializeDatadog()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </BrowserRouter>,
) 