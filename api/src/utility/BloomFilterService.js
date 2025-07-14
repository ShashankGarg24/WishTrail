const { BloomFilter } = require('bloom-filters');
const redisClient = require('../config/redis');

const BLOOM_KEY = 'wishtrail:bloom:user-identifiers';

let bloom = null;

const BloomFilterService = {
  /**
   * Initialize Bloom Filter: load from Redis or create new
   */
  async init(expectedItems = 10000, errorRate = 0.01) {
    const saved = await redisClient.get(BLOOM_KEY);
    if (saved) {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      bloom = BloomFilter.fromJSON(parsed);
      console.log('Bloom Filter loaded from Redis');
    } else {
      let expectedUsers = Number(await redisClient.get("bloom:expected_users")) || expectedItems;
      bloom = BloomFilter.create(expectedUsers, errorRate);
      console.log('Bloom Filter initialized fresh');
    }
  },

  /**
   * Check if username/email *might* exist
   */
  mightExist(value) {
    if (!bloom) throw new Error('Bloom Filter not initialized');
    return bloom.has(value.toLowerCase());
  },

  /**
   * Add username/email to Bloom Filter
   */
  async add(value) {
    if (!bloom) throw new Error('Bloom Filter not initialized');
    bloom.add(value.toLowerCase());
    await redisClient.set(BLOOM_KEY, JSON.stringify(bloom.saveAsJSON()));
  } ,

  /**
   * Rebuild Bloom Filter from full DB snapshot
   */
  async rebuildFromDatabase(UserModel) {
    const users = await UserModel.find({}, { email: 1, username: 1 }).lean();

    const expectedItems = Math.ceil((users.length || 10000) * 1.5)
    bloom = new BloomFilter(expectedItems, 0.01);

    for (const user of users) {
      if (user.email) bloom.add(user.email.toLowerCase());
      if (user.username) bloom.add(user.username.toLowerCase());
    }

    await redisClient.set(BLOOM_KEY, JSON.stringify(bloom.saveAsJSON()));
    console.log(`Bloom Filter rebuilt with ${users.length} entries`);
  },

  async rebuildIdExpectedUsersIncrease(UserModel) {
    // Check if we exceeded threshold
    const currentCount = await UserModel.countDocuments();
    const expectedUsers = Number(await redisClient.get("bloom:expected_users")) || 10000;

    if (currentCount > expectedUsers) {
      // Increase expected size and rebuild
      const newExpected = Math.ceil(currentCount * 1.5);
      await redisClient.set("bloom:expected_users", newExpected);
      await BloomFilterService.rebuildFromDatabase(UserModel);
      console.log("Bloom filter rebuilt with increased size:", newExpected);
    }
  }
};

module.exports = BloomFilterService;
