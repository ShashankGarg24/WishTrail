const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinaryService');
const pgUserService = require('../services/pgUserService');

// Memory storage for serverless
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 500 * 1024 } }); // 500KB limit

const CLOUDINARY_PROFILE_UPLOAD_FOLDER = process.env.CLOUDINARY_PROFILE_UPLOAD_FOLDER || 'wishtrail/user/profile';
const CLOUDINARY_COMMUNITY_UPLOAD_FOLDER = process.env.CLOUDINARY_COMMUNITY_UPLOAD_FOLDER || 'wishtrail/community';


// POST /api/v1/upload/avatar - upload profile picture
router.post('/avatar', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    if (!cloudinaryService.isConfigured()) {
      return res.status(500).json({ success: false, message: 'Image service is not configured' });
    }

    const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: CLOUDINARY_PROFILE_UPLOAD_FOLDER });
    if (!url) {
      return res.status(500).json({ success: false, message: 'Failed to upload image' });
    }

    const user = await pgUserService.updateUser(req.user.id, { avatarUrl: url });

    return res.status(200).json({ success: true, message: 'Avatar updated', data: { url, user } });
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 500 KB' });
    }
    next(err);
  }
});

module.exports = router; 
// Community avatar upload
router.post('/community/:id/avatar', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No image uploaded' });
    if (!cloudinaryService.isConfigured()) return res.status(500).json({ success: false, message: 'Image service is not configured' });
    const Community = require('../models/Community');
    const CommunityMember = require('../models/CommunityMember');
    const communityId = req.params.id;
    const community = await Community.findById(communityId).select('settings isActive');
    if (!community || !community.isActive) return res.status(404).json({ success: false, message: 'Community not found' });
    const mem = await CommunityMember.findOne({ communityId, userId: req.user.id, status: 'active' }).lean();
    const restrict = community?.settings?.onlyAdminsCanChangeImages !== false;
    if (!mem || (restrict ? mem.role !== 'admin' : !['admin','moderator'].includes(mem.role))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: `${CLOUDINARY_COMMUNITY_UPLOAD_FOLDER}/avatar` });
    await Community.updateOne({ _id: communityId }, { $set: { avatarUrl: url } });
    return res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: 'Image must be under 500 KB' });
    next(err);
  }
});

// Community banner upload
router.post('/community/:id/banner', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No image uploaded' });
    if (!cloudinaryService.isConfigured()) return res.status(500).json({ success: false, message: 'Image service is not configured' });
    const Community = require('../models/Community');
    const CommunityMember = require('../models/CommunityMember');
    const communityId = req.params.id;
    const community = await Community.findById(communityId).select('settings isActive');
    if (!community || !community.isActive) return res.status(404).json({ success: false, message: 'Community not found' });
    const mem = await CommunityMember.findOne({ communityId, userId: req.user.id, status: 'active' }).lean();
    const restrict = community?.settings?.onlyAdminsCanChangeImages !== false;
    if (!mem || (restrict ? mem.role !== 'admin' : !['admin','moderator'].includes(mem.role))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: `${CLOUDINARY_COMMUNITY_UPLOAD_FOLDER}/banner` });
    await Community.updateOne({ _id: communityId }, { $set: { bannerUrl: url } });
    return res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, message: 'Image must be under 1 MB' });
    next(err);
  }
});