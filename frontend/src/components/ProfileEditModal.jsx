import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, MapPin, Globe, Youtube, Instagram, Camera, Save, ExternalLink, Heart, AlertCircle, Smile, Loader2 } from 'lucide-react'
import useApiStore from '../store/apiStore'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock'
import { uploadAPI } from '../services/api'

const MOOD_EMOJIS = [
  '😊', '😄', '😃', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
  '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
  '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
  '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
  '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
  '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
  '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿',
  '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹',
  '😻', '😼', '😽', '🙀', '😿', '😾', '⭐', '✨', '💫', '🌟',
  '🔥', '💥', '💯', '💢', '💬', '👁️', '🧠', '💪', '👍', '👎',
  '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙',
  '💜', '❤️', '🧡', '💛', '💚', '💙', '💖', '💗', '💓', '💞'
]

const INTERESTS_OPTIONS = [
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'personal_growth', label: 'Personal Growth', icon: '🌱' },
  { id: 'creativity', label: 'Creativity', icon: '🎭' },
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'business', label: 'Business', icon: '📈' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🏡' },
  { id: 'spirituality', label: 'Spirituality', icon: '🕯️' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'reading', label: 'Reading', icon: '📖' },
  { id: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'volunteering', label: 'Volunteering', icon: '🤝' }
];

const ProfileEditModal = ({ isOpen, onClose }) => {
  const [usernameError, setUsernameError] = useState('');
  const { user, updateProfile, loading, locationSuggestions, searchCitySuggestions} = useApiStore()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    youtube: user?.youtube || '',
    instagram: user?.instagram || '',
    avatar: user?.avatar || '',
    interests: user?.interests || [],
    currentMood: user?.currentMood || '⭐'
  })

  const [showMoodPicker, setShowMoodPicker] = useState(false)

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [avatarError, setAvatarError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [urlErrors, setUrlErrors] = useState({
    youtube: '',
    instagram: ''
  })

  // Sync form data when modal opens or user data changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        youtube: user.youtube || '',
        instagram: user.instagram || '',
        avatar: user.avatar || '',
        interests: user.interests || [],
        currentMood: user.currentMood || '⭐'
      })
    }
  }, [isOpen, user])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (locationQuery.trim().length > 1) {
        searchCitySuggestions(locationQuery);
      } else {
        setShowSuggestions(false);
      }
    }, 400);
    return () => clearTimeout(debounce);
  }, [locationQuery]);

  // Body scroll lock while modal is open (keep hook order stable)
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear URL errors when user types
    if (name === 'youtube' || name === 'instagram') {
      setUrlErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }
  
  const validateSocialUrls = () => {
    const errors = {
      youtube: '',
      instagram: ''
    }
    
    // Validate YouTube URL
    if (formData.youtube && formData.youtube.trim() !== '') {
      const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?|youtu\.be\/).+/i
      if (!youtubePattern.test(formData.youtube)) {
        errors.youtube = 'Please enter a valid YouTube URL'
      }
    }
    
    // Validate Instagram URL
    if (formData.instagram && formData.instagram.trim() !== '') {
      const instagramPattern = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/i
      if (!instagramPattern.test(formData.instagram)) {
        errors.instagram = 'Please enter a valid Instagram URL'
      }
    }
    
    setUrlErrors(errors)
    return !errors.youtube && !errors.instagram
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    // Validate social URLs
    if (!validateSocialUrls()) {
      return;
    }
    const result = await updateProfile(formData);
    if (result.success) {
      onClose();
    } else {
      const msg = result.error || '';
      if (msg.toLowerCase().includes('username')) {
        setUsernameError(msg);
      } else {
        console.error('Error updating profile:', msg);
      }
    }
  };

  const handleInterestToggle = (interestId) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: user?.name || '',
      username: user?.username || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      youtube: user?.youtube || '',
      instagram: user?.instagram || '',
      avatar: user?.avatar || '',
      interests: user?.interests || [],
      currentMood: user?.currentMood || '⭐'
    })
    setShowMoodPicker(false)
    onClose()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    setAvatarError('')
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      setAvatarError('Only JPG/JPEG/PNG images are allowed')
      return
    }
    if (file.size > 1024 * 1024) {
      setAvatarError('Max image size is 1 MB')
      return
    }
    try {
      setAvatarUploading(true)
      const form = new FormData()
      form.append('avatar', file)
      const res = await uploadAPI.uploadAvatar(form)
      const url = res.data?.data?.url || res.data?.url
      if (url) {
        setFormData(prev => ({
          ...prev,
          avatar: url
        }))
      }
    } catch (err) {
      console.error('Avatar upload failed', err)
      setAvatarError(err?.response?.data?.message || 'Failed to upload image')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleLocationInputChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      location: value,
    }));
    setLocationQuery(value);
  };

  const formatLocation = (place) =>
  `${place.name || ''}${place.state ? ', ' + place.state : ''}${place.country ? ', ' + place.country : ''}`;


  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleCancel}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Profile
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Update your profile information</p>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto scrollbar-hide max-h-[calc(85vh-80px)] px-6 py-6">

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="relative">
                <img
                  src={formData.avatar}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-2 border-gray-300 dark:border-gray-600 object-cover"
                />
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors cursor-pointer shadow-md"
                >
                  <Camera className="h-3.5 w-3.5" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Profile Picture</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click camera icon to upload • JPG/PNG • Max 1MB
                </p>
                {avatarError && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{avatarError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm ${usernameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="Enter your username"
                  />
                </div>
                {usernameError && (
                  <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{usernameError}</span>
                  </div>
                )}
              </div>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  About You
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none text-sm"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{formData.bio.length}/500 characters</p>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label htmlFor="location" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                <MapPin className="inline-block h-4 w-4 mr-1" />
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleLocationInputChange}
                  autoComplete="off"
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                  placeholder="Enter your city"
                />
                {showSuggestions && Array.isArray(locationSuggestions) && locationSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide text-sm text-gray-900 dark:text-white">
                    {locationSuggestions.map((place) => (
                      <li
                        key={place.place_id}
                        onClick={() => {
                          const formatted = formatLocation(place);
                          setFormData((prev) => ({
                            ...prev,
                            location: formatted
                          }));
                          setLocationQuery(formatted);
                          setShowSuggestions(false);
                        }}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        {formatLocation(place)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Current Mood */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                <Smile className="inline-block h-4 w-4 mr-1" />
                Current Mood
              </label>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setShowMoodPicker(!showMoodPicker)}
                  className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-gray-800 flex items-center justify-center text-2xl transition-colors"
                  title="Click to change mood"
                >
                  {formData.currentMood}
                </button>
                {showMoodPicker && (
                  <div className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 sm:gap-1.5 max-h-48 overflow-y-auto scrollbar-hide overflow-x-hidden px-1">
                      {MOOD_EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, currentMood: emoji }))
                            setShowMoodPicker(false)
                          }}
                          className={`w-9 h-9 rounded-md flex items-center justify-center text-xl transition-all hover:bg-white dark:hover:bg-gray-700 ${
                            formData.currentMood === emoji ? 'bg-white dark:bg-gray-700 ring-2 ring-primary-500' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interests */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                <Heart className="inline-block h-4 w-4 mr-1" />
                Your Interests
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto scrollbar-hide p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                {INTERESTS_OPTIONS.map(interest => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      formData.interests.includes(interest.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1">{interest.icon}</div>
                      <div className="text-xs font-medium">{interest.label}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Selected: {formData.interests.length} interests
              </p>
            </div>

            {/* Social Links */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                <ExternalLink className="inline-block h-4 w-4 mr-1" />
                Social Links <span className="text-xs text-gray-500 dark:text-gray-400">(Optional)</span>
              </label>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                      placeholder="https://your-website.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube
                  </label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="youtube"
                      name="youtube"
                      type="url"
                      value={formData.youtube}
                      onChange={handleInputChange}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm ${
                        urlErrors.youtube ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="https://youtube.com/@yourusername"
                    />
                  </div>
                  {urlErrors.youtube && (
                    <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{urlErrors.youtube}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="instagram"
                      name="instagram"
                      type="url"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm ${
                        urlErrors.instagram ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="https://instagram.com/yourusername"
                    />
                  </div>
                  {urlErrors.instagram && (
                    <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{urlErrors.instagram}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ProfileEditModal 