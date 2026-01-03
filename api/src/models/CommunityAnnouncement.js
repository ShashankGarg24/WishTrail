const mongoose = require('mongoose');

const communityAnnouncementSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true},
  authorId: { type: Number, required: true }, // PostgreSQL user ID (integer)
  title: { type: String, trim: true, maxlength: 120, required: [true, 'Title is required'] },
  body: { type: String, trim: true, maxlength: 2000, default: '' },
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('CommunityAnnouncement', communityAnnouncementSchema);


