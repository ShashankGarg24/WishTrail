import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </BrowserRouter>,
) 