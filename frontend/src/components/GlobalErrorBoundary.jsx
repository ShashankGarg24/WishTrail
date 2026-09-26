import React from 'react'
import ErrorScreen from './ErrorScreen'

function Fallback({ error, resetErrorBoundary }) {
  React.useEffect(() => {
    // A failed lazy route must reveal the mounted retry screen, not leave the
    // native startup overlay covering it indefinitely.
    const frame = requestAnimationFrame(() => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'WT_STARTUP_READY' }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
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

const isStaleChunkError = (error) => {
  const message = String(error?.message || error || '').toLowerCase()
  return message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('valid javascript mime type')
}

export default class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) {
    try { console.error('Global error boundary', error, info) } catch {}

    // A tab that stays open while Vercel deploys can reference an old hashed
    // lazy chunk. Refresh once to load the current index and chunk manifest.
    if (isStaleChunkError(error)) {
      try {
        const recoveryKey = 'wishtrail:stale-chunk-recovery'
        const lastRecovery = Number(sessionStorage.getItem(recoveryKey) || 0)
        if (!lastRecovery || Date.now() - lastRecovery > 30_000) {
          sessionStorage.setItem(recoveryKey, String(Date.now()))
          window.location.reload()
        }
      } catch {}
    }
  }
  render() {
    if (this.state.hasError) return <Fallback error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />
    return this.props.children
  }
}


