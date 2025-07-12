const serverless = require('serverless-http');
const createApp = require('./src/server'); // or correct path

let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    const app = await createApp();
    cachedServer = serverless(app);
  }

  return cachedServer(req, res);
};
