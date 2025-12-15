const { validationResult } = require('express-validator');
const communityService = require('../services/communityService');

module.exports = {
  async listMyCommunities(req, res, next) {
    try {
      const data = await communityService.listMyCommunities(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async myJoinedItems(req, res, next) {
    try {
      const data = await communityService.listMyJoinedItems(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async discoverCommunities(req, res, next) {
    try {
      const interests = (req.query.interests || '').split(',').filter(Boolean);
      const search = req.query.search || req.query.q || '';
      const data = await communityService.discoverCommunities(req.user.id, { 
        interests, 
        search,
        limit: parseInt(req.query.limit) || 10 
      });
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createCommunity(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      const created = await communityService.createCommunity(req.user.id, req.body || {});
      res.status(201).json({ success: true, data: created });
    } catch (e) { next(e); }
  },
  async updateCommunity(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const data = await communityService.updateCommunity(req.user.id, id, payload);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getCommunity(req, res, next) {
    try {
      const { community, role, isMember } = await communityService.getCommunitySummary(req.params.id, req.user.id);
      res.status(200).json({ success: true, data: { community, role, isMember } });
    } catch (e) { next(e); }
  },
  async getDashboard(req, res, next) {
    try {
      const data = await communityService.getCommunityDashboard(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getAnalytics(req, res, next) {
    try {
      const weeks = Math.min(parseInt(req.query.weeks) || 12, 52);
      const data = await communityService.getCommunityAnalytics(req.params.id, { weeks });
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async listItems(req, res, next) {
    try {
      const data = await communityService.listCommunityItems(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async listPendingItems(req, res, next) {
    try {
      const data = await communityService.listPendingItems(req.params.id, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async suggestItem(req, res, next) {
    try {
      const payload = req.body || {};
      const item = await communityService.suggestCommunityItem(req.params.id, req.user.id, payload);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  },
  async approveItem(req, res, next) {
    try {
      const approve = String(req.body.approve) === 'true' || req.body.approve === true;
      const item = await communityService.approveCommunityItem(req.params.id, req.params.itemId, req.user.id, approve);
      res.status(200).json({ success: true, data: item });
    } catch (e) { next(e); }
  },
  async createNewItem(req, res, next) {
    try {
      const item = await communityService.createCommunityOwnedItem(req.params.id, req.user.id, req.body || {});
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  },
  async copyFromPersonal(req, res, next) {
    try {
      const item = await communityService.copyFromPersonalToCommunity(req.params.id, req.user.id, req.body || {});
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  },
  async joinItem(req, res, next) {
    try {
      const doc = await communityService.joinItem(req.user.id, req.params.id, req.params.itemId);
      res.status(200).json({ success: true, data: doc });
    } catch (e) { next(e); }
  },
  async leaveItem(req, res, next) {
    try {
      const options = {
        deletePersonalCopy: req.body.deletePersonalCopy,
        transferToPersonal: req.body.transferToPersonal
      };
      const result = await communityService.leaveItem(req.user.id, req.params.id, req.params.itemId, options);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  },
  async removeItem(req, res, next) {
    try {
      const result = await communityService.removeCommunityItem(req.params.id, req.params.itemId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  },
  async getItemProgress(req, res, next) {
    try {
      const result = await communityService.getItemProgress(req.user.id, req.params.id, req.params.itemId);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  },
  async getItemAnalytics(req, res, next) {
    try {
      const days = Math.min(parseInt(req.query.days) || 30, 180);
      const result = await communityService.getItemAnalytics(req.params.id, req.params.itemId, { days });
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  },
  async join(req, res, next) {
    try {
      const membership = await communityService.joinCommunity(req.user.id, req.params.id);
      res.status(200).json({ success: true, data: { membership } });
    } catch (e) { next(e); }
  },
  async leave(req, res, next) {
    try {
      const result = await communityService.leaveCommunity(req.user.id, req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  },
  async deleteCommunity(req, res, next) {
    try {
      const id = req.params.id;
      const { community, role } = await communityService.getCommunitySummary(id, req.user.id);
      if (role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
      const ok = await communityService.deleteCommunity(id);
      return res.status(200).json({ success: true, data: { ok: !!ok } });
    } catch (e) { next(e); }
  },
  async members(req, res, next) {
    try {
      const data = await communityService.listMembers(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async pendingMembers(req, res, next) {
    try {
      const data = await communityService.listPendingMembers(req.params.id, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async approveMember(req, res, next) {
    try {
      const approve = String(req.body.approve) === 'true' || req.body.approve === true;
      const updated = await communityService.decideMembership(req.params.id, req.params.userId, req.user.id, approve);
      res.status(200).json({ success: true, data: updated });
    } catch (e) { next(e); }
  },
  async feed(req, res, next) {
    try {
      const filter = String(req.query.filter || 'all');
      const limit = parseInt(req.query.limit) || 20;
      const before = req.query.before ? new Date(req.query.before) : null;
      const data = await communityService.getFeed(req.params.id, { limit, filter, before });
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async removeMember(req, res, next) {
    try {
      const data = await communityService.removeMember(req.params.id, req.params.userId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async memberAnalytics(req, res, next) {
    try {
      const data = await communityService.getMemberAnalytics(req.params.id, req.params.userId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (e) { next(e); }
  }
};


