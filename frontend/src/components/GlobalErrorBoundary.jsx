import React from 'react'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow">
        <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">{error?.message || 'An unexpected error occurred.'}</div>
        <button onClick={resetErrorBoundary} className="btn-primary">Try again</button>
      </div>
    </div>
  )
}

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { try { console.error('Global error boundary', error, info) } catch {} }
  render() {
    if (this.state.hasError) return <Fallback error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />
    return this.props.children
  }
}


