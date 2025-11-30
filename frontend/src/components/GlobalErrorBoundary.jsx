import React from 'react'
import ErrorScreen from './ErrorScreen'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <ErrorScreen 
      type="generic"
      message={error?.message || 'An unexpected error occurred.'}
      showHomeButton={true}
      showRetryButton={true}
      onRetry={resetErrorBoundary}
    />
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


