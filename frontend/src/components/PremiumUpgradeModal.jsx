import React, { useState } from 'react';
import { usePremiumStatus } from '../hooks/usePremium';
import { X, Crown, Check, Sparkles, Zap, Star } from 'lucide-react';

const PremiumUpgradeModal = ({ isOpen, onClose, feature, currentLimit, premiumLimit, context = '' }) => {
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isLoading, setIsLoading] = useState(false);
  const { isPremium, daysRemaining } = usePremiumStatus();

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$4.99',
      period: '/month',
      popular: false,
      savings: null
    },
    {
      id: 'annual',
      name: 'Annual',
      price: '$39.99',
      period: '/year',
      popular: true,
      savings: 'Save 33%'
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$99.99',
      period: 'one-time',
      popular: false,
      savings: 'Best Value'
    }
  ];

  const features = [
    { icon: <Star className="w-5 h-5" />, text: 'Create up to 10 active goals', highlight: feature === 'goals' },
    { icon: <Zap className="w-5 h-5" />, text: 'Track up to 10 habits with custom reminders', highlight: feature === 'habits' },
    { icon: <Sparkles className="w-5 h-5" />, text: 'Write up to 5 journal entries per day', highlight: feature === 'journal' },
    { icon: <Crown className="w-5 h-5" />, text: 'Export your journal anytime', highlight: feature === 'journal' },
    { icon: <Star className="w-5 h-5" />, text: 'Join up to 50 communities', highlight: feature === 'communities' },
    { icon: <Sparkles className="w-5 h-5" />, text: 'AI-powered insights and suggestions', highlight: feature === 'ai' },
    { icon: <Zap className="w-5 h-5" />, text: 'Advanced analytics and reports', highlight: feature === 'analytics' },
    { icon: <Crown className="w-5 h-5" />, text: 'Priority support', highlight: false },
    { icon: <Star className="w-5 h-5" />, text: 'Ad-free experience', highlight: false }
  ];

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual payment flow
      console.log('Upgrading to:', selectedPlan);
      // For now, just close modal
      setTimeout(() => {
        setIsLoading(false);
        alert('Payment integration coming soon!');
      }, 1000);
    } catch (error) {
      console.error('Upgrade error:', error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-10 h-10" />
              <h2 className="text-3xl font-bold">Upgrade to Premium</h2>
            </div>
            <p className="text-purple-100 text-lg">
              Unlock unlimited potential and reach your goals faster
            </p>
          </div>

          {/* Current Status */}
          {isPremium && (
            <div className="mx-8 mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-blue-800 font-medium">
                ✨ You're currently premium with {daysRemaining} days remaining. Extend your membership below.
              </p>
            </div>
          )}

          {/* Limit Reached Notice */}
          {context && (
            <div className="mx-8 mt-6 p-4 bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-200 rounded-xl">
              <p className="text-orange-900 font-medium">
                {context}
              </p>
              {currentLimit !== undefined && premiumLimit !== undefined && (
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Free Plan</p>
                    <p className="text-2xl font-bold text-gray-700">{currentLimit}</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <p className="text-xs text-purple-600 uppercase font-semibold">Premium Plan</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {premiumLimit === -1 ? '∞' : premiumLimit}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plans */}
          <div className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Choose Your Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                    selectedPlan === plan.id
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h4>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 text-sm">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {plan.savings}
                      </span>
                    )}
                  </div>
                  
                  {selectedPlan === plan.id && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-purple-500 pointer-events-none animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Features List */}
            <div className="bg-white rounded-2xl p-6 shadow-inner mb-6">
              <h4 className="font-bold text-gray-900 mb-4 text-center">Everything included:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      item.highlight ? 'bg-gradient-to-r from-purple-100 to-pink-100' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 ${item.highlight ? 'text-purple-600' : 'text-green-600'}`}>
                      {item.highlight ? <Crown className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    </div>
                    <span className={`text-sm ${item.highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl font-bold hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Upgrade to {plans.find(p => p.id === selectedPlan)?.name}
                  </>
                )}
              </button>
            </div>

            {/* Trust Signals */}
            <div className="mt-6 text-center space-y-1 text-sm text-gray-500">
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

export default PremiumUpgradeModal;
