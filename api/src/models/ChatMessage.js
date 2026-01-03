const mongoose = require('mongoose');
const { getFeedConnection } = require('../config/database');

const chatMessageSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  userId: { type: Number, required: true }, // PostgreSQL user ID (integer)
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  text: { type: String, trim: true, maxlength: 500, required: true },
  createdAt: { type: Date, default: Date.now},
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), 
    index: { expireAfterSeconds: 0 }
  },
  reactions: {
    type: Map,
    of: new mongoose.Schema({ count: { type: Number, default: 0 }, userIds: [{ type: Number }] }, { _id: false }), // PostgreSQL user IDs
    default: {}
  }
}, { versionKey: false });

module.exports = getFeedConnection().model('ChatMessage', chatMessageSchema);


