const PurchaseHistory = require('../models/PurchaseHistory');
const redis = require('../redisClient');

const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes

async function getRecommendations(userId) {
  const cacheKey = `recommendations:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return { source: 'cache', recommendations: JSON.parse(cached) };
  }

  const history = await PurchaseHistory.find({ userId }).sort({ count: -1 }).limit(10);
  const recommendations = history.map((h) => ({ product: h.product, timesPurchased: h.count }));

  await redis.set(cacheKey, JSON.stringify(recommendations), 'EX', CACHE_TTL_SECONDS);

  return { source: 'computed', recommendations };
}

// Called when the shopping service reports a purchase. Updates the
// frequency count and invalidates the cache so the next request recomputes.
async function recordPurchase(userId, product) {
  await PurchaseHistory.findOneAndUpdate(
    { userId, product },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  await redis.del(`recommendations:${userId}`);
}

module.exports = { getRecommendations, recordPurchase };
