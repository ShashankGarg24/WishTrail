import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Youtube, Instagram, Play, ChevronLeft, ChevronRight, Maximize2, ExternalLink } from 'lucide-react'

const VideoEmbedGrid = () => {
  const [activeTab, setActiveTab] = useState('youtube')
  const [youtubeCurrentIndex, setYoutubeCurrentIndex] = useState(0)
  const [instagramCurrentIndex, setInstagramCurrentIndex] = useState(0)
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activeInstagramUrl, setActiveInstagramUrl] = useState(null);

  // 🎬 YOUTUBE CHANNELS - Replace with your actual video IDs
  const youtubeChannels = {
    main: {
      name: 'Main Channel',
      handle: '@TheWishTrail',
      description: 'Primary content & tutorials',
      videos: [
        {
          id: 'QQw8UbqTDSY',
          title: 'Find some time in your life....to live',
          description: 'Dive deep—not to escape the pain, but to rescue the part of you...',
          url: 'https://www.youtube.com/shorts/QQw8UbqTDSY?feature=share',
          thumbnail: `https://img.youtube.com/vi/QQw8UbqTDSY/maxresdefault.jpg`,
          duration: '00:14',
          views: '1.4k'
        },
        {
          id: 'CJBdn4p6C78',
          title: 'Prepare Muesli at home',
          description: 'This muesli is a powerhouse of essential nutrients packed with fiber...',
          url: 'https://www.youtube.com/shorts/CJBdn4p6C78?feature=share',
          thumbnail: `https://img.youtube.com/vi/CJBdn4p6C78/maxresdefault.jpg`,
          duration: '00:59',
          views: '328'
        },
        {
          id: '_mylA6lTL44',
          title: 'Let\'s prepare my meals for the day in 45 min',
          description: 'Missing home-cooked food while living away or busy with office life? ...',
          url: 'https://www.youtube.com/shorts/_mylA6lTL44?feature=share',
          thumbnail: `https://img.youtube.com/vi/_mylA6lTL44/maxresdefault.jpg`,
          duration: '00:59',
          views: '347'
        }
      ]
    },
    secondary: {
      name: 'Vlog Channel',
      handle: '@Shrasti.S.Shukla',
      description: 'Daily vlogs & behind the scenes',
      videos: [
        {
          id: 'UB-swAR5oYc',
          title: 'WHAT YOU CAN DO AS A PASSENGER TO ENSURE AIR TRAVEL SAFETY?',
          description: 'You don’t need to be an aviation expert to fly smart...',
          url: 'https://www.youtube.com/shorts/UB-swAR5oYc?feature=share',
          thumbnail: `https://img.youtube.com/vi/UB-swAR5oYc/maxresdefault.jpg`,
          duration: '00:57',
          views: '20.8K'
        },
        {
          id: 'mpOzrZhOGy8',
          title: 'Jagannath Yatra gave birth to an English word now used worldwide',
          description: 'Ever heard the word "Juggernaut"? It means something huge...',
          url: 'https://www.youtube.com/shorts/mpOzrZhOGy8?feature=share',
          thumbnail: `https://img.youtube.com/vi/mpOzrZhOGy8/maxresdefault.jpg`,
          duration: '00:22',
          views: '4K'
        },
        {
          id: '4fjEWlwReYs',
          title: 'Do you know why we call him Hanumanji or Bajrang Bali',
          description: 'Vajra\'s blow landed on Hanumanji\'s jaw, permanently disfiguring...',
          url: 'https://www.youtube.com/shorts/4fjEWlwReYs?feature=share',
          thumbnail: `https://img.youtube.com/vi/4fjEWlwReYs/maxresdefault.jpg`,
          duration: '00:24',
          views: '2.5K'
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
          id: 'DLmmAMRPBp0',
          url: 'https://www.instagram.com/p/DLmmAMRPBp0/',
          title: 'Mid day of the year 2025',
          description: 'We officially become closer to 2050 than to 2000...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.82787-15/514501443_17872805043383866_230659346301218475_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=100&ig_cache_key=MzY2Nzc4NjA4NTQ4MTMyMzEyNA%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjYyMHgxMTAyLnNkciJ9&_nc_ohc=6isXBjZg44gQ7kNvwGxJTTM&_nc_oc=AdlOqNMdQe3u65IsjGQzpHo0TG2pSgywrBSRZNVyjkQoP0ZsoO_GUloPdKsO4oI4C8s&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=ejjcZkcy6JWXzl2aWm28mg&oh=00_AfSlvICn7RM_hCZsIB_i-AIOqZUwOID5z_yqCqYlDhQmlw&oe=687EF266',
          likes: '85',
          views: '13.5k'
        },
        {
          id: 'DF63xRcvB3k',
          url: 'https://www.instagram.com/p/DF63xRcvB3k/',
          title: 'DIY',
          description: 'Your 9 to 5 pays the bills, but your 5 to 9 fuels the soul!...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.75761-15/476874249_17854301571383866_8810334197561497387_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=105&ig_cache_key=MzU2NTQwNzMzMzU2NTM0MTE1Ng%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjYyMHgxMTAyLnNkciJ9&_nc_ohc=9J1yo_cCBO4Q7kNvwFK60HN&_nc_oc=Adn1hASmiZqs9lu3SyJUQPfTvq2oIzGLyCws6g_3oKQomX9C9xEfsBMGAW-2BUttQ1E&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=ui8N9YosQZP_sDdOfoFAdQ&oh=00_AfQL7qZ0f62tdt8JogixeIOlpAC9YqH_n9tvJJA6_CEpkQ&oe=687F21BF',
          likes: '98',
          views: '2.3k'
        },
        {
          id: 'DEgfD8avaG7',
          url: 'https://www.instagram.com/p/DEgfD8avaG7/',
          title: 'Start you day with this video',
          description: 'You Can Heal Your Life by Louise Hay is a transformative guide...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.75761-15/472833457_17848396026383866_6513472307850544818_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=111&ig_cache_key=MzUzOTk2NTkxNzU4NjYyOTA1MTE3ODQ4Mzk2MDIwMzgzODY2.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjYyMHgxMTAyLnNkciJ9&_nc_ohc=8PLOXtrW0FcQ7kNvwFiALk8&_nc_oc=Adm9VEo_B-J5n5w_l72mdulSAOVvuR8AbWyN59X-WVzvxTJruonGxfiydFejC-6h_xQ&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=-V6FkxD8qfVp3BdeodeCEg&oh=00_AfQ-uG3s5pv0bpw3aoHz7qc_CHsAw3ZNbkVksvi1_R6ZQA&oe=687F092C',
          likes: '22',
          views: '514'
        }
      ]
    },
    personal: {
      name: 'Personal Account',
      handle: '@shrasti.s.shukla',
      description: 'Life & personal journey',
      posts: [
        {
          id: 'DKWFcLKPDfZ',
          url: 'https://www.instagram.com/p/DKWFcLKPDfZ/',
          title: 'Can blind people play cricket?',
          description: 'Blind cricket differs from traditional cricket in several ways...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.75761-15/502949627_17868749469383866_7394763994359054585_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=108&ig_cache_key=MzY0NTEyNDg3NDc2Mzc3ODAwOQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjYyMHgxMTAyLnNkciJ9&_nc_ohc=GCY3eOOF-aMQ7kNvwED-fj8&_nc_oc=AdmghAmbC_jmPfIYQuH2BMtC1Og-zmq-xXKnYRE1IWVK86PnSgzVe-h2ShBKXEn5gl0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=1gEdA7AG_Ixd-a6qAMseqg&oh=00_AfSKFfVDsEMi2Mj4GvA1z_Pyc1OTpbeKa4KlltKHhWrYtg&oe=687EEB92',
          likes: '95',
          views: '10.6K'
        },
        {
          id: 'DJy8KbcvnFD',
          url: 'https://www.instagram.com/p/DJy8KbcvnFD/',
          title: 'Shaheed Jaswant Singh Rawat',
          description: 'In the last phase of the 1962 India-China war, Indian troops...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.71878-15/498691852_1724004664871276_4697924769208548780_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=107&ig_cache_key=MzYzNTIzMjQ0ODcwMDExNzMxNQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjY0MHgxMTM2LnNkciJ9&_nc_ohc=TifeKBP5AmUQ7kNvwEZ8Apx&_nc_oc=Adl4PjSVeNsk2kdpwgiK1_f70Zo6WwGEo9vLBUJ1mWtqkNO5Hy4Xn1V1lPKHyKHV2cs&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=vVVtGAj4T_ICEoMKkQsXfg&oh=00_AfSRGkodBLZkx79bhh5xsRKRVSDXABdJrPPsHC8vtMNNRA&oe=687EFF99',
          likes: '631',
          views: '9k'
        },
        {
          id: 'DHSrsiuvLcV',
          url: 'https://www.instagram.com/p/DHSrsiuvLcV/',
          title: 'RAW Agent R.N. Rao',
          description: 'Bangladesh wasn’t created in 13 days—it was crafted in...',
          thumbnail: 'https://scontent.cdninstagram.com/v/t51.71878-15/485135446_620352030842554_8993688310655608969_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=104&ig_cache_key=MzU5MDEyNDAyOTkxNjAwMjA2OQ%3D%3D.3-ccb1-7&ccb=1-7&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjY0MHgxMTM2LnNkciJ9&_nc_ohc=lt5g0KxP2GwQ7kNvwEsWCI-&_nc_oc=Adl6JuriAoX60q-AvAfu3J3nxOwXVd3VBaLV10FsCAsdwuNR9wciYUUa7u1_HsYPFeo&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=EQonKQ4gMarVysNDg4zalA&oh=00_AfRsmVwIOXos8bibnLVPlDp61JW1Eg7oQOSqsHAhg0cDpA&oe=687EF026',
          likes: '123',
          views: '5.8k'
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

  const CarouselItem = ({ item, type, index, setActiveVideoId }) => (
    <motion.div
      className="flex-shrink-0 w-full md:w-1/3 px-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
       <div
          className="glass-card-hover rounded-xl overflow-hidden group cursor-pointer"
          onClick={() => type === 'instagram' && setActiveInstagramUrl(item.url)}
        >
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
                  onClick={() => setActiveVideoId(item.id)}
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
                    <span>👀 {item.views}</span>
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
                    ? 'bg-white/20 text-gray-900 dark:text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <tab.icon className={`h-6 w-6 ${tab.color}`} />
                <span className="text-lg">{tab.label}</span>
                {/* Removed animated highlight to eliminate shimmer during tab switch */}
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
          {/* {activeTab === 'youtube' ? '🎬 YouTube Content' : '📸 Instagram Reels'} */}
        </motion.h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {activeTab === 'youtube' 
            ? 'Watch our latest videos and tutorials' 
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
                setActiveVideoId={setActiveVideoId}
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
      {activeVideoId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden w-[90%] max-w-3xl shadow-2xl">
            <button
              className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-10"
              onClick={() => setActiveVideoId(null)}
            >
              ✕
            </button>
            <iframe
              width="100%"
              height="400"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
      {activeInstagramUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden w-[90%] max-w-2xl shadow-2xl p-6">
            <button
              className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-10"
              onClick={() => setActiveInstagramUrl(null)}
            >
              ✕
            </button>
            <iframe
              src={`${activeInstagramUrl}embed`}
              width="100%"
              height="600"
              frameBorder="0"
              scrolling="no"
              allowTransparency
              allow="encrypted-media"
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoEmbedGrid 