import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, TrendingUp, Edit2, Send } from 'lucide-react';
import useApiStore from '../store/apiStore';

const GoalDetailsModalNew = ({ isOpen, onClose, goalId }) => {
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (isOpen && goalId) {
      loadGoalData();
    }
  }, [isOpen, goalId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadGoalData = async () => {
    setLoading(true);
    // Mock data - replace with actual API call
    const mockData = {
      id: goalId,
      user: {
        name: 'Shrasti Shukla',
        username: 'thewishtrail',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shrasti',
      },
      title: 'Write a research paper',
      category: 'Education & Learning',
      isCompleted: true,
      completedAt: 'Feb 2, 2026',
      description: 'Publish or submit work to a peer-reviewed journal. This milestone represents 6 months of hard work and data gathering.',
      completionNote: 'Good and awesome. Finally submitted to Nature! Feeling accomplished and ready for the next challenge.',
      completionImage: goalId === 2 ? 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80' : null,
      timeline: [
        {
          id: 1,
          type: 'created',
          title: 'Goal Created',
          description: 'Started tracking this research goal',
          date: 'Feb 2, 2026',
          color: 'blue',
        },
        {
          id: 2,
          type: 'milestone',
          title: 'Draft Finished',
          description: 'Completed the first full manuscript',
          date: 'Feb 2, 2026',
          color: 'gray',
        },
        {
          id: 3,
          type: 'completed',
          title: 'Goal Completed! 🎉',
          description: '"Good and awesome"',
          date: 'Feb 2, 2026',
          color: 'green',
        },
      ],
      likes: 1,
      comments: 0,
      isLiked: false,
    };

    setGoalData(mockData);
    setIsLiked(mockData.isLiked);
    setLikeCount(mockData.likes);
    setCommentCount(mockData.comments);
    setLoading(false);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  const handleSubmitComment = () => {
    if (comment.trim()) {
      // Handle comment submission
      setComment('');
      setCommentCount(commentCount + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6]"></div>
            </div>
          ) : goalData ? (
            <div className={`flex ${goalData.completionImage ? 'flex-row' : 'flex-col'} h-full overflow-hidden`}>
              {/* Left Side - Image (if exists) */}
              {goalData.completionImage && (
                <div className="w-1/2 relative bg-gray-100">
                  <img
                    src={goalData.completionImage}
                    alt="Goal completion"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Community Project: Journaling Journey
                  </div>
                </div>
              )}

              {/* Right Side - Content */}
              <div className={`${goalData.completionImage ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={goalData.user.avatar}
                        alt={goalData.user.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{goalData.user.name}</h3>
                        <p className="text-sm text-gray-500">@{goalData.user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {goalData.title}
                  </h2>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-[#4c99e6] text-xs font-semibold rounded-full">
                      {goalData.category}
                    </span>
                    {goalData.isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                        Completed
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    Completed: {goalData.completedAt}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Description
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {goalData.description}
                      </p>
                    </div>
                  </div>

                  {/* Completion Note */}
                  {goalData.completionNote && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-green-600" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-gray-900">
                          Completion Note
                        </h4>
                        <button className="ml-auto text-gray-400 hover:text-[#4c99e6] transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-sm text-gray-700 italic leading-relaxed">
                          "{goalData.completionNote}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#4c99e6]" />
                        <h4 className="text-sm font-semibold text-gray-900">
                          {goalData.completionImage ? 'Activity Timeline' : 'Timeline'}
                        </h4>
                      </div>
                      <button 
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                        className="text-xs font-semibold text-[#4c99e6] hover:text-blue-600 transition-colors"
                      >
                        {isTimelineExpanded ? 'Hide' : 'Show All'}
                      </button>
                    </div>

                    {isTimelineExpanded && (
                      <div className="space-y-4">
                      {(goalData.completionImage ? goalData.timeline.filter(t => t.type !== 'milestone') : goalData.timeline).map((item, index, arr) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.color === 'blue'
                                  ? 'bg-[#4c99e6]'
                                  : item.color === 'green'
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                              }`}
                            />
                            {index < arr.length - 1 && (
                              <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-semibold text-gray-900 text-sm mb-1">
                                  {item.title}
                                </h5>
                                <p className="text-xs text-gray-600 mb-1">
                                  {item.description}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                {item.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {showComments && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <MessageCircle className="w-4 h-4 text-gray-500" />
                      <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
                    </div>

                    {showComments && (
                      <div>

                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400 italic">
                        {commentCount === 0
                          ? goalData.completionImage 
                            ? 'No comments yet. Be the first to congratulate Shrasti!'
                            : 'No comments yet. Be the first to comment.'
                          : `${commentCount} comment${commentCount > 1 ? 's' : ''}`}
                      </p>
                    </div>

                    {/* Comment Input */}
                    <div className="relative mt-4">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                        className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4c99e6] focus:border-transparent"
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={!comment.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#4c99e6] hover:bg-[#4c99e6] hover:text-white rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#4c99e6]"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Like */}
                      <button
                        onClick={handleLike}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            isLiked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="text-sm font-medium">{likeCount}</span>
                      </button>

                      {/* Comments */}
                      <button 
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{commentCount}</span>
                      </button>
                    </div>

                    {/* Share */}
                    <button className="flex items-center gap-2 text-gray-600 hover:text-[#4c99e6] transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GoalDetailsModalNew;
