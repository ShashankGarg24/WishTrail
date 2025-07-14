const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.CACHE_KEYS = {
      GLOBAL_ACTIVITIES: 'wishtrail:activities:global',
      PERSONAL_ACTIVITIES: 'wishtrail:activities:personal',
      TRENDING_ACTIVITIES: 'wishtrail:activities:trending',
      USER_ACTIVITIES: 'wishtrail:activities:user',
      ACTIVITY_FEED: 'wishtrail:activities:feed',
      ACTIVITY_STATS: 'wishtrail:activities:stats'
    };
    
    this.CACHE_TTL = {
      DEFAULT: 600,
      GLOBAL_ACTIVITIES: 300, // 5 minutes
      PERSONAL_ACTIVITIES: 180, // 3 minutes
      TRENDING_ACTIVITIES: 600, // 10 minutes
      USER_ACTIVITIES: 300, // 5 minutes
      ACTIVITY_FEED: 180, // 3 minutes
      ACTIVITY_STATS: 1800 // 30 minutes
    };
  }

  // Generate cache key with parameters
  generateKey(baseKey, params = {}) {
    const keyParts = [baseKey];
    
    // Add parameters to key
    if (params.userId) keyParts.push(`user:${params.userId}`);
    if (params.page) keyParts.push(`page:${params.page}`);
    if (params.limit) keyParts.push(`limit:${params.limit}`);
    if (params.type) keyParts.push(`type:${params.type}`);
    if (params.timeframe) keyParts.push(`timeframe:${params.timeframe}`);
    if (params.category) keyParts.push(`category:${params.category}`);
    
    return keyParts.join(':');
  }

  // Get data from cache
  async get(key) {
    try {
      const cached = await redisClient.get(key);
      return cached || null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set data in cache
  async set(key, data, ttl = this.CACHE_TTL.DEFAULT) {
    try {
      const safeData = JSON.parse(JSON.stringify(data));
      // Upstash Redis handles JSON serialization automatically
      await redisClient.setex(key, ttl, data);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cache entry
  async delete(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple cache entries by pattern
  async deletePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Global activities cache methods
  async getGlobalActivities(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.GLOBAL_ACTIVITIES, params);
    console.log(key)
    return await this.get(key);
  }

  async setGlobalActivities(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.GLOBAL_ACTIVITIES, params);
    return await this.set(key, data, this.CACHE_TTL.GLOBAL_ACTIVITIES);
  }

  // Personal activities cache methods
  async getPersonalActivities(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.PERSONAL_ACTIVITIES, { userId, ...params });
    return await this.get(key);
  }

  async setPersonalActivities(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.PERSONAL_ACTIVITIES, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.PERSONAL_ACTIVITIES);
  }

  // Trending activities cache methods
  async getTrendingActivities(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_ACTIVITIES, params);
    return await this.get(key);
  }

  async setTrendingActivities(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_ACTIVITIES, params);
    return await this.set(key, data, this.CACHE_TTL.TRENDING_ACTIVITIES);
  }

  // User activities cache methods
  async getUserActivities(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.USER_ACTIVITIES, { userId, ...params });
    return await this.get(key);
  }

  async setUserActivities(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.USER_ACTIVITIES, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.USER_ACTIVITIES);
  }

  // Activity feed cache methods
  async getActivityFeed(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACTIVITY_FEED, { userId, ...params });
    return await this.get(key);
  }

  async setActivityFeed(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACTIVITY_FEED, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.ACTIVITY_FEED);
  }

  // Activity stats cache methods
  async getActivityStats(userId = null) {
    const key = userId 
      ? this.generateKey(this.CACHE_KEYS.ACTIVITY_STATS, { userId })
      : this.CACHE_KEYS.ACTIVITY_STATS;
    return await this.get(key);
  }

  async setActivityStats(data, userId = null) {
    const key = userId 
      ? this.generateKey(this.CACHE_KEYS.ACTIVITY_STATS, { userId })
      : this.CACHE_KEYS.ACTIVITY_STATS;
    return await this.set(key, data, this.CACHE_TTL.ACTIVITY_STATS);
  }

  // Invalidate all activity caches
  async invalidateAllActivities() {
    const patterns = [
      `${this.CACHE_KEYS.GLOBAL_ACTIVITIES}*`,
      `${this.CACHE_KEYS.PERSONAL_ACTIVITIES}*`,
      `${this.CACHE_KEYS.TRENDING_ACTIVITIES}*`,
      `${this.CACHE_KEYS.USER_ACTIVITIES}*`,
      `${this.CACHE_KEYS.ACTIVITY_FEED}*`
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Invalidate specific user activities
  async invalidateUserActivities(userId) {
    const patterns = [
      `${this.CACHE_KEYS.PERSONAL_ACTIVITIES}*user:${userId}*`,
      `${this.CACHE_KEYS.USER_ACTIVITIES}*user:${userId}*`,
      `${this.CACHE_KEYS.ACTIVITY_FEED}*user:${userId}*`
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Invalidate global caches (when new activity is created)
  async invalidateGlobalCaches() {
    const patterns = [
      `${this.CACHE_KEYS.GLOBAL_ACTIVITIES}*`,
      `${this.CACHE_KEYS.TRENDING_ACTIVITIES}*`
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
  }

  // Health check
  async isHealthy() {
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Clear all cache (for maintenance)
  async clearAll() {
    try {
      await redisClient.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();