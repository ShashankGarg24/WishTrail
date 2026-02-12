import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Star } from 'lucide-react';
import useApiStore from '../store/apiStore';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  
  const { resetPassword, loading, error } = useApiStore();

  // Check if token exists on component mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

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
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/[a-zA-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one letter';
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/'`~;]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one special character';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const result = await resetPassword(token, formData.newPassword);
      
      if (result.success) {
        setIsSubmitted(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.message.includes('token')) {
        setTokenValid(false);
      }
    }
  };

  // Invalid token or no token
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Reset Link
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            
            <div className="space-y-3">
              <Link
                to="/auth"
                className="block w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Back to Login
              </Link>
              
              <Link
                to="/"
                className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Go Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Password Reset Successful!
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
              <p className="text-purple-700 dark:text-purple-400 text-sm">
                For security, all existing sessions have been logged out. You'll need to log in again with your new password.
              </p>
            </div>
            
            <Link
              to="/auth"
              className="block w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              Continue to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Star className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                WishTrail
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Set New Password
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <div className="flex items-center mt-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.newPassword}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="flex items-center mt-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.confirmPassword}
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Requirements:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    formData.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    /[a-zA-Z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  At least one letter
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    /\d/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  At least one number
                </li>
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    /[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/'`~;]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                  At least one special character
                </li>
              </ul>
            </div>

            {/* Global Error */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link
              to="/auth"
              className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;