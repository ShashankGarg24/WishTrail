import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Youtube, Instagram, Play, ChevronLeft, ChevronRight, Maximize2, ExternalLink } from 'lucide-react'

const VideoEmbedGrid = () => {
  const [activeTab, setActiveTab] = useState('youtube')
  const [youtubeCurrentIndex, setYoutubeCurrentIndex] = useState(0)
  const [instagramCurrentIndex, setInstagramCurrentIndex] = useState(0)

  // 🎬 YOUTUBE CHANNELS - Replace with your actual video IDs
  const youtubeChannels = {
    main: {
      name: 'Main Channel',
      handle: '@TheWishTrail',
      description: 'Primary content & tutorials',
      videos: [
        {
          id: 'QQw8UbqTDSY',
          title: 'Goal Setting Masterclass',
          description: 'Learn how to set and achieve your biggest goals',
          thumbnail: `https://img.youtube.com/vi/QQw8UbqTDSY/maxresdefault.jpg`,
          duration: '15:30',
          views: '12K'
        },
        {
          id: 'c2kvKe-p55E',
          title: 'Morning Motivation',
          description: 'Start your day with the right mindset',
          thumbnail: `https://img.youtube.com/vi/c2kvKe-p55E/maxresdefault.jpg`,
          duration: '8:45',
          views: '8.2K'
        },
        {
          id: '4fjEWlwReYs',
          title: 'Productivity Hacks',
          description: 'Get more done in less time',
          thumbnail: `https://img.youtube.com/vi/4fjEWlwReYs/maxresdefault.jpg`,
          duration: '12:15',
          views: '15.7K'
        }
      ]
    },
    secondary: {
      name: 'Vlog Channel',
      handle: '@Shrasti.S.Shukla',
      description: 'Daily vlogs & behind the scenes',
      videos: [
        {
          id: '4fjEWlwReYs',
          title: 'Success Stories',
          description: 'Real people, real achievements',
          thumbnail: `https://img.youtube.com/vi/4fjEWlwReYs/maxresdefault.jpg`,
          duration: '20:10',
          views: '25.3K'
        },
        {
          id: 'QQw8UbqTDSY',
          title: 'Daily Vlog #1',
          description: 'A day in my life pursuing goals',
          thumbnail: `https://img.youtube.com/vi/QQw8UbqTDSY/maxresdefault.jpg`,
          duration: '18:22',
          views: '9.1K'
        },
        {
          id: 'c2kvKe-p55E',
          title: 'Behind the Scenes',
          description: 'How I create content',
          thumbnail: `https://img.youtube.com/vi/c2kvKe-p55E/maxresdefault.jpg`,
          duration: '14:55',
          views: '6.8K'
        }
      ]
    }
  }

  // 📸 INSTAGRAM ACCOUNTS - Replace with your actual post URLs
  const instagramAccounts = {
    main: {
      name: 'Main Account',
      handle: '@thewishtrail',
      description: 'Inspiration & motivation',
      posts: [
        {
          id: 'DIod1ltTzaN',
          url: 'https://www.instagram.com/p/DIod1ltTzaN/',
          title: 'Daily Inspiration',
          description: 'Quick tips for staying motivated',
          thumbnail: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Daily+Inspiration',
          likes: '2.4K',
          comments: '128'
        },
        {
          id: 'DF63xRcvB3k',
          url: 'https://www.instagram.com/p/DF63xRcvB3k/',
          title: 'Goal Achievement',
          description: 'Celebrate your wins, big and small',
          thumbnail: 'https://via.placeholder.com/400x400/4ecdc4/ffffff?text=Goal+Achievement',
          likes: '1.8K',
          comments: '94'
        },
        {
          id: 'DLmmAMRPBp0',
          url: 'https://www.instagram.com/p/DLmmAMRPBp0/',
          title: 'Mindset Monday',
          description: 'Start your week right',
          thumbnail: 'https://via.placeholder.com/400x400/45b7d1/ffffff?text=Mindset+Monday',
          likes: '3.1K',
          comments: '167'
        }
      ]
    },
    personal: {
      name: 'Personal Account',
      handle: '@Shrasti.S.Shukla',
      description: 'Life & personal journey',
      posts: [
        {
          id: 'DLbrB1NvxyQ',
          url: 'https://www.instagram.com/p/DLbrB1NvxyQ/',
          title: 'Mindset Shift',
          description: 'Transform your thinking',
          thumbnail: 'https://via.placeholder.com/400x400/96ceb4/ffffff?text=Mindset+Shift',
          likes: '1.2K',
          comments: '72'
        },
        {
          id: 'DK7E18qzXe8',
          url: 'https://www.instagram.com/p/DK7E18qzXe8/',
          title: 'Personal Growth',
          description: 'My journey to becoming better',
          thumbnail: 'https://via.placeholder.com/400x400/feca57/ffffff?text=Personal+Growth',
          likes: '2.7K',
          comments: '189'
        },
        {
          id: 'DK7E18qzXe8',
          url: 'https://www.instagram.com/p/DK7E18qzXe8/',
          title: 'Life Updates',
          description: 'What I have been up to lately',
          thumbnail: 'https://via.placeholder.com/400x400/ff9ff3/ffffff?text=Life+Updates',
          likes: '1.9K',
          comments: '156'
        }
      ]
    }
  }

  // Flatten all content for carousel
  const allYoutubeContent = Object.entries(youtubeChannels).flatMap(([key, channel]) => 
    channel.videos.map(video => ({ ...video, channelName: channel.name, channelHandle: channel.handle }))
  )

  const allInstagramContent = Object.entries(instagramAccounts).flatMap(([key, account]) => 
    account.posts.map(post => ({ ...post, accountName: account.name, accountHandle: account.handle }))
  )

  const tabs = [
    { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' }
  ]

  // Calculate how many items to show at once
  const itemsPerView = 3
  const currentContent = activeTab === 'youtube' ? allYoutubeContent : allInstagramContent
  const currentIndex = activeTab === 'youtube' ? youtubeCurrentIndex : instagramCurrentIndex
  const maxIndex = Math.max(0, currentContent.length - itemsPerView)

  // Carousel navigation functions
  const nextSlide = useCallback(() => {
    if (activeTab === 'youtube') {
      setYoutubeCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    } else {
      setInstagramCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }
  }, [activeTab, maxIndex])

  const prevSlide = useCallback(() => {
    if (activeTab === 'youtube') {
      setYoutubeCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
    } else {
      setInstagramCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
    }
  }, [activeTab, maxIndex])

  const goToSlide = useCallback((index) => {
    if (activeTab === 'youtube') {
      setYoutubeCurrentIndex(Math.min(index, maxIndex))
    } else {
      setInstagramCurrentIndex(Math.min(index, maxIndex))
    }
  }, [activeTab, maxIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') prevSlide()
      if (e.key === 'ArrowRight') nextSlide()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevSlide, nextSlide])

  // Touch/Swipe handling
  const handleDragEnd = (event, info) => {
    const threshold = 50
    if (info.offset.x > threshold) {
      prevSlide()
    } else if (info.offset.x < -threshold) {
      nextSlide()
    }
  }

  const CarouselItem = ({ item, type, index }) => (
    <motion.div
      className="flex-shrink-0 w-full md:w-1/3 px-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="glass-card-hover rounded-xl overflow-hidden group cursor-pointer">
        {type === 'youtube' ? (
          <>
            <div className="aspect-video relative overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/640x360/ff0000/ffffff?text=YouTube+Video'
                }}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <motion.div
                  className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play className="h-8 w-8 text-white ml-1" />
                </motion.div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {item.duration}
              </div>
              <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {item.views} views
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Youtube className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-500 font-medium">{item.channelName}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <a
                  href={`https://youtube.com/watch?v=${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center space-x-1"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="aspect-square relative overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center space-x-3 text-white text-sm">
                    <span>❤️ {item.likes}</span>
                    <span>💬 {item.comments}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <div className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                  REEL
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Instagram className="h-4 w-4 text-pink-500" />
                <span className="text-sm text-pink-500 font-medium">{item.accountName}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:text-pink-600 text-sm font-medium flex items-center space-x-1"
                >
                  <span>View on Instagram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>❤️ {item.likes}</span>
                  <span>💬 {item.comments}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-12">
        <div className="glass-card-hover p-1 rounded-2xl">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-gray-600 hover:text-white hover:bg-white/10 dark:text-gray-400'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <tab.icon className={`h-6 w-6 ${tab.color}`} />
                <span className="text-lg">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/20 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Carousel Header */}
      <div className="text-center mb-12">
        <motion.h2 
          className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeTab === 'youtube' ? '🎬 YouTube Content' : '📸 Instagram Reels'}
        </motion.h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {activeTab === 'youtube' 
            ? 'Watch our latest videos and tutorials from both channels' 
            : 'Check out our recent Instagram posts and reels'
          }
        </p>

      </div>

      {/* Enhanced Carousel */}
      <div className="relative">
        <div className="overflow-hidden">
          <motion.div
            className="flex"
            animate={{ x: `${-currentIndex * (100 / itemsPerView)}%` }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 35,
              mass: 0.6,
              duration: 0.5
            }}
            drag="x"
            dragConstraints={{ left: -100, right: 100 }}
            onDragEnd={handleDragEnd}
          >
            {currentContent.map((item, index) => (
              <CarouselItem
                key={`${item.id}-${index}`}
                item={item}
                type={activeTab}
                index={index}
              />
            ))}
          </motion.div>
        </div>

        {/* Enhanced Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 w-12 h-12 bg-white/20 border border-white/30 rounded-full shadow-lg transition-all duration-200 hover:bg-white/30 hover:border-white/50 hover:scale-110 z-10 flex items-center justify-center"
          disabled={currentIndex === 0}
          style={{ 
            transform: 'translateY(-50%)',
            transformOrigin: 'center center'
          }}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 w-12 h-12 bg-white/20 border border-white/30 rounded-full shadow-lg transition-all duration-200 hover:bg-white/30 hover:border-white/50 hover:scale-110 z-10 flex items-center justify-center"
          disabled={currentIndex >= maxIndex}
          style={{ 
            transform: 'translateY(-50%)',
            transformOrigin: 'center center'
          }}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Enhanced Dot Indicators */}
        <div className="flex justify-center space-x-3 mt-8">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-3 w-3 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white shadow-lg scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              whileHover={{ scale: index === currentIndex ? 1.25 : 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>

      {/* Follow All Accounts Section */}
      <div className="text-center mt-20">
        <motion.div 
          className="glass-card-hover p-8 rounded-2xl max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Follow All My {activeTab === 'youtube' ? 'YouTube Channels' : 'Instagram Accounts'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === 'youtube' ? (
              <>
                {Object.entries(youtubeChannels).map(([key, channel]) => (
                  <motion.a
                    key={key}
                    href={`https://youtube.com/${channel.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="bg-red-500 p-3 rounded-full">
                      <Youtube className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {channel.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {channel.description}
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-white ml-auto" />
                  </motion.a>
                ))}
              </>
            ) : (
              <>
                {Object.entries(instagramAccounts).map(([key, account]) => (
                  <motion.a
                    key={key}
                    href={`https://instagram.com/${account.handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="bg-pink-500 p-3 rounded-full">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {account.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {account.description}
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-white ml-auto" />
                  </motion.a>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default VideoEmbedGrid 