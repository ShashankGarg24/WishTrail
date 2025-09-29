let client = null;
let feedRedis = null;
let chatRedis = null;
try {
  const { Redis } = require('@upstash/redis');
  const url = process.env.REDIS_URL;
  const token = process.env.REDIS_TOKEN;
  if (url && token) {
    client = new Redis({ url, token });
  }
  const feedUrl = process.env.REDIS_URL_FEED;
  const feedToken = process.env.REDIS_TOKEN_FEED;
  if (feedUrl && feedToken) {
    feedRedis = new Redis({ url: feedUrl, token: feedToken });
  }
  const chatUrl = process.env.REDIS_URL_CHAT;
  const chatToken = process.env.REDIS_TOKEN_CHAT;
  if (chatUrl && chatToken) {
    chatRedis = new Redis({ url: chatUrl, token: chatToken });
  }
} catch (_) {}

// Fallback no-op client to keep callers simple
const noop = {
  async get() { return null; },
  async set() { return null; },
  async del() { return null; }
};
const exported = client || Object.assign(noop, { __isNoop: true });
module.exports = exported;
module.exports.feedRedis = feedRedis || Object.assign({}, noop, { __isNoop: true });
module.exports.chatRedis = chatRedis || Object.assign({}, noop, { __isNoop: true });
