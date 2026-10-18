const crypto = require('crypto');
const Config = require('../models/Config');
const { validatePromotion } = require('./adminProductService');
const { isPremiumActive } = require('../config/premiumFeatures');

// Start is inclusive; end is exclusive: [startAt, endAt).
function resolvePromotion(value, user, now = Date.now()) {
  if (!user || value?.enabled !== true) return null;
  try {
    // Do not let editor defaults turn malformed stored data into an offer.
    if (typeof value.ctaUrl !== 'string' || !value.ctaUrl.trim()) return null;
    for (const key of ['startAt', 'endAt']) {
      if (value[key] != null && typeof value[key] !== 'string') return null;
    }
    const promotion = validatePromotion(value);
    if (promotion.startAt && now < Date.parse(promotion.startAt)) return null;
    if (promotion.endAt && now >= Date.parse(promotion.endAt)) return null;
    const premium = isPremiumActive(user.premium_expires_at);
    if (promotion.audience !== 'all' && promotion.audience !== (premium ? 'premium' : 'free')) return null;
    const { surface, title, subtitle, offerCopy, ctaLabel, ctaUrl } = promotion;
    const payload = { surface, title, subtitle, offerCopy, ctaLabel, ctaUrl };
    const id = crypto.createHash('sha256').update(JSON.stringify({
      ...payload, startAt: promotion.startAt, endAt: promotion.endAt, audience: promotion.audience,
    })).digest('hex');
    return { id, ...payload };
  } catch {
    return null;
  }
}

async function getActivePromotion(user) {
  return resolvePromotion(await Config.getValue('promotion', null), user);
}

module.exports = { resolvePromotion, getActivePromotion };
