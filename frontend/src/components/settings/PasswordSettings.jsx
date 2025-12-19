import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { settingsAPI, authAPI } from "../../services/api";
import { Eye, EyeOff, AlertCircle, CheckCircle, Shield, Clock, LogOut } from "lucide-react";
import useApiStore from "../../store/apiStore";

export default function PasswordSettings() {
  const navigate = useNavigate();
  const { user, logout } = useApiStore();
  const hasPassword = user?.hasPassword !== false; // Check if user has a password set

  // Shared state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  // State for regular password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // State for Google SSO password setup
  const [otpStep, setOtpStep] = useState(1); // 1: request OTP, 2: enter OTP & password
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);

  // OTP timer effect
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0 && otpStep === 2) {
      setCanResendOTP(true);
    }
    return () => clearInterval(interval);
  }, [otpTimer, otpStep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    setLoading(true);
    try {
      const response = await authAPI.requestPasswordSetupOTP();
      setSuccess("OTP sent to your email!");
      setOtpStep(2);
      setOtpExpiresAt(new Date(response.data.data.expiresAt));
      setOtpTimer(30); // 30 seconds initial wait time
      setCanResendOTP(false);
    } catch (error) {
      console.error('Failed to request OTP:', error);
      setError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP) return;

    setError("");
    setLoading(true);
    try {
      const response = await authAPI.requestPasswordSetupOTP();
      setSuccess("OTP resent to your email!");
      setOtpTimer(60); // Increased wait time after resend
      setCanResendOTP(false);
      setOtp(""); // Clear OTP input
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      setError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordWithOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const validationErrors = validatePassword(newPassword);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Show warning before proceeding
    setShowWarning(true);
  };

  const confirmSetPassword = async () => {
    setShowWarning(false);
    setLoading(true);
    try {
      await authAPI.setPasswordWithOTP({
        otp,
        newPassword
      });
      setSuccess("Password set successfully! Logging you out...");
      
      // Wait 2 seconds to show success message
      setTimeout(async () => {
        await logout();
        navigate('/auth');
      }, 2000);
    } catch (error) {
      console.error('Failed to set password:', error);
      setError(error.response?.data?.message || 'Failed to set password');
      setLoading(false);
    }
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

    // Show warning before proceeding
    setShowWarning(true);
  };

  const confirmPasswordChange = async () => {
    setShowWarning(false);
    setLoading(true);
    try {
      await settingsAPI.updatePassword({
        currentPassword,
        newPassword
      });
      setSuccess("Password updated successfully! Logging you out...");
      
      // Wait 2 seconds to show success message
      setTimeout(async () => {
        await logout();
        navigate('/auth');
      }, 2000);
    } catch (error) {
      console.error('Failed to update password:', error);
      setError(error.response?.data?.message || 'Failed to update password');
      setLoading(false);
    }
  };

  // Warning Dialog Component
  const WarningDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center flex-shrink-0">
            <LogOut className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              You'll be logged out
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              For security reasons, you'll be logged out after {hasPassword ? 'changing' : 'setting'} your password. You'll need to log in again with your new password.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowWarning(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={hasPassword ? confirmPasswordChange : confirmSetPassword}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  // Render password setup flow for users without password (e.g., Google SSO users)
  if (!hasPassword) {
    if (otpStep === 1) {
      return (
        <div className="space-y-4">
          {showWarning && <WarningDialog />}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Set a Password</h4>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  You signed up using social login. Set a password to enable traditional login as an alternative.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleRequestOTP} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click the button below to receive a verification code via email. You'll use this code to set your new password.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
      );
    }

    // OTP Step 2: Enter OTP and set password
    return (
      <div className="space-y-4">
        {showWarning && <WarningDialog />}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Verify Your Email
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We've sent a 6-digit code to your email
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSetPasswordWithOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              placeholder="000000"
              required
            />
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
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setOtpStep(1);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setError("");
                setSuccess("");
              }}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Regular password change flow (for non-Google users)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showWarning && <WarningDialog />}
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
