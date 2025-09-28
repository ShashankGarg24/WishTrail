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
router.get('/:id/feed', protect, requireFeature('community'), controller.feed);
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
router.post('/:id/join', protect, requireFeature('community'), controller.join);
router.post('/:id/leave', protect, requireFeature('community'), controller.leave);
router.delete('/:id', protect, requireFeature('community'), controller.deleteCommunity);
router.get('/:id/members', protect, requireFeature('community'), controller.members);
router.get('/:id/members/pending', protect, requireFeature('community'), controller.pendingMembers);
router.post('/:id/members/:userId/approve', protect, requireFeature('community'), controller.approveMember);

module.exports = router;


