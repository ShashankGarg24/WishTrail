const mongoose = require('mongoose');

const adminAnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: 'admin' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AdminAnnouncement', adminAnnouncementSchema);
