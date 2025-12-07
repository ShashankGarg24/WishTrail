const express = require('express');
const { protect } = require('../middleware/auth');
const controller = require('../controllers/communityController');
const { requireFeature } = require('../middleware/featureFlags');

const router = express.Router();

// My communities and discovery
router.get('/mine', protect, requireFeature('community'), controller.listMyCommunities);
router.get('/discover', protect, requireFeature('community'), controller.discoverCommunities);
router.get('/joined/items', protect, requireFeature('community'), controller.myJoinedItems);

// Create
router.post('/', protect, requireFeature('community'), controller.createCommunity);
router.patch('/:id', protect, requireFeature('community'), controller.updateCommunity);

// Detail
router.get('/:id', protect, requireFeature('community'), controller.getCommunity);
router.get('/:id/dashboard', protect, requireFeature('community'), controller.getDashboard);
router.get('/:id/analytics', protect, requireFeature('community'), controller.getAnalytics);
router.get('/:id/feed', protect, requireFeature('community'), controller.feed);
router.post('/:id/chat', protect, requireFeature('community'), async (req, res, next) => {
  try {
    const svc = require('../services/communityService');
    const msg = await svc.sendChatMessage(req.params.id, { id: req.user.id, name: req.user.name, avatar: req.user.avatar }, req.body || {});
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:message:new', msg); } catch {}
    res.status(201).json({ success: true, data: msg });
  } catch (e) { next(e); }
});
router.delete('/:id/chat/:msgId', protect, requireFeature('community'), async (req, res, next) => {
  try {
    const svc = require('../services/communityService');
    const out = await svc.deleteChatMessage(req.params.id, req.user.id, req.params.msgId);
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:message:deleted', { _id: req.params.msgId }); } catch {}
    res.status(200).json({ success: true, data: out });
  } catch (e) { next(e); }
});
router.post('/:id/reactions', protect, requireFeature('community'), async (req, res, next) => {
  try {
    const { targetType, targetId, emoji } = req.body || {};
    const svc = require('../services/communityService');
    const out = await svc.toggleReaction(String(targetType), String(targetId), req.user.id, emoji);
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:reaction:changed', { targetType, targetId, reactions: out.reactions }); } catch {}
    res.status(200).json({ success: true, data: out });
  } catch (e) { next(e); }
});
router.get('/:id/items', protect, requireFeature('community'), controller.listItems);
router.get('/:id/items/pending', protect, requireFeature('community'), controller.listPendingItems);
router.post('/:id/items', protect, requireFeature('community'), controller.suggestItem);
router.post('/:id/items/:itemId/approve', protect, requireFeature('community'), controller.approveItem);
router.post('/:id/items/create', protect, requireFeature('community'), controller.createNewItem);
router.post('/:id/items/copy', protect, requireFeature('community'), controller.copyFromPersonal);
router.post('/:id/items/:itemId/join', protect, requireFeature('community'), controller.joinItem);
router.post('/:id/items/:itemId/leave', protect, requireFeature('community'), controller.leaveItem);
router.delete('/:id/items/:itemId', protect, requireFeature('community'), controller.removeItem);
router.get('/:id/items/:itemId/progress', protect, requireFeature('community'), controller.getItemProgress);
router.get('/:id/items/:itemId/analytics', protect, requireFeature('community'), controller.getItemAnalytics);
router.post('/:id/join', protect, requireFeature('community'), controller.join);
router.post('/:id/leave', protect, requireFeature('community'), controller.leave);
router.delete('/:id', protect, requireFeature('community'), controller.deleteCommunity);
router.get('/:id/members', protect, requireFeature('community'), controller.members);
router.get('/:id/members/pending', protect, requireFeature('community'), controller.pendingMembers);
router.post('/:id/members/:userId/approve', protect, requireFeature('community'), controller.approveMember);
router.delete('/:id/members/:userId', protect, requireFeature('community'), controller.removeMember);
router.get('/:id/members/:userId/analytics', protect, requireFeature('community'), controller.memberAnalytics);

module.exports = router;


