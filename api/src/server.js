const express = require('express');

const createApp = async () => {
  const app = express();

  const api = express.Router();

  api.get('/health', (req, res) => {
    console.log("✅ /health hit");
    res.status(200).send("OK");
  });

  app.use('/api/v1', api);

  return app;
};

module.exports = createApp;
