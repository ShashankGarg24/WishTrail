const mongoose = require('mongoose');

const communityAnnouncementSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, required: [true, 'Title is required'] },
  body: { type: String, trim: true, maxlength: 2000, default: '' },
  isPinned: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

communityAnnouncementSchema.index({ communityId: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('CommunityAnnouncement', communityAnnouncementSchema);


