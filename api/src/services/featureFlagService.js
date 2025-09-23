const redis = require('../config/redis');
const FeatureFlag = require('../models/FeatureFlag');

const CACHE_KEY = 'wishtrail:feature_flags:v1';

// Define canonical keys we support initially
const FEATURE_DEFAULTS = {
  journal: { app: true, web: true, description: 'Daily Journal feature' },
  habits: { app: true, web: true, description: 'Habits tracking feature' },
  leaderboard: { app: true, web: true, description: 'Leaderboards feature' },
  community: { app: true, web: true, description: 'Communities feature' },
  goal_division: { app: true, web: true, description: 'Goal sub-goals & progress feature' },
  stories: { app: true, web: true, description: 'Stories/Highlights feature' }
};

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

async function loadFromDb() {
  const docs = await FeatureFlag.find({}).lean();
  const map = {};
  for (const d of docs) {
    const k = normalizeKey(d.key);
    map[k] = { app: !!d.app, web: !!d.web, description: d.description || '' };
  }
  // Ensure defaults exist
  for (const [k, v] of Object.entries(FEATURE_DEFAULTS)) {
    if (!map[k]) map[k] = { app: !!v.app, web: !!v.web, description: v.description || '' };
  }
  return map;
}

async function saveToCache(flags) {
  try {
    await redis.set(CACHE_KEY, JSON.stringify(flags), { ex: 300 }); // 5 min
  } catch (_) {}
}

async function getFromCache() {
  try {
    const raw = await redis.get(CACHE_KEY);
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw);
    // Upstash may return object already parsed if set that way
    return raw;
  } catch (_) {
    return null;
  }
}

async function syncDbWithDefaults() {
  const existing = await FeatureFlag.find({}).select('key').lean();
  const have = new Set(existing.map(e => normalizeKey(e.key)));
  const toCreate = [];
  for (const [k, v] of Object.entries(FEATURE_DEFAULTS)) {
    if (!have.has(k)) {
      toCreate.push({ key: k, app: v.app, web: v.web, description: v.description, rollout: 'on', audience: 'all' });
    }
  }
  if (toCreate.length > 0) {
    await FeatureFlag.insertMany(toCreate, { ordered: false }).catch(() => {});
  }
}

async function getAllFlags({ bypassCache = false } = {}) {
  if (!bypassCache) {
    const cached = await getFromCache();
    if (cached) return cached;
  }
  await syncDbWithDefaults();
  const flags = await loadFromDb();
  await saveToCache(flags);
  return flags;
}

async function isEnabled(featureKey, platform = 'app') {
  const key = normalizeKey(featureKey);
  const flags = await getAllFlags();
  const entry = flags[key];
  if (!entry) return true; // default permissive
  return !!entry[platform === 'web' ? 'web' : 'app'];
}

// Intentionally no export to update flags via API; prefer DB updates by admin/ops

function platformFromRequest(req) {
  const hdr = (req.headers['x-client-platform'] || req.headers['x-platform'] || '').toString().toLowerCase();
  if (hdr === 'web') return 'web';
  if (hdr === 'app' || hdr === 'mobile' || hdr === 'ios' || hdr === 'android') return 'app';
  // Heuristics: if Origin is present, likely web
  try {
    if (req.headers.origin) return 'web';
  } catch {}
  return 'app';
}

module.exports = {
  FEATURE_DEFAULTS,
  normalizeKey,
  getAllFlags,
  isEnabled,
  platformFromRequest
};


