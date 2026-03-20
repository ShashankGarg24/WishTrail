const { logger } = require('./../config/observability');
const productUpdateService = require('../services/productUpdateService');
const redis = require('../config/redis');

const WHATS_NEW_CACHE_TTL_SECONDS = 12 * 60 * 60;
const WHATS_NEW_CACHE_PREFIX = 'wishtrail:whats_new:list';
const PRODUCT_UPDATE_TYPES = ['bug_fix', 'enhancement', 'feature'];

const getWhatsNewCacheKey = ({ page, limit }) => `${WHATS_NEW_CACHE_PREFIX}:page:${page}:limit:${limit}`;

const normalizeTypesInput = (rawType) => {
  const source = Array.isArray(rawType) ? rawType : String(rawType || '').split(',');
  const cleaned = source
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(cleaned)];
  const invalid = unique.filter((item) => !PRODUCT_UPDATE_TYPES.includes(item));

  return {
    normalized: unique.join(','),
    values: unique,
    invalid
  };
};

const clearWhatsNewListCache = async () => {
  try {
    if (typeof redis.keys === 'function') {
      const keys = await redis.keys(`${WHATS_NEW_CACHE_PREFIX}:*`);
      if (Array.isArray(keys) && keys.length > 0) {
        await redis.del(...keys);
      }
      return;
    }
    await Promise.allSettled([
      redis.del(getWhatsNewCacheKey({ page: 1, limit: 50 })),
      redis.del(getWhatsNewCacheKey({ page: 1, limit: 100 }))
    ]);
  } catch (error) {
    logger.warn('[productUpdates] Failed to clear whats new cache', { error: error?.message });
  }
};

module.exports = {
  /**
   * Get latest major update for current user (unseen)
   * @route GET /api/v1/product-updates/latest
   * @access Private
   */
  async getLatestMajorUpdate(req, res, next) {
    try {
      const userId = req.user.id;
      const update = await productUpdateService.getLatestUnseenMajorUpdate(userId);
      
      if (!update) {
        return res.status(200).json({
          success: true,
          data: { update: null }
        });
      }
      
      res.status(200).json({
        success: true,
        data: { update }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mark update as seen by user
   * @route POST /api/v1/product-updates/seen
   * @access Private
   */
  async markUpdateAsSeen(req, res, next) {
    try {
      const { version } = req.body;
      
      if (!version) {
        return res.status(400).json({
          success: false,
          message: 'Version is required'
        });
      }
      
      const userId = req.user.id;
      const result = await productUpdateService.markUpdateAsSeen(userId, version);
      
      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'Failed to mark update as seen'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Update marked as seen',
        data: { lastSeenVersion: result.lastSeenUpdateVersion }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all product updates (paginated, sorted by created_at DESC)
   * @route GET /api/v1/product-updates
   * @access Public
   */
  async getAllUpdates(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;

      const cacheKey = getWhatsNewCacheKey({ page: pageNum, limit: limitNum });
      try {
        const cachedPayload = await redis.get(cacheKey);
        if (cachedPayload) {
          return res.status(200).json(JSON.parse(cachedPayload));
        }
      } catch (cacheError) {
        logger.warn('[productUpdates] Cache read failed', { error: cacheError?.message, cacheKey });
      }
      
      const updates = await productUpdateService.getAllUpdates({
        limit: limitNum,
        offset
      });
      
      const totalCount = await productUpdateService.getUpdateCount();
      const totalPages = Math.ceil(totalCount / limitNum);
      
      const responsePayload = {
        success: true,
        data: {
          updates,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: totalPages
          }
        }
      };

      try {
        await redis.set(cacheKey, JSON.stringify(responsePayload), { ex: WHATS_NEW_CACHE_TTL_SECONDS });
      } catch (cacheError) {
        logger.warn('[productUpdates] Cache write failed', { error: cacheError?.message, cacheKey });
      }

      res.status(200).json(responsePayload);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get updates by type (bug_fix, enhancement, feature)
   * @route GET /api/v1/product-updates/type/:type
   * @access Public
   */
  async getUpdatesByType(req, res, next) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      if (!PRODUCT_UPDATE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${PRODUCT_UPDATE_TYPES.join(', ')}`
        });
      }
      
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const offset = (pageNum - 1) * limitNum;
      
      const updates = await productUpdateService.getUpdatesByType(type, {
        limit: limitNum,
        offset
      });
      
      res.status(200).json({
        success: true,
        data: { updates }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create product update (Admin only)
   * @route POST /api/v1/product-updates (admin)
   * @access Private (Admin)
   */
  async createUpdate(req, res, next) {
    try {
      const { title, description, version, isMajor = false, type = 'feature' } = req.body;
      
      // Validate required fields
      if (!title || !description || !version) {
        return res.status(400).json({
          success: false,
          message: 'Title, description, and version are required'
        });
      }
      
      const { normalized: normalizedTypes, values: normalizedTypeValues, invalid } = normalizeTypesInput(type);
      if (normalizedTypeValues.length === 0 || invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${PRODUCT_UPDATE_TYPES.join(', ')}`
        });
      }
      
      const update = await productUpdateService.createUpdate({
        title,
        description,
        version,
        isMajor: isMajor === true,
        type: normalizedTypes
      });

      await clearWhatsNewListCache();
      
      res.status(201).json({
        success: true,
        message: 'Product update created successfully',
        data: { update }
      });
    } catch (error) {
      if (error.message.includes('duplicate')) {
        return res.status(400).json({
          success: false,
          message: 'Version already exists'
        });
      }
      next(error);
    }
  },

  /**
   * Delete product update (Admin only)
   * @route DELETE /api/v1/product-updates/:version (admin)
   * @access Private (Admin)
   */
  async deleteUpdate(req, res, next) {
    try {
      const { version } = req.params;
      
      if (!version) {
        return res.status(400).json({
          success: false,
          message: 'Version is required'
        });
      }
      
      const result = await productUpdateService.deleteUpdate(version);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Update not found'
        });
      }

      await clearWhatsNewListCache();
      
      res.status(200).json({
        success: true,
        message: 'Product update deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
