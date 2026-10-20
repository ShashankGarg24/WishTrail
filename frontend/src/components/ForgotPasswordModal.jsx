import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Send } from 'lucide-react';
import useApiStore from '../store/apiStore';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [identifier, setIdentifier] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const { forgotPassword, loading, error } = useApiStore();

  const handleInputChange = (e) => {
    setIdentifier(e.target.value);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateEmail = () => {
    const newErrors = {};

    if (!identifier.trim()) {
      newErrors.email = 'Email or username is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    try {
      const result = await forgotPassword(identifier);

      if (result.success) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setIsSubmitted(false);
    setErrors({});
    onClose();
  };

  const handleBackToLogin = () => {
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-line"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isSubmitted ? 'Check Your Email' : 'Forgot Password?'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-muted transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          {!isSubmitted ? (
            <div>
              <p className="text-gray-600 dark:text-muted mb-6">
                Enter your email or username and we'll send a reset link to your account email.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      id="forgot-identifier"
                      type="text"
                      autoCapitalize="none"
                      autoComplete="username"
                      value={identifier}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 pt-6 pb-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-elevated text-gray-900 dark:text-white transition-colors ${
                        errors.email ? 'border-red-500' : 'border-gray-300 dark:border-line'
                      }`}
                      disabled={loading}
                    />
                    <label htmlFor="forgot-identifier" className={`pointer-events-none absolute left-4 origin-left transition-all duration-150 ${identifier ? 'top-1.5 text-xs' : 'top-1/2 -translate-y-1/2 text-base peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-xs'} text-gray-500 dark:text-muted peer-focus:text-primary-500`}>
                      Email or username
                    </label>
                  </div>
                  {errors.email && (
                    <div className="flex items-center mt-2 text-red-500 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Global Error */}
                {error && (
                  <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={handleBackToLogin}
                  className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>

              <p className="text-gray-600 dark:text-muted mb-6">
                If an account matches those details, we've sent a password reset link to its email address.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  <strong>What's next?</strong><br />
                  Check your email and click the reset link. The link will expire in 15 minutes for security.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  Back to Login
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-gray-100 dark:bg-elevated text-gray-700 dark:text-muted rounded-lg hover:bg-gray-200 dark:hover:bg-elevated transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;
