const createApp = require('./src/server');

let cachedApp;

module.exports = async (req, res) => {
  if (!cachedApp) {
    console.log("⏳ Initializing Express app...");
    cachedApp = await createApp();
    console.log("✅ Express app ready");
  }

  cachedApp.handle(req, res);
};
