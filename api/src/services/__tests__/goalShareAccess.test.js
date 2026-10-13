jest.mock('../pgBlockService', () => ({ getBlockedUserIds: jest.fn().mockResolvedValue([]), getBlockerUserIds: jest.fn().mockResolvedValue([]) }));
jest.mock('../../models/Activity', () => ({ findById: jest.fn() }));
jest.mock('../../middleware/auth', () => ({ protect: (req, res, next) => { req.user = { id: Number(req.headers['x-user'] || 9) }; next(); }, optionalAuth: (req, res, next) => next() }));
jest.mock('../../controllers/activityController', () => Object.fromEntries(['getRecentActivities', 'getTrendingActivities', 'getActivityStats', 'getUserActivities', 'getActivity', 'toggleActivityLike', 'getActivityComments', 'addActivityComment', 'replyToActivityComment', 'toggleCommentLike'].map(name => [name, (req, res) => res.json({ allowed: true })])));
const express = require('express');
const request = require('supertest');
const Activity = require('../../models/Activity');
const blocks = require('../pgBlockService');
const app = express();
app.use('/activities', require('../../routes/activityRoutes'));
app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
const id = '012345678901234567890123';
beforeEach(() => {
  blocks.getBlockedUserIds.mockResolvedValue([]);
  blocks.getBlockerUserIds.mockResolvedValue([]);
  Activity.findById.mockReturnValue({ lean: async () => ({ userId: 2, type: 'goal_shared', isPublic: false }) });
});
test.each([['get', ''], ['get', '/comments'], ['patch', '/like'], ['post', '/comments'], ['post', '/comments/abc/replies'], ['patch', '/comments/abc/like']])('private share blocks %s %s for nonowners', (method, path) => request(app)[method](`/activities/${id}${path}`).expect(403));
test('owner can access a private share', () => request(app).get(`/activities/${id}`).set('x-user', '2').expect(200));
test('public share still respects blocks', async () => {
  Activity.findById.mockReturnValue({ lean: async () => ({ userId: 2, type: 'goal_shared', isPublic: true }) });
  await request(app).get(`/activities/${id}`).expect(200);
  blocks.getBlockedUserIds.mockResolvedValue([2]);
  await request(app).get(`/activities/${id}`).expect(403);
});
test('public recent route remains available without the new per-post guard', () => request(app).get('/activities/recent').expect(200));
