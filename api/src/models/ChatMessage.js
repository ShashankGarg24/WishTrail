const mongoose = require('mongoose');
const { getFeedConnection } = require('../config/database');

const chatMessageSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  text: { type: String, trim: true, maxlength: 500, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), 
    index: { expireAfterSeconds: 0 }
  },
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: mongoose.Schema.Types.ObjectId }] }, { _id: false }),
    default: {}
  }
}, { versionKey: false });

chatMessageSchema.index({ communityId: 1, createdAt: -1 });

module.exports = getFeedConnection().model('ChatMessage', chatMessageSchema);


