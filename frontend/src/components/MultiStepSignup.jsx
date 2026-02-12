import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, User, Eye, EyeOff, ArrowLeft, ArrowRight, 
  CheckCircle, AlertCircle, Loader, Heart, Shield, Clock, Calendar,
  Activity, Plane, Laptop, Palette
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useApiStore from "../store/apiStore";
import toast from 'react-hot-toast';
import GoogleSignInButton from "./GoogleSignInButton";

// Interests options matching PersonalInfoSection
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

const MultiStepSignup = ({ onSuccess, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    otp: "",
    dateOfBirth: "",
    interests: [],
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);

  const { checkExistingUser, requestOTP, verifyOTP, register, resendOTP, loading } = useApiStore();
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleInterestToggle = (interestId) => {
    setFormData(prev => {
      const isSelected = prev.interests.includes(interestId);
      
      // Don't allow more than 5 interests
      if (!isSelected && prev.interests.length >= 5) {
        toast.error('Maximum 5 interests allowed');
        return prev;
      }
      
      setErrors(prev => ({ ...prev, interests: undefined }));
      
      return {
        ...prev,
        interests: isSelected
          ? prev.interests.filter(id => id !== interestId)
          : [...prev.interests, interestId]
      };
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[a-zA-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one letter";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    } else if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`~;]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one special character";
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
    try {
      const profileData = {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        username: formData.username,
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.interests.length > 0 && { interests: formData.interests })
      };

      const result = await register(profileData);

      if (!result.success) {
        setErrors({ general: result.error });
        return;
      }

      toast.success('Account created successfully!');
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
      toast.success('OTP resent successfully!');
      
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

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-blue-500 tracking-wide">
            STEP 1 OF 3
          </p>
          <div className="flex space-x-1">
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Join WishTrail
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create your account to start tracking milestones.
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Social Sign-in Buttons */}
      <div className="space-y-3">
        <GoogleSignInButton
          mode="signup"
          onSuccess={(credential) => {
            toast.info('Google Sign-Up handled by main auth flow');
          }}
          onError={(error) => {
            console.error('Google signup error:', error);
          }}
        />

      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wide text-xs font-medium">
            Or with email
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400`}
            placeholder="Alex Rivers"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400`}
            placeholder="alexrivers"
          />
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400`}
            placeholder="alex@wishtrail.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>
      </div>

      {/* Continue Button */}
      <button
        type="button"
        onClick={handleStep1Submit}
        disabled={loading}
        className="w-full flex items-center justify-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {loading ? (
          <Loader className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-blue-500 tracking-wide">
            STEP 2 OF 3
          </p>
          <div className="flex space-x-1">
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Verify Your Email
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          We've sent a 6-digit code to <strong>{formData.email}</strong>
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      {/* OTP Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
          Verification Code
        </label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleInputChange}
          maxLength={6}
          className={`w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            errors.otp ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white`}
          placeholder="000000"
        />
        {errors.otp && <p className="text-red-500 text-sm mt-1">{errors.otp}</p>}
      </div>

      {/* Code Expiration Timer */}
      {otpExpiresAt && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Code expires in {formatTime(Math.max(0, Math.floor((new Date(otpExpiresAt) - new Date()) / 1000)))}</span>
          </div>
        </div>
      )}

      {/* Resend OTP */}
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

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <button
          type="button"
          onClick={handleStep2Submit}
          disabled={loading}
          className="flex items-center px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <Loader className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <>
              Verify
              <CheckCircle className="w-5 h-5 ml-2" />
            </>
          )}
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-blue-500 tracking-wide">
            STEP 3 OF 3
          </p>
          <div className="flex space-x-1">
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-blue-500 rounded-full"></div>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Complete Your Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us a bit more about yourself (Optional)
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Date of Birth */}
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="w-4 h-4 mr-2" />
          Date of Birth
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Optional)</span>
        </label>
        <input
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
        />
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Interests
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select up to 5 interests that best represent you
        </p>
        <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INTERESTS_OPTIONS.map((interest) => {
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
        </div>
        <p className={`text-xs ${formData.interests.length >= 5 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          Selected: {formData.interests.length}/5 interests
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleStep3Submit}
            className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleStep3Submit}
            disabled={loading}
            className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <Loader className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <>
                Create Account
                <CheckCircle className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
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
