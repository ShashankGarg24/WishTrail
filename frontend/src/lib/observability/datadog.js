import { datadogRum } from '@datadog/browser-rum'
import { datadogLogs } from '@datadog/browser-logs'

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

export const initializeDatadog = () => {
  const enabled = truthy(import.meta.env.VITE_DD_ENABLED)
  const clientToken = import.meta.env.VITE_DD_CLIENT_TOKEN
  const applicationId = import.meta.env.VITE_DD_APPLICATION_ID

  if (!enabled || !clientToken || !applicationId) return

  const service = import.meta.env.VITE_DD_SERVICE || 'wishtrail-web'
  const env = import.meta.env.VITE_DD_ENV || import.meta.env.MODE || 'development'
  const version = import.meta.env.VITE_DD_VERSION || '1.0.0'
  const site = import.meta.env.VITE_DD_SITE || 'datadoghq.com'

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

    datadogLogs.logger.info('datadog.frontend.initialized', {
      service,
      env,
      version
    })
  } catch (error) {
    console.warn('Datadog frontend initialization failed:', error)
  }
}
