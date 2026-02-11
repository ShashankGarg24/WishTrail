import { useState, useEffect, useRef } from 'react';
import { Camera, User, MapPin, Globe, Youtube, Instagram, AlertCircle, Loader2, Heart, Smile, ExternalLink, Activity, Plane, Laptop, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import useApiStore from '../../store/apiStore';
import { uploadAPI } from '../../services/api';

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
];

const INTERESTS_OPTIONS = [
  { id: 'fitness', label: 'Fitness', Icon: Activity },
  { id: 'travel', label: 'Travel', Icon: Plane },
  { id: 'technology', label: 'Technology', Icon: Laptop },
  { id: 'hobbies', label: 'Hobbies', Icon: Palette },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'relationships', label: 'Relationships', icon: '❤️' },
  { id: 'personal_growth', label: 'Personal Growth', icon: '🌱' },
  { id: 'creativity', label: 'Creativity', icon: '🎭' },
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

const PersonalInfoSection = () => {
  const { user, updateProfile, locationSuggestions, searchCitySuggestions } = useApiStore();
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    youtube: user?.youtube || '',
    instagram: user?.instagram || '',
    avatar: user?.avatar || '',
    interests: user?.interests || [],
    currentMood: user?.currentMood || '',
    quote: user?.quote || ''
  });

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [urlErrors, setUrlErrors] = useState({
    youtube: '',
    instagram: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        youtube: user.youtube || '',
        instagram: user.instagram || '',
        avatar: user.avatar || '',
        interests: user.interests || [],
        currentMood: user.currentMood ?? '',
        quote: user.quote || ''
      });
    }
  }, [user]);

  // Debounce location search
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

  // Check for changes
  useEffect(() => {
    if (!user) return;
    const changed = 
      formData.name !== (user.name || '') ||
      formData.username !== (user.username || '') ||
      formData.bio !== (user.bio || '') ||
      formData.location !== (user.location || '') ||
      formData.website !== (user.website || '') ||
      formData.youtube !== (user.youtube || '') ||
      formData.instagram !== (user.instagram || '') ||
      formData.avatar !== (user.avatar || '') ||
      formData.currentMood !== (user.currentMood ?? '') ||
      formData.quote !== (user.quote || '') ||
      JSON.stringify(formData.interests) !== JSON.stringify(user.interests || []);
    setHasChanges(changed);
  }, [formData, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear URL errors when user types
    if (name === 'youtube' || name === 'instagram') {
      setUrlErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

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

  const validateSocialUrls = () => {
    const errors = {
      youtube: '',
      instagram: ''
    };
    
    if (formData.youtube && formData.youtube.trim() !== '') {
      const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?|youtu\.be\/).+/i;
      if (!youtubePattern.test(formData.youtube)) {
        errors.youtube = 'Please enter a valid YouTube URL';
      }
    }
    
    if (formData.instagram && formData.instagram.trim() !== '') {
      const instagramPattern = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/i;
      if (!instagramPattern.test(formData.instagram)) {
        errors.instagram = 'Please enter a valid Instagram URL';
      }
    }
    
    setUrlErrors(errors);
    return !errors.youtube && !errors.instagram;
  };

  const handleInterestToggle = (interestId) => {
    setFormData(prev => {
      const isSelected = prev.interests.includes(interestId);
      
      if (!isSelected && prev.interests.length >= 5) {
        toast.error('Maximum 5 interests allowed');
        return prev;
      }
      
      return {
        ...prev,
        interests: isSelected
          ? prev.interests.filter(id => id !== interestId)
          : [...prev.interests, interestId]
      };
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    setAvatarError('');
    if (!file) return;
    
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setAvatarError('Only JPG/JPEG/PNG images are allowed');
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarError('Max image size is 1 MB');
      return;
    }
    
    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append('avatar', file);
      const res = await uploadAPI.uploadAvatar(form);
      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setFormData(prev => ({
          ...prev,
          avatar: url
        }));
      }
    } catch (err) {
      console.error('Avatar upload failed', err);
      setAvatarError(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    
    if (!validateSocialUrls()) {
      return;
    }
    
    setLoading(true);
    // Don't send email in the request - it's not changeable
    const { email, ...profileData } = formData;
    const result = await updateProfile(profileData);
    setLoading(false);
    
    if (result.success) {
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } else {
      const msg = result.error || '';
      if (msg.toLowerCase().includes('username')) {
        setUsernameError(msg);
      } else {
        toast.error(msg || 'Failed to update profile');
      }
    }
  };

  const handleDiscard = () => {
    setFormData({
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      youtube: user?.youtube || '',
      instagram: user?.instagram || '',
      avatar: user?.avatar || '',
      interests: user?.interests || [],
      currentMood: user?.currentMood ?? '',
      quote: user?.quote || ''
    });
    setShowMoodPicker(false);
    setUsernameError('');
    setUrlErrors({ youtube: '', instagram: '' });
    setAvatarError('');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Update your profile details and how others see you on WishTrail.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            PROFILE PICTURE
          </label>
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={formData.avatar || '/api/placeholder/80/80'}
                alt="Profile"
                className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-600 object-cover"
              />
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg transition-colors"
              >
                <Camera className="h-4 w-4 text-white" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the camera icon to upload a new profile picture
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                JPG, JPEG or PNG. Max size 1MB
              </p>
              {avatarError && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{avatarError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Name and Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Alex Rivers"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full pl-8 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  usernameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="alexrivers"
              />
            </div>
            {usernameError && (
              <div className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{usernameError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={200}
            value={formData.bio}
            onChange={handleInputChange}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Architecting milestones and chasing long-term efficiency. Explorer of culinary traditions and professional competency."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {formData.bio.length}/200 CHARACTERS
          </p>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleLocationInputChange}
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your city"
            />
            {showSuggestions && Array.isArray(locationSuggestions) && locationSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {locationSuggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const formatted = formatLocation(place);
                      setFormData((prev) => ({
                        ...prev,
                        location: formatted
                      }));
                      setLocationQuery(formatted);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                  >
                    {formatLocation(place)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Current Mood */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Mood
          </label>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 flex items-center justify-center transition-colors hover:border-blue-500"
              title="Click to change mood"
            >
              {formData.currentMood ? (
                <span className="text-3xl">{formData.currentMood}</span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">None</span>
              )}
            </button>
            {showMoodPicker && (
              <div className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto">
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, currentMood: '' }));
                      setShowMoodPicker(false);
                    }}
                    className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium transition-all hover:bg-white dark:hover:bg-gray-700 ${
                      !formData.currentMood ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500' : ''
                    }`}
                    title="No mood"
                  >
                    None
                  </button>
                  {MOOD_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, currentMood: emoji }));
                        setShowMoodPicker(false);
                      }}
                      className={`w-10 h-10 rounded-md flex items-center justify-center text-2xl transition-all hover:bg-white dark:hover:bg-gray-700 ${
                        formData.currentMood === emoji ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500' : ''
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

        {/* Quote */}
        <div>
          <label htmlFor="quote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Personal Quote
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Share an inspiring quote or motto that represents you
          </p>
          <textarea
            id="quote"
            name="quote"
            value={formData.quote}
            onChange={(e) => {
              if (e.target.value.length <= 100) {
                setFormData(prev => ({ ...prev, quote: e.target.value }));
              }
            }}
            placeholder="Enter your favorite quote..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className={`text-xs mt-1 ${ formData.quote.length >= 100 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            {formData.quote.length}/100 characters
          </p>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Interests
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Select up to 5 interests that best represent you
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INTERESTS_OPTIONS.map(interest => {
              const selected = formData.interests.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => handleInterestToggle(interest.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left flex flex-col items-center justify-center min-h-[90px] ${
                    selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 mb-2">
                    {interest.Icon ? (
                      <interest.Icon className={`h-5 w-5 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    ) : (
                      <span className="text-2xl">{interest.icon}</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-center">{interest.label}</div>
                </button>
              );
            })}
          </div>
          <p className={`text-xs mt-2 ${formData.interests.length >= 5 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
            Selected: {formData.interests.length}/5 interests
          </p>
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Social Links <span className="text-xs font-normal text-gray-500 dark:text-gray-400"></span>
          </label>
          <div className="space-y-3">
            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-website.com"
                />
              </div>
            </div>

            {/* YouTube */}
            <div>
              <label htmlFor="youtube" className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                YouTube
              </label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="youtube"
                  name="youtube"
                  type="url"
                  value={formData.youtube}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    urlErrors.youtube ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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

            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                Instagram
              </label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="instagram"
                  name="instagram"
                  type="url"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    urlErrors.instagram ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasChanges || loading}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={!hasChanges || loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInfoSection;
