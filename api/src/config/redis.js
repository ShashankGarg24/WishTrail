let client = null;
try {
  const { Redis } = require('@upstash/redis');
  const url = process.env.REDIS_URL;
  const token = process.env.REDIS_TOKEN;
  if (url && token) {
    client = new Redis({ url, token });
  }
} catch (_) {}

// Fallback no-op client to keep callers simple
const noop = {
  async get() { return null; },
  async set() { return null; },
  async del() { return null; }
};

module.exports = client || noop;
