import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Droplet, Shield, Check, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useApiStore from "../store/apiStore";
import toast from 'react-hot-toast';
import MultiStepSignup from "../components/MultiStepSignup";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import GoogleSignInButton from "../components/GoogleSignInButton";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, googleLogin, loading, error } = useApiStore();
  const navigate = useNavigate();

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = "Name is required";
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
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
      if (isLogin) {
        await login(formData.email, formData.password);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
    setErrors({});
  };

  const handleMultiStepSignupSuccess = (user, token) => {
    navigate("/dashboard");
  };

  const handleGoogleSuccess = async (credential) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin(credential);
      if (result.success) {
        toast.success(result.isNewUser ? 'Account created successfully!' : 'Welcome back!');
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Failed to sign in with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google OAuth error:', error);
    toast.error('Failed to sign in with Google. Please try again.');
    setIsGoogleLoading(false);
  };

  const handleAppleSuccess = async (response) => {
    toast.info('Apple Sign In coming soon!');
  };

  const handleAppleError = (error) => {
    console.error('Apple OAuth error:', error);
    toast.error('Failed to sign in with Apple. Please try again.');
  };

  // SIGNUP PAGE - Multi-step flow
  if (!isLogin) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Brand Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-800 via-gray-900 to-black relative overflow-hidden items-center justify-center p-12">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(74, 144, 226, 0.3), transparent 50%)`
            }}></div>
          </div>
          
          <div className="relative z-10 max-w-md text-white space-y-8">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Droplet className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold">WishTrail</h1>
            </div>

            {/* Tagline */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold leading-tight">
                Start your journey<br />
                <span className="text-blue-400">toward precision.</span>
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Join thousands of high-achievers using WishTrail to document milestones and accelerate professional competency.
              </p>
            </div>

            {/* Social Proof */}
            {/* <div className="flex items-center space-x-4 pt-8">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-gray-800 flex items-center justify-center text-white text-sm font-semibold">
                  J
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-gray-800 flex items-center justify-center text-white text-sm font-semibold">
                  S
                </div>
              </div>
              <p className="text-sm text-gray-400 font-medium">
                TRUSTED BY <span className="text-white font-bold">12K+ USERS</span>
              </p>
            </div> */}
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-900">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <MultiStepSignup
                onSuccess={handleMultiStepSignupSuccess}
                onBack={toggleAuthMode}
              />

              {/* Toggle Auth Mode */}
              <div className="text-center mt-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <button
                    onClick={toggleAuthMode}
                    className="text-blue-500 hover:text-blue-600 font-semibold"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }
  
  // LOGIN PAGE - Split design
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop')`,
          }}
        />
        
        <div className="relative z-10 flex items-center justify-center p-12 text-white w-full">
          {/* Logo and Tagline - Centered */}
          <div className="space-y-6 max-w-md">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Droplet className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold">WishTrail</h1>
            </div>

            <div className="space-y-3">
              <h2 className="text-5xl font-bold leading-tight">
                One step at a time.
              </h2>
              <p className="text-lg text-gray-200 leading-relaxed">
                Track your journey with precision and clarity.<br />
                Your path to progress starts here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please enter your details to access your dashboard.
              </p>
            </div>

            {/* Social Sign-in Buttons */}
            <div className="space-y-3">
              <GoogleSignInButton
                mode="signin"
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 uppercase tracking-wide text-xs font-medium">
                  Or with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide text-xs">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="name@company.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide text-xs">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 ${
                      errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Global Error */}
              {error && (
                <div className="text-red-500 text-sm text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isGoogleLoading}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'Please wait...' : 'Login to Dashboard'}
              </button>
            </form>

            {/* Toggle Auth Mode */}
            <div className="text-center mt-6">
              <p className="text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <button
                  onClick={toggleAuthMode}
                  className="text-blue-500 hover:text-blue-600 font-semibold"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default AuthPage;
