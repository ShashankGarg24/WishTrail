const express = require('express');
const { protect } = require('../middleware/auth');
const controller = require('../controllers/communityController');

const router = express.Router();

// My communities and discovery
router.get('/mine', protect, controller.listMyCommunities);
router.get('/discover', protect, controller.discoverCommunities);
router.get('/joined/items', protect, controller.myJoinedItems);

// Create
router.post('/', protect, controller.createCommunity);
router.patch('/:id', protect, controller.updateCommunity);

// Detail
router.get('/:id', protect, controller.getCommunity);
router.get('/:id/dashboard', protect, controller.getDashboard);
router.get('/:id/analytics', protect, controller.getAnalytics);
router.get('/:id/feed', protect, controller.feed);
router.post('/:id/chat', protect, async (req, res, next) => {
  try {
    const svc = require('../services/communityService');
    const msg = await svc.sendChatMessage(req.params.id, { id: req.user.id, name: req.user.name, avatar: req.user.avatar }, req.body || {});
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:message:new', msg); } catch {}
    res.status(201).json({ success: true, data: msg });
  } catch (e) { next(e); }
});
router.delete('/:id/chat/:msgId', protect, async (req, res, next) => {
  try {
    const svc = require('../services/communityService');
    const out = await svc.deleteChatMessage(req.params.id, req.user.id, req.params.msgId);
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:message:deleted', { _id: req.params.msgId }); } catch {}
    res.status(200).json({ success: true, data: out });
  } catch (e) { next(e); }
});
router.post('/:id/reactions', protect, async (req, res, next) => {
  try {
    const { targetType, targetId, emoji } = req.body || {};
    const svc = require('../services/communityService');
    const out = await svc.toggleReaction(String(targetType), String(targetId), req.user.id, emoji);
    try { req.app.get('io')?.to(`community:${req.params.id}`).emit('community:reaction:changed', { targetType, targetId, reactions: out.reactions }); } catch {}
    res.status(200).json({ success: true, data: out });
  } catch (e) { next(e); }
});
router.get('/:id/items', protect, controller.listItems);
router.get('/:id/items/pending', protect, controller.listPendingItems);
router.post('/:id/items', protect, controller.suggestItem);
router.post('/:id/items/:itemId/approve', protect, controller.approveItem);
router.post('/:id/items/create', protect, controller.createNewItem);
router.post('/:id/items/copy', protect, controller.copyFromPersonal);
router.post('/:id/items/:itemId/join', protect, controller.joinItem);
router.post('/:id/items/:itemId/leave', protect, controller.leaveItem);
router.delete('/:id/items/:itemId', protect, controller.removeItem);
router.get('/:id/items/:itemId/progress', protect, controller.getItemProgress);
router.get('/:id/items/:itemId/analytics', protect, controller.getItemAnalytics);
router.post('/:id/join', protect, controller.join);
router.post('/:id/leave', protect, controller.leave);
router.delete('/:id', protect, controller.deleteCommunity);
router.get('/:id/members', protect, controller.members);
router.get('/:id/members/pending', protect, controller.pendingMembers);
router.post('/:id/members/:userId/approve', protect, controller.approveMember);
router.delete('/:id/members/:userId', protect, controller.removeMember);
router.get('/:id/members/:userId/analytics', protect, controller.memberAnalytics);

module.exports = router;


