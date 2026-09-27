const { randomUUID } = require('crypto');
const Delivery = require('../models/ScheduledNotificationDelivery');
const MAX_ATTEMPTS = 3;
const LEASE_MS = 10 * 60 * 1000;
const RETRY_DELAY_MS = 5 * 60 * 1000;
// Explicitly create the mandatory indexes even when production autoIndex is disabled.
let indexes;
async function ensureIndexes() {
  if (!indexes) indexes = Delivery.createIndexes().catch(error => { indexes = null; throw error; });
  await indexes;
}
async function claim(key, now = new Date()) {
  await ensureIndexes();
  const claimToken = randomUUID();
  try {
    return await Delivery.create({ ...key, status: 'CLAIMED', attemptCount: 1, claimedAt: now, claimToken });
  } catch (error) { if (error.code !== 11000) throw error; }
  return Delivery.findOneAndUpdate({ ...key, attemptCount: { $lt: MAX_ATTEMPTS }, $or: [
    { status: 'FAILED', retryable: true, updatedAt: { $lte: new Date(now - RETRY_DELAY_MS) } },
    { status: 'CLAIMED', claimedAt: { $lte: new Date(now - LEASE_MS) } }
  ] }, { $set: { status: 'CLAIMED', claimedAt: now, claimToken, lastErrorCode: null }, $inc: { attemptCount: 1 } }, { new: true });
}
async function owns(claimed, now = new Date()) {
  return Delivery.exists({ _id: claimed._id, status: 'CLAIMED', claimToken: claimed.claimToken, claimedAt: { $gt: new Date(now - LEASE_MS) } });
}
async function finish(claimed, result, now = new Date()) {
  return Delivery.updateOne({ _id: claimed._id, claimToken: claimed.claimToken, status: 'CLAIMED' }, { $set: result.ok
    ? { status: 'SENT', sentAt: now, retryable: false, lastErrorCode: null }
    : { status: 'FAILED', retryable: result.retryable === true, lastErrorCode: result.code || 'delivery_failed' } });
}
async function cleanup(now = new Date()) {
  return Delivery.deleteMany({ createdAt: { $lt: new Date(now - 7 * 86400000) } });
}
module.exports = { claim, owns, finish, cleanup, MAX_ATTEMPTS, LEASE_MS, RETRY_DELAY_MS };
