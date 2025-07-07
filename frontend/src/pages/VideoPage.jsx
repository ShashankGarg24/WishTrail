import { motion } from 'framer-motion';
import { Play, Clock, Users, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import useApiStore from '../store/apiStore';
import VideoEmbedGrid from '../components/VideoEmbedGrid';

const VideoPage = () => {
  const { user, isAuthenticated } = useApiStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const motivationalVideos = [
    {
      id: 1,
      title: "The Power of Setting SMART Goals",
      description: "Learn how to set specific, measurable, achievable, relevant, and time-bound goals that actually get completed.",
      embedId: "TQMbvJNRpLE",
      duration: "12:34",
      views: "2.1M",
      category: "goal-setting"
    },
    {
      id: 2,
      title: "Morning Routine for Success",
      description: "Discover the morning habits that successful people use to start their day with purpose and energy.",
      embedId: "gA8LdPrAFJM",
      duration: "8:45",
      views: "1.8M",
      category: "productivity"
    },
    {
      id: 3,
      title: "How to Build Unshakeable Discipline",
      description: "Master the art of self-discipline and learn how to stay committed to your goals even when motivation fades.",
      embedId: "L5JhT3_EQY0",
      duration: "15:22",
      views: "3.2M",
      category: "motivation"
    },
    {
      id: 4,
      title: "Transform Your Life in 90 Days",
      description: "A practical guide to creating lasting change in your personal and professional life through consistent action.",
      embedId: "7YcGHWMl8ZM",
      duration: "18:30",
      views: "950K",
      category: "transformation"
    },
    {
      id: 5,
      title: "The Science of Habit Formation",
      description: "Understanding the neurological basis of habits and how to leverage this knowledge to build positive routines.",
      embedId: "PZ7lDrwYdZc",
      duration: "11:15",
      views: "1.5M",
      category: "habits"
    },
    {
      id: 6,
      title: "Overcoming Fear and Self-Doubt",
      description: "Practical strategies to overcome the mental barriers that prevent you from pursuing your dreams and goals.",
      embedId: "ZdGrC9S4PYA",
      duration: "14:20",
      views: "2.7M",
      category: "mindset"
    }
  ];

  const categories = [
    { id: 'all', label: 'All Videos', icon: Play },
    { id: 'goal-setting', label: 'Goal Setting', icon: TrendingUp },
    { id: 'productivity', label: 'Productivity', icon: Clock },
    { id: 'motivation', label: 'Motivation', icon: Users },
    { id: 'transformation', label: 'Transformation', icon: TrendingUp },
    { id: 'habits', label: 'Habits', icon: Clock },
    { id: 'mindset', label: 'Mindset', icon: Users }
  ];

  const filteredVideos = selectedCategory === 'all' 
    ? motivationalVideos 
    : motivationalVideos.filter(video => video.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Motivational Videos
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Get inspired and motivated with our curated collection of videos designed to help you achieve your goals and transform your life.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                }`}
              >
                <category.icon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Video Grid */}
        <VideoEmbedGrid videos={filteredVideos} />

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Turn Inspiration into Action?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            These videos are just the beginning. Start setting your goals and tracking your progress with WishTrail.
          </p>
          {isAuthenticated ? (
            <a
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <TrendingUp className="h-5 w-5" />
              <span>Go to Dashboard</span>
            </a>
          ) : (
            <a
              href="/auth"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Play className="h-5 w-5" />
              <span>Get Started</span>
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VideoPage; 