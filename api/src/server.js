const express = require('express');

const createApp = async () => {
  const app = express();

  app.get('/health', (req, res) => {
    console.log("✅ /health hit");
    res.status(200).send("OK");
  });

  return app;
};

module.exports = createApp;
