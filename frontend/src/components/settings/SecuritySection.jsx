import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Smartphone, Laptop, AlertCircle, CheckCircle, LogOut, Shield, Clock } from 'lucide-react';
import { settingsAPI, authAPI } from '../../services/api';
import useApiStore from '../../store/apiStore';
import { useNavigate } from 'react-router-dom';

const SecuritySection = () => {
  const navigate = useNavigate();
  const { user, logout } = useApiStore();
  const hasPassword = user?.hasPassword !== false;

  // Shared state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  // State for Google SSO password setup
  const [otpStep, setOtpStep] = useState(1); // 1: request OTP, 2: enter OTP & password
  const [otp, setOtp] = useState('');
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
    if (strength === 3) return { text: 'Good', color: 'text-purple-600 dark:text-purple-400' };
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
    setError('');
    setSuccess('');
    
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
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Wait 2 seconds then logout
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

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    setLoading(true);
    try {
      const response = await authAPI.requestPasswordSetupOTP();
      setSuccess('OTP sent to your email!');
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

    setError('');
    setLoading(true);
    try {
      const response = await authAPI.requestPasswordSetupOTP();
      setSuccess('OTP resent to your email!');
      setOtpTimer(60); // Increased wait time after resend
      setCanResendOTP(false);
      setOtp(''); // Clear OTP input
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      setError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordWithOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
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
      setSuccess('Password set successfully! Logging you out...');
      
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
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {showWarning && <WarningDialog />}
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account protection and sign-in preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Password Section - Different UI based on hasPassword */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {hasPassword ? 'Change Password' : 'Set a Password'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {hasPassword 
                  ? 'Update your login credentials regularly for better safety.'
                  : 'You signed up using social login. Set a password to enable traditional login as an alternative.'
                }
              </p>
            </div>
          </div>

          {!hasPassword && otpStep === 1 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">Why Set a Password?</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-200">
                    Add password login as a backup method. You can continue using social login or sign in with your password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Password Setup Flow for Google SSO Users */}
          {!hasPassword && otpStep === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the button below to receive a verification code via email. You'll use this code to set your new password.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {!hasPassword && otpStep === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Verify Your Email
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We've sent a 6-digit code to your email
                </p>
              </div>

              <form onSubmit={handleSetPasswordWithOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    VERIFICATION CODE
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
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
                      canResendOTP ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300' : 'text-gray-400 cursor-not-allowed'
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
                      NEW PASSWORD
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
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CONFIRM NEW PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">Password Requirements:</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1">
                    <li className={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                      {newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
                    </li>
                    <li className={/[a-zA-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                      {/[a-zA-Z]/.test(newPassword) ? '✓' : '•'} Contains letters
                    </li>
                    <li className={/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                      {/[0-9]/.test(newPassword) ? '✓' : '•'} Contains numbers
                    </li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? 'Setting Password...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Regular Password Change Form */}
          {hasPassword && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CURRENT PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    NEW PASSWORD
                  </label>
                  {newPassword && (
                    <span className={`text-xs font-medium ${getPasswordStrength().color}`}>
                      {getPasswordStrength().text}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CONFIRM NEW PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white dark:text-gray-900 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Two-Factor Authentication Section - COMMENTED OUT */}
        {/* <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="mt-4 ml-11 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Authenticator app is currently active. Verification codes are sent via your preferred authenticator service.
            </p>
          </div>
        </div> */}

        {/* Logged in Devices Section - COMMENTED OUT */}
        {/* <div>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Logged in Devices</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and manage your active sessions.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Laptop className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    MacBook Pro 14"
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                      CURRENT
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">San Francisco, USA • Chrome 126.0.0</p>
                </div>
              </div>
              <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                LOG OUT
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">iPhone 15 Pro</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">London, UK • Safari Mobile</p>
                </div>
              </div>
              <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                LOG OUT
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Laptop className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">iPad Air 5</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Berlin, Germany • WishTrail App v2.4</p>
                </div>
              </div>
              <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">
                LOG OUT
              </button>
            </div>
          </div>

          <button className="mt-4 w-full px-4 py-2.5 border-2 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            LOG OUT FROM ALL OTHER DEVICES
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default SecuritySection;
