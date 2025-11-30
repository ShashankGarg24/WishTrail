import { useState } from 'react';
import { Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { configService } from '../../services/configService';

/**
 * Maintenance Mode Settings Component
 * Admin component to toggle maintenance mode
 */
const MaintenanceSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleToggle = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const token = localStorage.getItem('token');
      const newState = !isEnabled;

      await configService.toggleMaintenanceMode(
        newState,
        message || 'System is under maintenance. Please try again later.',
        token
      );

      setIsEnabled(newState);
      setFeedback({
        type: 'success',
        message: `Maintenance mode ${newState ? 'enabled' : 'disabled'} successfully!`
      });

      // Clear message field when disabling
      if (!newState) {
        setMessage('');
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to toggle maintenance mode'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Maintenance Mode
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control system-wide maintenance mode
          </p>
        </div>
      </div>

      {/* Feedback Message */}
      {feedback.message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Status:
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isEnabled
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            }`}
          >
            {isEnabled ? 'Maintenance Active' : 'System Online'}
          </span>
        </div>
      </div>

      {/* Message Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Maintenance Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g., We're performing scheduled maintenance. We'll be back online at 3:00 PM EST."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
          rows={4}
          disabled={loading}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          This message will be displayed to users during maintenance mode
        </p>
      </div>

      {/* Warning Box */}
      {!isEnabled && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">Warning</p>
              <p>
                Enabling maintenance mode will prevent users from accessing the application.
                Only health check and maintenance status endpoints will remain accessible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          isEnabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {isEnabled ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Disable Maintenance Mode
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Enable Maintenance Mode
              </>
            )}
          </>
        )}
      </button>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Quick presets:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setMessage('Scheduled maintenance in progress. We\'ll be back online shortly.')}
            className="text-left px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            Scheduled Maintenance
          </button>
          <button
            onClick={() => setMessage('Emergency maintenance. Thank you for your patience.')}
            className="text-left px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            Emergency Maintenance
          </button>
          <button
            onClick={() => setMessage('Upgrading systems for better performance. Back soon!')}
            className="text-left px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            System Upgrade
          </button>
          <button
            onClick={() => setMessage('Performing database maintenance. Should take about 30 minutes.')}
            className="text-left px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            Database Maintenance
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSettings;
