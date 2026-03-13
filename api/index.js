const createApp = require('./src/server');
const { initializeObservability, logger } = require('./src/config/observability');

initializeObservability();

let cachedApp;

module.exports = async (req, res) => {
  if (!cachedApp) {
    logger.info('serverless.app.initializing');
    cachedApp = await createApp();
    logger.info('serverless.app.ready');
  }

  cachedApp.handle(req, res);
};
