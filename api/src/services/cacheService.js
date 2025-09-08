const redisClient = require('../config/redis');

class CacheService {
  constructor() {
    this.CACHE_KEYS = {
      GLOBAL_ACTIVITIES: 'wishtrail:activities:global',
      PERSONAL_ACTIVITIES: 'wishtrail:activities:personal',
      TRENDING_ACTIVITIES: 'wishtrail:activities:trending',
      USER_ACTIVITIES: 'wishtrail:activities:user',
      ACTIVITY_FEED: 'wishtrail:activities:feed',
      ACTIVITY_STATS: 'wishtrail:activities:stats',
      GLOBAL_LEADERBOARD: 'wishtrail:leaderboard:global',
      CATEGORY_LEADERBOARD: 'wishtrail:leaderboard:category',
      ACHIEVEMENT_LEADERBOARD: 'wishtrail:leaderboard:achievement',
      FRIENDS_LEADERBOARD: 'wishtrail:leaderboard:friends',
      LEADERBOARD_STATS: 'wishtrail:leaderboard:stats',
      USER_SEARCH: 'wishtrail:search:users',
      GOAL_SEARCH: 'wishtrail:search:goals',
      TRENDING_GOALS: 'wishtrail:goals:trending'
    };
    
    this.CACHE_TTL = {
      DEFAULT: 600,
      THREE_MINUTES: 180, // 3 minutes
      FIVE_MINUTES: 300, // 5 minutes
      TEN_MINUTES: 600, // 10 minutes
      THIRTY_MINUTES: 1800 // 30 minutes
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
    if (params.rarity) keyParts.push(`rarity:${params.rarity}`);
    if (params.strategy) keyParts.push(`strategy:${params.strategy}`);

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
      // Upstash Redis: use set with EX
      await redisClient.set(key, data, { ex: ttl });
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
    return await this.get(key);
  }

  async setGlobalActivities(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.GLOBAL_ACTIVITIES, params);
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  // Personal activities cache methods
  async getPersonalActivities(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.PERSONAL_ACTIVITIES, { userId, ...params });
    return await this.get(key);
  }

  async setPersonalActivities(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.PERSONAL_ACTIVITIES, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  // Trending activities cache methods
  async getTrendingActivities(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_ACTIVITIES, params);
    return await this.get(key);
  }

  async setTrendingActivities(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_ACTIVITIES, params);
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  // User activities cache methods
  async getUserActivities(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.USER_ACTIVITIES, { userId, ...params });
    return await this.get(key);
  }

  async setUserActivities(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.USER_ACTIVITIES, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  // Activity feed cache methods
  async getActivityFeed(userId, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACTIVITY_FEED, { userId, ...params });
    return await this.get(key);
  }

  async setActivityFeed(userId, data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACTIVITY_FEED, { userId, ...params });
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
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
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
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


  // Leaderboard cache methods
  async getGlobalLeaderboard(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.GLOBAL_LEADERBOARD, params);
    return await this.get(key);
  }

  async setGlobalLeaderboard(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.GLOBAL_LEADERBOARD, params);
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  async getCategoryLeaderboard(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.CATEGORY_LEADERBOARD, params);
    return await this.get(key);
  }

  async setCategoryLeaderboard(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.CATEGORY_LEADERBOARD, params);
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  async getAchievementLeaderboard(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACHIEVEMENT_LEADERBOARD, params);
    return await this.get(key);
  }

  async setAchievementLeaderboard(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.ACHIEVEMENT_LEADERBOARD, params);
    return await this.set(key, data, this.CACHE_TTL.TEN_MINUTES);
  }

  async getFriendsLeaderboard(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.FRIENDS_LEADERBOARD, params);
    return await this.get(key);
  }

  async setFriendsLeaderboard(data, params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.FRIENDS_LEADERBOARD, params);
    return await this.set(key, data, this.CACHE_TTL.FIVE_MINUTES);
  }

  async getLeaderboardStats() {
    return await this.get(this.CACHE_KEYS.LEADERBOARD_STATS);
  }

  async setLeaderboardStats(data) {
    return await this.set(this.CACHE_KEYS.LEADERBOARD_STATS, data, this.CACHE_TTL.THIRTY_MINUTES);
  }

  // Invalidate leaderboard caches
  async invalidateAllLeaderboards() {
    const patterns = [
      `${this.CACHE_KEYS.GLOBAL_LEADERBOARD}*`,
      `${this.CACHE_KEYS.CATEGORY_LEADERBOARD}*`,
      `${this.CACHE_KEYS.ACHIEVEMENT_LEADERBOARD}*`,
      `${this.CACHE_KEYS.FRIENDS_LEADERBOARD}*`,
      `${this.CACHE_KEYS.LEADERBOARD_STATS}*`
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

  // =====================
  // Search cache helpers
  // =====================
  _keyForSearch(baseKey, params = {}) {
    const parts = [baseKey];
    const add = (k, v) => {
      if (v === undefined || v === null || v === '') return;
      parts.push(`${k}:${String(v)}`);
    };
    add('interest', params.interest);
    add('q', params.q);
    add('page', parseInt(params.page));
    add('limit', parseInt(params.limit));
    add('category', params.category);
    return parts.join(':');
  }

  async getUserSearch(params = {}) {
    const key = this._keyForSearch(this.CACHE_KEYS.USER_SEARCH, params);
    return await this.get(key);
  }

  async setUserSearch(data, params = {}) {
    const key = this._keyForSearch(this.CACHE_KEYS.USER_SEARCH, params);
    return await this.set(key, data, this.CACHE_TTL.THREE_MINUTES);
  }

  async getGoalSearch(params = {}) {
    const key = this._keyForSearch(this.CACHE_KEYS.GOAL_SEARCH, params);
    return await this.get(key);
  }

  async setGoalSearch(data, params = {}) {
    const key = this._keyForSearch(this.CACHE_KEYS.GOAL_SEARCH, params);
    return await this.set(key, data, this.CACHE_TTL.THREE_MINUTES);
  }

  // =====================
  // Trending goals cache
  // =====================
  async getTrendingGoals(params = {}) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_GOALS, params);
    return await this.get(key);
  }

  async setTrendingGoals(data, params = {}, ttl = this.CACHE_TTL.TEN_MINUTES) {
    const key = this.generateKey(this.CACHE_KEYS.TRENDING_GOALS, params);
    return await this.set(key, data, ttl);
  }

  async invalidateTrendingGoals() {
    return await this.deletePattern(`${this.CACHE_KEYS.TRENDING_GOALS}*`);
  }
}

module.exports = new CacheService();