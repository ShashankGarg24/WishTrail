import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowLeft, ArrowRight, 
  Clock, Shield, CheckCircle, Calendar, MapPin, Heart,
  AlertCircle, Loader
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useApiStore from "../store/apiStore";

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

const MultiStepSignup = ({ onSuccess, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Registration
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",

    // Step 2: OTP Verification
    otp: "",
    
    // Step 3: Profile Completion
    dateOfBirth: "",
    location: "",
    interests: []
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  const { 
    checkExistingUser, 
    requestOTP, 
    verifyOTP, 
    register, 
    resendOTP, 
    loading, 
    locationSuggestions, 
    searchCitySuggestions,
    error 
  } = useApiStore();
  
  const navigate = useNavigate();

  // OTP timer effect
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0 && currentStep === 2) {
      setCanResendOTP(true);
    }
    return () => clearInterval(interval);
  }, [otpTimer, currentStep]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
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

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, dots, hyphens, and underscores";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.otp) {
      newErrors.otp = "OTP is required";
    } else if (formData.otp.length !== 6) {
      newErrors.otp = "OTP must be 6 digits";
    } else if (!/^\d{6}$/.test(formData.otp)) {
      newErrors.otp = "OTP must contain only numbers";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (formData.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13) {
        newErrors.dateOfBirth = "You must be at least 13 years old";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = async () => {
    if (!validateStep1()) return;

    try {
      // Check if username or email already exists
      const checkResult = await checkExistingUser({
        email: formData.email,
        username: formData.username
      });

      if (!checkResult.success) {
        setErrors({ general: checkResult.error });
        return;
      }

      const { data: { available, checks } } = checkResult;
      
      if (!available) {
        const newErrors = {};
        checks.forEach(check => {
          if (check.exists) {
            newErrors[check.field] = `This ${check.field} is already taken`;
          }
        });
        setErrors(newErrors);
        return;
      }

      // Request OTP
      const otpResult = await requestOTP({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        gender: formData.gender,
      });

      if (!otpResult.success) {
        setErrors({ general: otpResult.error });
        return;
      }

      // Move to OTP step
      setCurrentStep(2);
      setOtpExpiresAt(new Date(otpResult.data.expiresAt));
      setOtpTimer(30); // 30 seconds initial wait time
      setCanResendOTP(false);
      setErrors({});
      
    } catch (error) {
      setErrors({ general: "Something went wrong. Please try again." });
    }
  };

  const handleStep2Submit = async () => {
    if (!validateStep2()) return;

    try {
      const result = await verifyOTP({
        email: formData.email,
        otp: formData.otp
      });

      if (!result.success) {
        setErrors({ otp: result.error });
        return;
      }

      // Move to profile completion step
      setCurrentStep(3);
      setErrors({});
      
    } catch (error) {
      setErrors({ otp: "Invalid OTP. Please try again." });
    }
  };

  const handleStep3Submit = async () => {
    if (!validateStep3()) return;

    try {
      const profileData = {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        username: formData.username,
        gender: formData.gender,
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.location && { location: formData.location }),
        ...(formData.interests.length > 0 && { interests: formData.interests })
      };

      const result = await register(profileData);

      if (!result.success) {
        setErrors({ general: result.error });
        return;
      }

      // Registration completed successfully
      if (onSuccess) {
        onSuccess(result.user, result.token);
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      setErrors({ general: "Failed to complete registration. Please try again." });
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP) return;

    try {
      const result = await resendOTP({ email: formData.email });

      if (!result.success) {
        setErrors({ general: result.error });
        return;
      }

      setOtpTimer(60); // Increased wait time after resend
      setCanResendOTP(false);
      setErrors({});
      
      // Clear OTP input
      setFormData(prev => ({ ...prev, otp: "" }));
      
    } catch (error) {
      setErrors({ general: "Failed to resend OTP. Please try again." });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    } else if (onBack) {
      onBack();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Create Your Account
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let's start with your basic information
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errors.general}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Enter your full name"
            />
          </div>
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="username"
            />
          </div>
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email Address *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            placeholder="Enter your email"
          />
        </div>
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Gender *
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep1Submit}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4 mr-2" />
          )}
          Continue
        </button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We've sent a 6-digit code to <strong>{formData.email}</strong>
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errors.general}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Verification Code *
        </label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          maxLength={6}
          className={`w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.otp ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="000000"
        />
        {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
      </div>

      {otpExpiresAt && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Code expires in {formatTime(Math.max(0, Math.floor((new Date(otpExpiresAt) - new Date()) / 1000)))}</span>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={!canResendOTP || loading}
          className={`text-sm font-medium ${
            canResendOTP ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 cursor-not-allowed'
          } transition-colors`}
        >
          {!canResendOTP && otpTimer > 0 
            ? `Resend in ${formatTime(otpTimer)}`
            : 'Resend Code'
          }
        </button>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep2Submit}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Verify
        </button>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Complete Your Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Help us personalize your experience (optional)
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errors.general}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of Birth
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            />
          </div>
          {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleLocationInputChange}
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // delay for click
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your city"
            />
          </div>
          {/* Autocomplete dropdown */}
              {showSuggestions && Array.isArray(locationSuggestions) && locationSuggestions.length > 0 && (
                
              <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto text-sm text-gray-900 dark:text-white">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Interests (Choose any that appeal to you)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {INTERESTS_OPTIONS.map(interest => (
            <button
              key={interest.id}
              type="button"
              onClick={() => handleInterestToggle(interest.id)}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                formData.interests.includes(interest.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{interest.icon}</div>
                <div className="text-xs font-medium">{interest.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep3Submit}
          disabled={loading}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Complete Registration
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => handleStep3Submit()}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} of 3
          </div>
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </AnimatePresence>
    </div>
  );
};

export default MultiStepSignup;