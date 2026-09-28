const mongoose = require('mongoose');

const activityCommentSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityComment',
    default: null
  },
  mentionUserId: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Keep dependent history accurate for all existing deletion paths, including bulk
// account/goal cleanup. Notification cleanup is secondary to the primary deletion.
for (const operation of ['deleteOne', 'deleteMany', 'findOneAndDelete']) {
  activityCommentSchema.pre(operation, { query: true, document: false }, async function() {
    try {
      this.notificationSourceIds = (await this.model.find(this.getFilter()).session(this.getOptions().session || null).select('_id').lean()).map(row => row._id);
    } catch {
      // Reads also reconcile deleted sources if this best-effort capture fails.
      this.notificationSourceIds = [];
    }
  });
  activityCommentSchema.post(operation, { query: true, document: false }, async function() {
    try {
      const captured = this.notificationSourceIds || [];
      const session = this.getOptions().session || null;
      const remaining = await this.model.find({ _id: { $in: captured } }).session(session).select('_id').lean();
      const remainingIds = new Set(remaining.map(row => String(row._id)));
      const ids = captured.filter(id => !remainingIds.has(String(id)));
      if (!ids.length) return;
      const replies = await this.model.find({ parentCommentId: { $in: ids } }).session(session).select('_id').lean();
      const sources = [...ids, ...replies.map(row => row._id)];
      await require('./Notification').updateMany({
        'data.commentId': { $in: sources }
      }, { $set: { active: false }, $inc: { __v: 1 } }, { session });
    } catch (error) {
      require('../config/observability').logger.warn('[social-notification]', { operation: 'invalidate_source', code: error.code || error.name });
    }
  });
}

module.exports = mongoose.model('ActivityComment', activityCommentSchema);
