import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  WifiOff, 
  AlertCircle, 
  Server, 
  Lock, 
  LogOut, 
  Home, 
  RefreshCw,
  ArrowLeft
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
  showBackButton = false,
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
      bgGradient: 'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20',
      title: 'Oops! Something went wrong.',
      message: 'We\'re working on it — try again in a moment.',
      code: null
    },
    network: {
      icon: WifiOff,
      iconColor: 'text-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
      title: 'Can\'t connect right now.',
      message: 'Please check your internet and try again.',
      code: null
    },
    404: {
      icon: AlertCircle,
      iconColor: 'text-purple-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20',
      title: 'Page not found.',
      message: 'It might have been moved or deleted.',
      code: '404'
    },
    500: {
      icon: Server,
      iconColor: 'text-orange-500',
      bgGradient: 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20',
      title: 'Our servers are taking a break.',
      message: 'Please try again shortly.',
      code: '500'
    },
    503: {
      icon: Server,
      iconColor: 'text-yellow-500',
      bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
      title: 'Service temporarily unavailable.',
      message: 'We\'re experiencing high traffic. Please try again in a moment.',
      code: '503'
    },
    permission: {
      icon: Lock,
      iconColor: 'text-amber-500',
      bgGradient: 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
      title: 'You don\'t have access to this.',
      message: 'If you think this is a mistake, contact support.',
      code: '403'
    },
    auth: {
      icon: LogOut,
      iconColor: 'text-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20',
      title: 'You\'ve been logged out.',
      message: 'Please sign in again to continue.',
      code: '401'
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900 flex items-center justify-center px-4 py-12`}>
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className={`p-4 rounded-full bg-white dark:bg-gray-800 shadow-lg ${config.iconColor}`}>
              <Icon size={48} strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Error Code */}
          {config.code && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-300 mb-4"
            >
              {config.code}
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
          >
            {displayTitle}
          </motion.h1>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            {showBackButton && (
              <button
                onClick={() => navigate ? navigate(-1) : window.history.back()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={18} />
                Go Back
              </button>
            )}

            {showRetryButton && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
            )}

            {showHomeButton && (
              navigate ? (
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3"
                >
                  <Home size={18} />
                  Go Home
                </Link>
              ) : (
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3"
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
                  className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3"
                >
                  <LogOut size={18} />
                  Sign In
                </Link>
              ) : (
                <a
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3"
                >
                  <LogOut size={18} />
                  Sign In
                </a>
              )
            )}

            {customAction && (
              <button
                onClick={customAction.onClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
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
              transition={{ delay: 0.4 }}
              className="mt-6 text-sm text-gray-500 dark:text-gray-500"
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
  );
};

export default ErrorScreen;
