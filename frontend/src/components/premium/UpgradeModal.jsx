/**
 * Premium Upgrade Modal
 * 
 * Modal for upgrading to premium with pricing plans
 */

import React, { useState } from 'react';
import { usePremiumStatus } from '../../hooks/usePremium';
import { PremiumFeatureComparison } from './PremiumComponents';

export const UpgradeModal = ({ isOpen, onClose, preselectedPlan = 'annual' }) => {
  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  const [isLoading, setIsLoading] = useState(false);
  const { isPremium, daysRemaining } = usePremiumStatus();
  
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 4.99,
      period: 'month',
      savings: null,
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual',
      price: 39.99,
      period: 'year',
      savings: '33%',
      popular: true
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: 99.99,
      period: 'one-time',
      savings: 'Best Value',
      popular: false
    }
  ];
  
  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Call API to initiate payment
      const response = await fetch('/api/premium/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      
      const data = await response.json();
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to initiate upgrade. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold mb-2">Upgrade to Premium</h2>
                <p className="text-yellow-50">Unlock all features and reach your goals faster</p>
              </div>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Current status banner (if already premium) */}
          {isPremium && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <p className="text-sm text-blue-800">
                ✨ You're currently premium with {daysRemaining} days remaining. Upgrade to extend your membership.
              </p>
            </div>
          )}
          
          {/* Content */}
          <div className="px-6 py-8">
            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                      {plan.period !== 'one-time' && (
                        <span className="text-gray-500 text-sm">/{plan.period}</span>
                      )}
                    </div>
                    {plan.savings && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                        Save {plan.savings}
                      </span>
                    )}
                  </div>
                  
                  {selectedPlan === plan.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-yellow-500 pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Feature comparison */}
            <PremiumFeatureComparison className="mb-6" />
            
            {/* Benefits list */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
              <ul className="space-y-2">
                {[
                  'Create up to 10 active goals with 10 subgoals each',
                  'Track up to 10 habits with custom reminders',
                  'Write up to 5 journal entries per day',
                  'Export your journal anytime',
                  'Join up to 50 communities and own 10',
                  'AI-powered suggestions and insights',
                  'Advanced analytics and custom reports',
                  'Priority support',
                  'No ads'
                ].map((benefit, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : `Upgrade to ${plans.find(p => p.id === selectedPlan)?.name}`}
              </button>
            </div>
            
            {/* Trust signals */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>🔒 Secure payment processing</p>
              <p>💯 30-day money-back guarantee</p>
              <p>⚡ Instant activation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
