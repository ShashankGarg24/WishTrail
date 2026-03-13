const axios = require('axios');

let tracer;
let processHandlersRegistered = false;
let datadogTransportWarningShown = false;

const truthy = (value) => {
  if (value === true || value === false) return value;
  if (value == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toErrorMeta = (error) => {
  if (!error) return undefined;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
};

const getDatadogSite = () => process.env.DD_SITE || process.env.DATADOG_SITE || 'datadoghq.com';

const getTraceIdentifiers = () => {
  if (!tracer) return {};
  try {
    const activeSpan = tracer.scope().active();
    const spanContext = activeSpan && activeSpan.context && activeSpan.context();
    if (!spanContext) return {};

    return {
      'dd.trace_id': spanContext.toTraceId(),
      'dd.span_id': spanContext.toSpanId()
    };
  } catch {
    return {};
  }
};

const sendToDatadogLogs = async (entry) => {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey) return;

  const site = getDatadogSite();
  const intakeUrl = `https://http-intake.logs.${site}/api/v2/logs`;

  try {
    await axios.post(intakeUrl, [entry], {
      timeout: 1500,
      headers: {
        'DD-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (!datadogTransportWarningShown) {
      datadogTransportWarningShown = true;
      console.warn('⚠️ Datadog log intake is configured but unreachable:', error.message);
    }
  }
};

const buildLogEntry = (level, message, meta = {}) => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  service: process.env.DD_SERVICE || process.env.npm_package_name || 'wishtrail-api',
  env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
  version: process.env.DD_VERSION || process.env.npm_package_version || '0.0.0',
  ...getTraceIdentifiers(),
  ...meta
});

const outputConsole = (level, entry) => {
  const payload = JSON.stringify(entry);
  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
};

const logger = {
  debug(message, meta = {}) {
    if (!truthy(process.env.LOG_DEBUG)) return;
    const entry = buildLogEntry('debug', message, meta);
    outputConsole('debug', entry);
    void sendToDatadogLogs(entry);
  },

  info(message, meta = {}) {
    const entry = buildLogEntry('info', message, meta);
    outputConsole('info', entry);
    void sendToDatadogLogs(entry);
  },

  warn(message, meta = {}) {
    const entry = buildLogEntry('warn', message, meta);
    outputConsole('warn', entry);
    void sendToDatadogLogs(entry);
  },

  error(message, meta = {}) {
    const entry = buildLogEntry('error', message, meta);
    outputConsole('error', entry);
    void sendToDatadogLogs(entry);
  }
};

const requestLoggerMiddleware = (req, res, next) => {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    if (req.path && req.path.endsWith('/health')) return;

    logger.info('http.request', {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
};

const registerProcessHandlers = () => {
  if (processHandlersRegistered) return;

  process.on('unhandledRejection', (reason) => {
    logger.error('process.unhandledRejection', {
      error: toErrorMeta(reason instanceof Error ? reason : new Error(String(reason)))
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('process.uncaughtException', { error: toErrorMeta(error) });
  });

  processHandlersRegistered = true;
};

const initializeObservability = () => {
  if (tracer) return tracer;

  const tracingEnabled = truthy(process.env.DD_TRACE_ENABLED);
  if (!tracingEnabled) {
    logger.info('observability.trace.disabled');
    registerProcessHandlers();
    return null;
  }

  try {
    tracer = require('dd-trace').init({
      service: process.env.DD_SERVICE || 'wishtrail-api',
      env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
      version: process.env.DD_VERSION,
      logInjection: true,
      runtimeMetrics: truthy(process.env.DD_RUNTIME_METRICS_ENABLED),
      profiling: truthy(process.env.DD_PROFILING_ENABLED),
      hostname: process.env.DD_AGENT_HOST,
      port: process.env.DD_TRACE_AGENT_PORT ? Number(process.env.DD_TRACE_AGENT_PORT) : undefined
    });

    logger.info('observability.trace.enabled', {
      agentHost: process.env.DD_AGENT_HOST || '127.0.0.1',
      agentPort: process.env.DD_TRACE_AGENT_PORT || 8126
    });
  } catch (error) {
    logger.error('observability.trace.init_failed', { error: toErrorMeta(error) });
  }

  registerProcessHandlers();
  return tracer;
};

module.exports = {
  initializeObservability,
  logger,
  requestLoggerMiddleware,
  toErrorMeta
};
