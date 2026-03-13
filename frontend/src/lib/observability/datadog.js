import { datadogRum } from '@datadog/browser-rum'
import { datadogLogs } from '@datadog/browser-logs'

let consoleForwardingInstalled = false
let isForwardingConsole = false

const truthy = (value) => {
  if (value === true || value === false) return value
  if (value == null) return false
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getApiTracingMatchers = () => {
  const apiBase = import.meta.env.VITE_BASE_URL
  if (!apiBase) return []

  try {
    const apiUrl = new URL(apiBase, window.location.origin)
    return [
      apiBase,
      `${apiUrl.origin}/api`
    ]
  } catch {
    return [apiBase]
  }
}

const toSafeValue = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return String(value)
    }
  }

  return value
}

const installConsoleForwarding = () => {
  if (consoleForwardingInstalled) return

  const levelMap = {
    log: 'info',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug'
  }

  Object.keys(levelMap).forEach((method) => {
    const original = console[method]
    if (typeof original !== 'function') return

    console[method] = (...args) => {
      original.apply(console, args)

      if (isForwardingConsole) return

      try {
        isForwardingConsole = true
        const [first, ...rest] = args
        const message = typeof first === 'string' ? first : `console.${method}`
        const details = (typeof first === 'string' ? rest : [first, ...rest]).map(toSafeValue)

        datadogLogs.logger[levelMap[method]](message, {
          source: 'console',
          level: method,
          details
        })
      } catch {
      } finally {
        isForwardingConsole = false
      }
    }
  })

  consoleForwardingInstalled = true
}

export const initializeDatadog = () => {
  const enabled = truthy(import.meta.env.VITE_DD_ENABLED)
  const clientToken = import.meta.env.VITE_DD_CLIENT_TOKEN
  const applicationId = import.meta.env.VITE_DD_APPLICATION_ID

  if (!enabled || !clientToken || !applicationId) return

  const service = import.meta.env.VITE_DD_SERVICE || 'wishtrail-web'
  const env = import.meta.env.VITE_DD_ENV || import.meta.env.MODE || 'development'
  const version = import.meta.env.VITE_DD_VERSION || '1.0.0'
  const site = import.meta.env.VITE_DD_SITE || 'datadoghq.com'
  const forwardConsole = truthy(import.meta.env.VITE_DD_FORWARD_CONSOLE)

  try {
    datadogLogs.init({
      clientToken,
      site,
      service,
      env,
      version,
      forwardErrorsToLogs: true,
      sessionSampleRate: toNumber(import.meta.env.VITE_DD_LOGS_SESSION_SAMPLE_RATE, 100)
    })

    datadogRum.init({
      applicationId,
      clientToken,
      site,
      service,
      env,
      version,
      sessionSampleRate: toNumber(import.meta.env.VITE_DD_RUM_SESSION_SAMPLE_RATE, 100),
      sessionReplaySampleRate: toNumber(import.meta.env.VITE_DD_SESSION_REPLAY_SAMPLE_RATE, 0),
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: import.meta.env.VITE_DD_DEFAULT_PRIVACY_LEVEL || 'mask-user-input',
      allowedTracingUrls: getApiTracingMatchers(),
      traceContextInjection: 'all'
    })

    if (truthy(import.meta.env.VITE_DD_START_SESSION_REPLAY)) {
      datadogRum.startSessionReplayRecording()
    }

    if (forwardConsole) {
      installConsoleForwarding()
    }

    datadogLogs.logger.info('datadog.frontend.initialized', {
      service,
      env,
      version,
      forwardConsole
    })
  } catch (error) {
    console.warn('Datadog frontend initialization failed:', error)
  }
}
