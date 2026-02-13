const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinaryService');
const pgUserService = require('../services/pgUserService');

// Memory storage for serverless
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 1 * 1024 * 1024 } }); // 1MB limit

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

    // Get current user's avatar URL before uploading new one
    const currentUser = await pgUserService.getUserById(req.user.id);
    const oldAvatarUrl = currentUser?.avatar_url || '';

    // Upload new avatar
    const { url } = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: CLOUDINARY_PROFILE_UPLOAD_FOLDER });
    if (!url) {
      return res.status(500).json({ success: false, message: 'Failed to upload image' });
    }

    // Update user with new avatar
    const user = await pgUserService.updateUser(req.user.id, { avatar_url: url });

    // Delete old avatar from Cloudinary if it exists and is different
    if (oldAvatarUrl && oldAvatarUrl !== url && oldAvatarUrl.includes('cloudinary.com')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = oldAvatarUrl.split('/upload/');
        if (urlParts.length > 1) {
          let pathAfterUpload = urlParts[1];
          
          // Remove transformations (q_auto,f_auto/ or similar)
          pathAfterUpload = pathAfterUpload.replace(/^q_auto,f_auto\//, '');
          
          // Remove version (v1234567/)
          pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
          
          // Remove file extension
          const publicId = pathAfterUpload.replace(/\.[^.]+$/, '');
          
          console.log('[uploadAvatar] Attempting to delete old avatar:', publicId);
          const result = await cloudinaryService.destroy(publicId);
          console.log('[uploadAvatar] Cloudinary deletion result:', result);
        }
      } catch (deleteError) {
        console.error('[uploadAvatar] Failed to delete old avatar:', deleteError);
        // Don't fail the request if deletion fails
      }
    }

    return res.status(200).json({ success: true, message: 'Avatar updated', data: { url, user } });
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be under 1 MB' });
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