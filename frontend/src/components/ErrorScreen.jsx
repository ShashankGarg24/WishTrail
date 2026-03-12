import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  WifiOff, 
  AlertCircle, 
  Server, 
  Lock, 
  LogOut, 
  Home, 
  RefreshCw,
  Droplet
} from 'lucide-react';

/**
 * Generic Error Screen Component
 * Displays different error types based on props
 */
const ErrorScreen = ({ 
  type = 'generic',
  title,
  message,
  showHomeButton = true,
  showRetryButton = false,
  onRetry,
  customAction
}) => {
  // Safe navigation - check if we're inside Router context
  let navigate = null;
  try {
    navigate = useNavigate();
  } catch (e) {
    // Not inside Router context, use fallback
    navigate = null;
  }

  // Error type configurations
  const errorConfigs = {
    generic: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      title: 'Something Went Wrong',
      message: 'We\'re working on it — please try again in a moment.'
    },
    network: {
      icon: WifiOff,
      iconColor: 'text-blue-500',
      title: 'Connection Lost',
      message: 'Please check your internet connection and try again.'
    },
    500: {
      icon: Server,
      iconColor: 'text-orange-500',
      title: 'Server Error',
      message: 'Our servers are experiencing issues. Please try again shortly.'
    },
    503: {
      icon: Server,
      iconColor: 'text-yellow-500',
      title: 'Service Unavailable',
      message: 'We\'re experiencing high traffic. Please try again in a moment.'
    },
    permission: {
      icon: Lock,
      iconColor: 'text-amber-500',
      title: 'Access Denied',
      message: 'You don\'t have permission to access this resource.'
    },
    auth: {
      icon: LogOut,
      iconColor: 'text-indigo-500',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again to continue.'
    }
  };

  const config = errorConfigs[type] || errorConfigs.generic;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

    const handleHomeCtaClick = () => {
    if (onRetry) {
      navigate('/');
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Main Content */}
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className={`w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center ${config.iconColor}`}>
                <Icon size={48} strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
            >
              {displayTitle}
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 dark:text-gray-400 text-base md:text-lg mb-8 leading-relaxed"
            >
              {displayMessage}
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              {showRetryButton && (
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
              )}

              {showHomeButton && (
                navigate ? (
                  <Link
                    onClick={handleHomeCtaClick}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors shadow-sm ${
                      showRetryButton 
                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Home size={18} />
                    Go Home
                  </Link>
                ) : (
                  <a
                    href="/"
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors shadow-sm ${
                      showRetryButton 
                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Home size={18} />
                    Go Home
                  </a>
                )
              )}

              {type === 'auth' && (
                navigate ? (
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <LogOut size={18} />
                    Sign In
                  </Link>
                ) : (
                  <a
                    href="/auth"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <LogOut size={18} />
                    Sign In
                  </a>
                )
              )}

              {customAction && (
                <button
                  onClick={customAction.onClick}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors shadow-sm"
                >
                  {customAction.icon && <customAction.icon size={18} />}
                  {customAction.label}
                </button>
              )}
            </motion.div>

            {/* Additional Help Text */}
            {(type === 'permission' || type === '500') && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 text-sm text-gray-500 dark:text-gray-500"
              >
                Need help? Contact us at{' '}
                <a 
                  href="mailto:thewishtrail@gmail.com" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  thewishtrail@gmail.com
                </a>
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-gray-500 dark:text-gray-500"
        >
          © 2024 WishTrail. Preparing for your next milestone.
        </motion.p>
      </div>
    </div>
  );
};

export default ErrorScreen;
