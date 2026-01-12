/**
 * Premium UI Components
 * 
 * Reusable components for premium feature enforcement
 */

import React from 'react';
import { usePremiumStatus } from '../../hooks/usePremium';

/**
 * Premium Badge Component
 * Displays a premium badge for premium users
 */
export const PremiumBadge = ({ className = '' }) => {
  const { isPremium } = usePremiumStatus();
  
  if (!isPremium) return null;
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white ${className}`}
    >
      ✨ Premium
    </span>
  );
};

/**
 * Premium Expiry Warning Component
 * Shows warning when premium is about to expire
 */
export const PremiumExpiryWarning = ({ className = '' }) => {
  const { isPremium, isExpiringSoon, daysRemaining } = usePremiumStatus();
  
  if (!isPremium || !isExpiringSoon) return null;
  
  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Your premium membership expires in {daysRemaining} days. 
            <a href="/premium/upgrade" className="font-medium underline ml-1">
              Renew now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Feature Lock Component
 * Shows lock icon for premium-only features
 */
export const FeatureLock = ({ 
  children, 
  isLocked, 
  onUpgradeClick,
  message = "This feature requires premium",
  className = '' 
}) => {
  if (!isLocked) return children;
  
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <div className="text-center p-4">
          <div className="flex justify-center mb-2">
            <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-white text-sm font-medium mb-2">{message}</p>
          <button 
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-shadow"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

/**
 * Limit Indicator Component
 * Shows current usage vs limit
 */
export const LimitIndicator = ({ 
  current, 
  max, 
  label = "Usage",
  showPercentage = true,
  className = '' 
}) => {
  const isInfinite = max === '∞' || max === -1;
  const percentage = isInfinite ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = percentage >= 80 && !isInfinite;
  const isAtLimit = percentage >= 100 && !isInfinite;
  
  let barColor = 'bg-blue-500';
  let textColor = 'text-gray-700';
  
  if (isAtLimit) {
    barColor = 'bg-red-500';
    textColor = 'text-red-700';
  } else if (isNearLimit) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-700';
  }
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-medium ${textColor}`}>
          {current} / {isInfinite ? '∞' : max}
          {showPercentage && !isInfinite && ` (${Math.round(percentage)}%)`}
        </span>
      </div>
      {!isInfinite && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${barColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isAtLimit && (
        <p className="text-xs text-red-600 mt-1">Limit reached. Upgrade to premium for more.</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600 mt-1">Approaching limit.</p>
      )}
    </div>
  );
};

/**
 * Upgrade Prompt Component
 * Shows upgrade prompt when limit is reached
 */
export const UpgradePrompt = ({ 
  title = "Upgrade to Premium",
  message = "You've reached your limit. Upgrade to premium for unlimited access.",
  feature = "",
  currentLimit = 0,
  premiumLimit = 0,
  onUpgrade,
  onCancel,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-xl p-6 ${className}`}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        
        {feature && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Plan</p>
                <p className="text-lg font-semibold text-gray-900">{currentLimit === -1 ? '∞' : currentLimit}</p>
              </div>
              <div>
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Premium Plan</p>
                <p className="text-lg font-semibold text-yellow-600">{premiumLimit === -1 ? '∞' : premiumLimit}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Maybe Later
            </button>
          )}
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Premium Feature List Component
 * Shows comparison between free and premium features
 */
export const PremiumFeatureComparison = ({ className = '' }) => {
  const features = [
    { name: 'Active Goals', free: '5', premium: '10' },
    { name: 'Subgoals per Goal', free: '1', premium: '10' },
    { name: 'Active Habits', free: '5', premium: '10' },
    { name: 'Habit Reminders', free: '❌', premium: '✅' },
    { name: 'Journal Entries/Day', free: '1', premium: '5' },
    { name: 'Journal Export', free: '❌', premium: '✅' },
    { name: 'Communities Joined', free: '7', premium: '50' },
    { name: 'Communities Owned', free: '3', premium: '10' },
    { name: 'AI Suggestions', free: '❌', premium: '✅' },
    { name: 'Advanced Analytics', free: '❌', premium: '✅' }
  ];
  
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-yellow-400 to-orange-500">
        <h3 className="text-lg font-medium text-white">Feature Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Free
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Premium
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {features.map((feature, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {feature.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                  {feature.free}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-yellow-600 font-medium">
                  {feature.premium}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
