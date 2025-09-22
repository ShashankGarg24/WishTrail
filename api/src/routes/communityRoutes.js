const express = require('express');
const { protect } = require('../middleware/auth');
const controller = require('../controllers/communityController');

const router = express.Router();

// My communities and discovery
router.get('/mine', protect, controller.listMyCommunities);
router.get('/discover', protect, controller.discoverCommunities);

// Create
router.post('/', protect, controller.createCommunity);
router.patch('/:id', protect, controller.updateCommunity);

// Detail
router.get('/:id', protect, controller.getCommunity);
router.get('/:id/dashboard', protect, controller.getDashboard);
router.get('/:id/feed', protect, controller.feed);
router.get('/:id/items', protect, controller.listItems);
router.get('/:id/items/pending', protect, controller.listPendingItems);
router.post('/:id/items', protect, controller.suggestItem);
router.post('/:id/items/:itemId/approve', protect, controller.approveItem);
router.post('/:id/items/:itemId/join', protect, controller.joinItem);
router.post('/:id/items/:itemId/leave', protect, controller.leaveItem);
router.get('/:id/items/:itemId/progress', protect, controller.getItemProgress);
router.post('/:id/join', protect, controller.join);
router.post('/:id/leave', protect, controller.leave);
router.get('/:id/members', protect, controller.members);
router.get('/:id/members/pending', protect, controller.pendingMembers);
router.post('/:id/members/:userId/approve', protect, controller.approveMember);

module.exports = router;


