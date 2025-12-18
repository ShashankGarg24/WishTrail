import { useState } from "react";
import { settingsAPI } from "../../services/api";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getPasswordStrength = () => {
    if (!newPassword) return { text: '', color: '' };
    const hasLength = newPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    const strength = [hasLength, hasLetter, hasNumber].filter(Boolean).length;
    
    if (strength === 3 && hasSpecial) return { text: 'Strong', color: 'text-green-600 dark:text-green-400' };
    if (strength === 3) return { text: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (strength === 2) return { text: 'Fair', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: 'Weak', color: 'text-red-600 dark:text-red-400' };
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain letters');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain numbers');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await settingsAPI.updatePassword({
        currentPassword,
        newPassword
      });
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Failed to update password:', error);
      setError(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Current Password
        </label>
        <div className="relative">
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter your current password"
            required
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          {newPassword && (
            <span className={`text-xs font-medium ${getPasswordStrength().color}`}>
              {getPasswordStrength().text}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter your new password"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Confirm your new password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Requirements</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <li className={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
            {newPassword.length >= 8 ? '✓' : '•'} At least 8 characters long
          </li>
          <li className={/[a-zA-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
            {/[a-zA-Z]/.test(newPassword) ? '✓' : '•'} Must contain letters
          </li>
          <li className={/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
            {/[0-9]/.test(newPassword) ? '✓' : '•'} Must contain numbers
          </li>
          <li>• Different from your current password</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
      >
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
